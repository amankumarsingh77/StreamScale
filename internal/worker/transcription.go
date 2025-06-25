package worker

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/url"
	"os"
	"os/exec"
	"path/filepath"
	"sort"
	"strings"
	"sync"
	"time"

	"github.com/amankumarsingh77/cloud-video-encoder/internal/models"
	"github.com/amankumarsingh77/cloud-video-encoder/internal/videofiles"
	"github.com/amankumarsingh77/cloud-video-encoder/pkg/logger"
)

const workerAIBaseURL = "https://speech-to-text.ak7702401082.workers.dev"
const r2BASE = "https://pub-3eab919f18b245d1ab0b438652d41a9f.r2.dev/"

type Transcription struct {
	awsRepo    videofiles.AWSRepository
	language   string
	logger     logger.Logger
	videoRepo  videofiles.Repository
	httpClient *http.Client
	wg         sync.WaitGroup
}

type TranscriptData struct {
	Language  string     `json:"language"`
	Duration  float64    `json:"duration"`
	VTT       string     `json:"vtt"`
	Text      string     `json:"text"`
	WordCount int        `json:"word_count"`
	Segments  []Segments `json:"segments"`
}

type Segments struct {
	Start float64 `json:"start"`
	End   float64 `json:"end"`
	Text  string  `json:"text"`
}

type IndexedTranscriptData struct {
	Index int
	Data  *TranscriptData
}

func NewTranscriptionService(awsRepo videofiles.AWSRepository, language string, logger logger.Logger, videoRepo videofiles.Repository) *Transcription {
	httpClient := &http.Client{
		Timeout: 30 * time.Second,
	}
	return &Transcription{
		awsRepo:    awsRepo,
		language:   language,
		logger:     logger,
		videoRepo:  videoRepo,
		httpClient: httpClient,
	}
}

func (t *Transcription) ProcessAudioForTranscription(ctx context.Context, videoPath, outputS3Key string) error {
	chunkDir := filepath.Join("transcription_audio_chunks")

	defer func() {
		if err := os.RemoveAll(chunkDir); err != nil {
			t.logger.Errorf("Failed to clean up audio chunk directory %s: %v", chunkDir, err)
		}
	}()

	if err := t.prepareAudioChunks(chunkDir, videoPath); err != nil {
		return fmt.Errorf("failed to prepare audio chunks: %w", err)
	}

	baseS3Path := strings.Trim(outputS3Key, "/")
	if baseS3Path == "" {
		return fmt.Errorf("invalid outputS3Key: key cannot be empty")
	}

	urls, err := t.uploadChunks(ctx, chunkDir, baseS3Path)
	if err != nil {
		return fmt.Errorf("failed to upload audio chunks: %w", err)
	}
	transcriptDatas, err := t.transcribe(urls)
	if err != nil {
		return fmt.Errorf("failed to transcribe audio : %v", err)
	}

	outputFileName := filepath.Join("full_transcript.txt")
	outputFile, err := os.Create(outputFileName)
	if err != nil {
		return fmt.Errorf("failed to create transcript file: %w", err)
	}
	defer outputFile.Close()
	for _, data := range transcriptDatas {
		_, writeErr := outputFile.WriteString(data.Text + "\n")
		if writeErr != nil {
			return fmt.Errorf("failed to write to transcript file: %w", writeErr)
		}
	}

	return nil
}

func (t *Transcription) uploadChunks(ctx context.Context, chunkDir, baseS3Path string) ([]string, error) {
	files, err := os.ReadDir(chunkDir)
	if err != nil {
		return nil, fmt.Errorf("failed to read audio chunks directory %s: %w", chunkDir, err)
	}

	var (
		wg                sync.WaitGroup
		mu                sync.Mutex
		urls              []string
		errChan           = make(chan error, 1)
		uploadCtx, cancel = context.WithCancel(ctx)
	)
	defer cancel()

	for _, file := range files {
		if file.IsDir() {
			continue
		}

		wg.Add(1)
		currentFile := file.Name()

		go func(fileName string) {
			defer wg.Done()

			select {
			case <-uploadCtx.Done():
				return
			default:
			}

			audioFilePath := filepath.Join(chunkDir, fileName)
			data, err := os.Open(audioFilePath)
			if err != nil {
				select {
				case errChan <- fmt.Errorf("failed to open file %s: %w", audioFilePath, err):
				default:
				}
				cancel()
				return
			}
			defer data.Close()

			fileInfo, err := data.Stat()
			if err != nil {
				select {
				case errChan <- fmt.Errorf("failed to stat file %s: %w", audioFilePath, err):
				default:
				}
				cancel()
				return
			}

			objectKey := fmt.Sprintf("%s/audio_transcriptions/%s", baseS3Path, fileName)
			input := models.UploadInput{
				File:       data,
				Name:       fileName,
				Key:        objectKey,
				MimeType:   "audio/aac",
				Size:       fileInfo.Size(),
				BucketName: "streamscale",
			}

			if _, err := t.awsRepo.PutObject(uploadCtx, input); err != nil {
				select {
				case errChan <- fmt.Errorf("failed to upload %s: %w", objectKey, err):
				default:
				}
				cancel()
				return
			}

			r2url := fmt.Sprintf("%s%s", r2BASE, objectKey)
			mu.Lock()
			urls = append(urls, r2url)
			mu.Unlock()

			t.logger.Infof("Uploaded chunk: %s", objectKey)
		}(currentFile)
	}

	done := make(chan struct{})
	go func() {
		wg.Wait()
		close(done)
	}()

	select {
	case <-done:
		sort.Strings(urls)
		return urls, nil
	case err := <-errChan:
		return nil, err
	}
}

