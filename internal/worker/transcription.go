package worker

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"os/exec"
	"path/filepath"
	"sort"
	"sync"
	"time"

	"github.com/amankumarsingh77/cloud-video-encoder/internal/config"
	"github.com/amankumarsingh77/cloud-video-encoder/internal/models"
	"github.com/amankumarsingh77/cloud-video-encoder/internal/videofiles"
	"github.com/amankumarsingh77/cloud-video-encoder/pkg/logger"
)

type TranscriptionService struct {
	awsRepo    videofiles.AWSRepository
	language   string
	videoRepo  videofiles.Repository
	logger     logger.Logger
	httpClient *http.Client
	s3Config   *config.S3Config // Fixed typo in field name
}

type TranscriptData struct {
	Index     int           `json:"index"`
	Language  string        `json:"language"`
	Duration  time.Duration `json:"duration"`
	VTT       string        `json:"vtt"`
	Text      string        `json:"text"`
	WordCount int           `json:"word_count"`
	Segments  []Segment     `json:"segments"` // Fixed pluralization
}

type Segment struct { // Fixed singular struct name
	Start float64 `json:"start"`
	End   float64 `json:"end"`
	Text  string  `json:"text"`
}

var (
	backendURLs = []string{
		"https://speech-to-text3.ak7702401082.workers.dev/",
		"https://speech-to-text2.ak7702401082.workers.dev/",
		"https://speech-to-text1.ak7702401082.workers.dev/",
		"https://speech-to-text.ak7702401082.workers.dev/",
	}
	backendIndex int
	backendMu    sync.Mutex
)

func getNextBackendURL() string {
	backendMu.Lock()
	defer backendMu.Unlock()
	requrl := backendURLs[backendIndex%len(backendURLs)]
	backendIndex++
	return requrl
}

func NewTranscriptionService(
	awsRepo videofiles.AWSRepository,
	language string,
	logger logger.Logger,
	videoRepo videofiles.Repository,
	s3Config *config.S3Config,
	transcriptionURLs []string,
) *TranscriptionService {
	httpClient := &http.Client{
		Timeout: 30 * time.Minute,
	}

	return &TranscriptionService{
		awsRepo:    awsRepo,
		language:   language,
		logger:     logger,
		videoRepo:  videoRepo,
		httpClient: httpClient,
		s3Config:   s3Config, // Fixed assignment
	}
}

func (t *TranscriptionService) ProcessAudioForTranscription(ctx context.Context, videoPath string, outputS3BaseKey string) error {
	// Use system temp directory instead of S3 key path
	chunkDir, err := os.MkdirTemp("", "transcription_audio_chunks-*")
	if err != nil {
		return fmt.Errorf("failed to create temp dir: %w", err)
	}
	defer os.RemoveAll(chunkDir)

	if err := t.prepareAudioChunks(chunkDir, videoPath); err != nil {
		return fmt.Errorf("failed to prepare audio chunks: %w", err)
	}

	urls, err := t.uploadChunks(ctx, chunkDir, outputS3BaseKey)
	if err != nil {
		return fmt.Errorf("failed to upload audio chunks: %w", err)
	}

	transcriptDatas, err := t.transcribe(urls)
	if err != nil {
		return fmt.Errorf("failed to transcribe audio: %w", err)
	}

	if err := t.saveTranscriptions(ctx, transcriptDatas, outputS3BaseKey); err != nil {
		return fmt.Errorf("failed to save transcriptions: %w", err)
	}
	return nil
}

func (t *TranscriptionService) prepareAudioChunks(chunkDir, videoPath string) error {
	if err := os.MkdirAll(chunkDir, os.ModePerm); err != nil {
		return fmt.Errorf("failed to create audio chunks dir: %w", err)
	}

	outPath := filepath.Join(chunkDir, "chunk_%03d.aac")
	args := []string{
		"-i", videoPath,
		"-map", "0:a",
		"-vn",
		"-f", "segment",
		"-segment_time", "30",
		"-c:a", "copy",
		outPath,
	}

	cmd := exec.Command("ffmpeg", args...)
	var stderr bytes.Buffer
	cmd.Stderr = &stderr

	if err := cmd.Run(); err != nil {
		return fmt.Errorf("failed to process audio with FFmpeg: %w (stderr: %s)", err, stderr.String())
	}

	t.logger.Infof("Successfully prepared audio chunks in %s", chunkDir)
	return nil
}

func (t *TranscriptionService) uploadChunks(ctx context.Context, chunkDir, baseS3Path string) ([]string, error) {
	const (
		maxUploadConcurrency = 50
		uploadBatchDelay     = 50 * time.Millisecond
		retryMaxAttempts     = 3
		retryInitialDelay    = 500 * time.Millisecond
	)

	files, err := os.ReadDir(chunkDir)
	if err != nil {
		return nil, fmt.Errorf("failed to read audio chunk directory %s: %w", chunkDir, err)
	}

	sem := make(chan struct{}, maxUploadConcurrency)
	var wg sync.WaitGroup
	var mu sync.Mutex
	urls := make([]string, 0, len(files))
	errChan := make(chan error, len(files))

	ctx, cancel := context.WithCancel(ctx)
	defer cancel()

	for i, file := range files {
		if file.IsDir() {
			continue
		}

		if i%maxUploadConcurrency == 0 && i != 0 {
			time.Sleep(uploadBatchDelay)
		}

		wg.Add(1)
		sem <- struct{}{}

		go func(fileName string) {
			defer func() {
				<-sem
				wg.Done()
			}()

			var currentErr error
			var r2Url string

			for attempt := 0; attempt < retryMaxAttempts; attempt++ {
				select {
				case <-ctx.Done():
					t.logger.Warnf("cancelling upload for %s due to context cancellation", fileName)
					return
				default:
				}

				audioChunkPath := filepath.Join(chunkDir, fileName)
				data, err := os.Open(audioChunkPath)
				if err != nil {
					currentErr = fmt.Errorf("failed to open file %s: %w", audioChunkPath, err)
					break
				}

				fileInfo, err := data.Stat()
				if err != nil {
					data.Close()
					currentErr = fmt.Errorf("failed to get file stats %s: %w", audioChunkPath, err)
					break
				}

				objectKey := fmt.Sprintf("%s/transcription_chunks/%s", baseS3Path, fileName)
				input := models.UploadInput{
					File:       data,
					Name:       fileName,
					Key:        objectKey,
					MimeType:   "audio/aac",
					Size:       fileInfo.Size(),
					BucketName: t.s3Config.OutputBucket,
				}

				_, err = t.awsRepo.PutObject(ctx, input)
				data.Close()
				if err != nil {
					currentErr = fmt.Errorf("failed to upload audio chunk %s (attempt %d/%d): %w", fileName, attempt+1, retryMaxAttempts, err)
					t.logger.Warnf(currentErr.Error())
					if attempt < retryMaxAttempts-1 {
						delay := retryInitialDelay * time.Duration(1<<attempt)
						time.Sleep(delay)
						continue
					} else {
						break
					}
				} else {
					r2Url = fmt.Sprintf("%s/%s", t.s3Config.CDNEndpoint, objectKey)
					t.logger.Infof("Successfully uploaded audio chunk %s: %s", fileName, r2Url)
					currentErr = nil
					break
				}
			}

			if currentErr != nil {
				errChan <- currentErr
			} else {
				mu.Lock()
				urls = append(urls, r2Url)
				mu.Unlock()
			}
		}(file.Name())
	}

	go func() {
		wg.Wait()
		close(errChan)
	}()

	for uploadErr := range errChan {
		if uploadErr != nil {
			cancel()
			go func() {
				for range errChan {
				}
			}()
			return nil, uploadErr
		}
	}

	sort.Strings(urls)
	return urls, nil
}