func (t *Transcription) prepareAudioChunks(chunkDir string, videoPath string) error {
	if err := os.MkdirAll(chunkDir, os.ModePerm); err != nil {
		return fmt.Errorf("failed to create audio chunk directory %s: %w", chunkDir, err)
	}
	dir, _ := os.Getwd()
	outputPattern := filepath.Join(dir, chunkDir, "chunk_%03d.aac")

	args := []string{
		"-i", videoPath,
		"-map", "0:a",
		"-vn",
		"-f", "segment",
		"-segment_time", "30",
		"-c:a", "aac",
		outputPattern,
	}

	cmd := exec.Command("ffmpeg", args...)

	var stderr bytes.Buffer
	cmd.Stderr = &stderr

	t.logger.Infof("Executing FFmpeg command: %s %s", cmd.Path, strings.Join(cmd.Args, " "))

	if err := cmd.Run(); err != nil {
		t.logger.Errorf("FFmpeg failed: %s", stderr.String())
		return fmt.Errorf("failed to process audio with FFmpeg: %w (stderr: %s)", err, stderr.String())
	}

	t.logger.Infof("Successfully prepared audio chunks in %s", chunkDir)
	return nil
}

func (t *Transcription) transcribe(audioUrls []string) ([]*TranscriptData, error) {
	var wg sync.WaitGroup
	errChan := make(chan error, 1)

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	indexedDataChan := make(chan IndexedTranscriptData, len(audioUrls))

	for i, audioUrl := range audioUrls {
		wg.Add(1)
		currentAudioUrl := audioUrl
		currentIndex := i

		go func() {
			defer wg.Done()

			select {
			case <-ctx.Done():
				t.logger.Debugf("Skipping transcription for %s due to cancelled context.", currentAudioUrl)
				return
			default:
			}

			escapedURL := url.PathEscape(currentAudioUrl)
			reqUrl := fmt.Sprintf("%s?url=%s", workerAIBaseURL, escapedURL)
			log.Println(reqUrl)
			req, err := http.NewRequestWithContext(ctx, "GET", reqUrl, nil)
			if err != nil {
				select {
				case errChan <- fmt.Errorf("failed to create request for %s: %w", currentAudioUrl, err):
					cancel()
				default:
					cancel()
				}
				return
			}

			resp, err := t.httpClient.Do(req)
			if err != nil {
				select {
				case errChan <- fmt.Errorf("failed to send request for %s: %w", currentAudioUrl, err):
					cancel()
				default:
					cancel()
				}
				return
			}
			defer resp.Body.Close()

			body, err := io.ReadAll(resp.Body)
			if err != nil {
				select {
				case errChan <- fmt.Errorf("failed to read response for %s: %w", currentAudioUrl, err):
					cancel()
				default:
					cancel()
				}
				return
			}

			var result *TranscriptData
			if err = json.Unmarshal(body, &result); err != nil {
				select {
				case errChan <- fmt.Errorf("failed to unmarshal data for %s: %w", currentAudioUrl, err):
					cancel()
				default:
					cancel()
				}
				return
			}

			select {
			case indexedDataChan <- IndexedTranscriptData{Index: currentIndex, Data: result}:
			case <-ctx.Done():
				t.logger.Debugf("Dropped transcription result for %s as context was cancelled.", currentAudioUrl)
			}
		}()
	}

	go func() {
		wg.Wait()
		close(indexedDataChan)
		close(errChan)
	}()

	var orderedResults []IndexedTranscriptData
	for {
		select {
		case err, ok := <-errChan:
			if ok && err != nil {
				cancel()
				return nil, err
			}
			if !ok {
				errChan = nil
			}
		case data, ok := <-indexedDataChan:
			if ok {
				orderedResults = append(orderedResults, data)
			}
			if !ok {
				indexedDataChan = nil
			}
		case <-ctx.Done():
			select {
			case finalErr, ok := <-errChan:
				if ok && finalErr != nil {
					return nil, finalErr
				}
			default:
			}
			return nil, fmt.Errorf("transcription operation cancelled")
		}

		if indexedDataChan == nil && errChan == nil {
			break
		}
	}

	sort.Slice(orderedResults, func(i, j int) bool {
		return orderedResults[i].Index < orderedResults[j].Index
	})

	finalTranscriptDatas := make([]*TranscriptData, len(orderedResults))
	for i, indexedData := range orderedResults {
		finalTranscriptDatas[i] = indexedData.Data
	}

	return finalTranscriptDatas, nil
}