func (t *TranscriptionService) transcribe(audioUrls []string) ([]*TranscriptData, error) {
	const (
		maxConcurrency    = 10
		batchDelay        = 500 * time.Millisecond
		retryMaxAttempts  = 3
		retryInitialDelay = 1 * time.Second
	)

	sem := make(chan struct{}, maxConcurrency)
	var wg sync.WaitGroup
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	type result struct {
		data *TranscriptData
		err  error
	}

	resultChan := make(chan result, len(audioUrls))

	for i, audioUrl := range audioUrls {
		if i%maxConcurrency == 0 {
			time.Sleep(batchDelay)
		}

		wg.Add(1)
		sem <- struct{}{}

		go func(index int, audiourl string) {
			defer func() {
				<-sem
				wg.Done()
			}()

			var (
				data     TranscriptData
				finalErr error
			)

			for attempt := 0; attempt < retryMaxAttempts; attempt++ {
				select {
				case <-ctx.Done():
					resultChan <- result{err: fmt.Errorf("transcription cancelled for %s: %w", audiourl, ctx.Err())}
					return
				default:
				}

				selectedBackend := getNextBackendURL()
				reqUrl := fmt.Sprintf("%s?url=%s", selectedBackend, url.QueryEscape(audiourl))

				req, err := http.NewRequestWithContext(ctx, http.MethodGet, reqUrl, nil)
				if err != nil {
					resultChan <- result{err: fmt.Errorf("failed to create request for %s: %w", audiourl, err)}
					return
				}

				resp, err := t.httpClient.Do(req)
				if err != nil {
					finalErr = fmt.Errorf("failed to send request for %s (attempt %d/%d): %w", reqUrl, attempt+1, retryMaxAttempts, err)
					t.logger.Warnf(finalErr.Error())

					if attempt < retryMaxAttempts-1 {
						delay := retryInitialDelay * time.Duration(1<<attempt)
						time.Sleep(delay)
						continue // Retry
					}
					break
				}

				if resp.StatusCode != http.StatusOK {
					body, _ := io.ReadAll(resp.Body)
					resp.Body.Close()

					finalErr = fmt.Errorf("transcription failed for %s (attempt %d/%d): status %d, body: %s",
						reqUrl, attempt+1, retryMaxAttempts, resp.StatusCode, string(body))
					t.logger.Warnf(finalErr.Error())

					if (resp.StatusCode == http.StatusServiceUnavailable ||
						resp.StatusCode == http.StatusTooManyRequests) &&
						attempt < retryMaxAttempts-1 {

						delay := retryInitialDelay * time.Duration(1<<attempt)
						time.Sleep(delay)
						continue // Retry
					}
					// Either non-retryable status code or all attempts exhausted
					break
				}

				// Success case
				if err := json.NewDecoder(resp.Body).Decode(&data); err != nil {
					resp.Body.Close()
					// JSON decode error is typically not retryable
					resultChan <- result{err: fmt.Errorf("failed to decode response for %s: %w", audiourl, err)}
					return
				}
				resp.Body.Close()

				// Success! Set index and send result
				data.Index = index
				resultChan <- result{data: &data}
				return
			}

			// If we reach here, all retry attempts failed
			resultChan <- result{err: finalErr}
		}(i, audioUrl)
	}

	go func() {
		wg.Wait()
		close(resultChan)
	}()

	results := make([]*TranscriptData, 0, len(audioUrls))
	var finalErr error
	for res := range resultChan {
		if res.err != nil {
			t.logger.Errorf("Transcription failed: %v", res.err)
			if finalErr == nil {
				finalErr = res.err // Save the first error
			}
			continue
		}
		results = append(results, res.data)
	}

	if finalErr != nil {
		return nil, finalErr
	}

	sort.Slice(results, func(i, j int) bool {
		return results[i].Index < results[j].Index
	})

	return results, nil
}

func (t *TranscriptionService) saveTranscriptions(ctx context.Context, transcriptDatas []*TranscriptData, outputS3BaseKey string) error {

	tempFile, err := os.CreateTemp("", "transcript-*.vtt")
	if err != nil {
		return fmt.Errorf("failed to create temp file: %w", err)
	}
	defer os.Remove(tempFile.Name())
	defer tempFile.Close()

	if err := convertToSubtitleFile(transcriptDatas, tempFile); err != nil {
		return fmt.Errorf("failed to convert to subtitle file: %w", err)
	}

	// Reset file pointer for reading
	if _, err := tempFile.Seek(0, 0); err != nil {
		return fmt.Errorf("failed to seek temp file: %w", err)
	}

	fileInfo, err := tempFile.Stat()
	if err != nil {
		return fmt.Errorf("failed to get file info: %w", err)
	}

	uploadKey := filepath.Join(outputS3BaseKey, "transcript", t.language+".vtt")
	input := models.UploadInput{
		File:       tempFile,
		Name:       t.language + ".vtt",
		Key:        uploadKey,
		MimeType:   "text/vtt",
		Size:       fileInfo.Size(),
		BucketName: t.s3Config.OutputBucket,
	}

	if _, err := t.awsRepo.PutObject(ctx, input); err != nil {
		return fmt.Errorf("failed to upload subtitle file: %w", err)
	}

	t.logger.Infof("Successfully uploaded subtitle file: %s", uploadKey)
	return nil
}

func convertToSubtitleFile(transcriptDatas []*TranscriptData, w io.Writer) error {
	if _, err := fmt.Fprint(w, "WEBVTT\n\n"); err != nil {
		return fmt.Errorf("failed to write VTT header: %w", err)
	}

	counter := 1
	for _, transcription := range transcriptDatas {
		chunkOffset := float64(transcription.Index) * 30.0 // 30-second chunks
		for _, segment := range transcription.Segments {
			start := segment.Start + chunkOffset
			end := segment.End + chunkOffset

			_, err := fmt.Fprintf(w, "%d\n%s --> %s\n%s\n\n",
				counter,
				formatTimestamp(start),
				formatTimestamp(end),
				segment.Text,
			)
			if err != nil {
				return fmt.Errorf("failed to write segment: %w", err)
			}
			counter++
		}
	}
	return nil
}

func formatTimestamp(seconds float64) string {
	hours := int(seconds / 3600)
	minutes := int(seconds/60) % 60
	secs := int(seconds) % 60
	millis := int((seconds - float64(int(seconds))) * 1000)
	return fmt.Sprintf("%02d:%02d:%02d.%03d", hours, minutes, secs, millis)
}
