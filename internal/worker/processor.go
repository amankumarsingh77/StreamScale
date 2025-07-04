package worker

import (
	"bufio"
	"bytes"
	"context"
	"fmt"
	"io"
	"log"
	"math"
	"mime"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/amankumarsingh77/cloud-video-encoder/internal/config"
	"github.com/amankumarsingh77/cloud-video-encoder/internal/models"
	"github.com/amankumarsingh77/cloud-video-encoder/internal/videofiles"
	"github.com/amankumarsingh77/cloud-video-encoder/pkg/logger"
	"github.com/google/uuid"
)



type videoProcessor struct {
	cfg       *config.Config
	awsRepo   videofiles.AWSRepository
	videoRepo videofiles.Repository
	logger    logger.Logger
	tempDir   string
	job       *models.EncodeJob
}

func NewVideoProcessor(cfg *config.Config, awsRepo videofiles.AWSRepository, videoRepo videofiles.Repository, logger logger.Logger, job *models.EncodeJob) VideoProcessor {
	return &videoProcessor{
		cfg:       cfg,
		awsRepo:   awsRepo,
		videoRepo: videoRepo,
		logger:    logger,
		tempDir:   TempDir,
		job:       job,
	}
}

type ProcessingResult struct {
	Duration      float64
	Width         int
	Height        int
	Qualities     []models.InputQualityInfo
	SubtitleFiles []string
	ThumbnailPath string
}

type QualityPreset struct {
	Name       models.VideoQuality
	Resolution [2]int
	Bitrate    int
}

var qualityPresets = []QualityPreset{
	{Name: models.Quality1080P, Resolution: [2]int{1920, 1080}, Bitrate: 5000},
	{Name: models.Quality720P, Resolution: [2]int{1280, 720}, Bitrate: 3000},
	{Name: models.Quality480P, Resolution: [2]int{854, 480}, Bitrate: 1200},
	{Name: models.Quality360P, Resolution: [2]int{640, 360}, Bitrate: 800},
}

func (p *videoProcessor) ProcessVideo(ctx context.Context, job *models.EncodeJob, videoID uuid.UUID) (*ProcessingResult, error) {
	if job.InputS3Key == "" || job.OutputS3Key == "" {
		return nil, fmt.Errorf("input key and output key cannot be empty")
	}

	defer p.cleanup()

	if err := os.MkdirAll(p.tempDir, os.ModePerm); err != nil {
		return nil, fmt.Errorf("failed to create temp directory: %w", err)
	}

	localPath, err := p.downloadVideo(ctx, job.InputS3Key)
	if err != nil {
		return nil, fmt.Errorf("download failed: %w", err)
	}

	if err := p.videoRepo.UpdateVideoProgress(ctx, videoID, models.JobStatusProcessing, 10); err != nil {
		p.logger.Errorf("Failed to update progress after download: %v", err)
	}

	videoInfo, err := GetVideoInfo(localPath)
	if err != nil {
		return nil, fmt.Errorf("video info extraction failed: %w", err)
	}

	if err := p.videoRepo.UpdateVideoProgress(ctx, videoID, models.JobStatusProcessing, 20); err != nil {
		p.logger.Errorf("Failed to update progress after info extraction: %v", err)
	}

	subtitleFiles, err := p.extractSubtitles(localPath)
	if err != nil {
		p.logger.Warnf("Subtitle extraction failed: %v", err)
		subtitleFiles = []string{}
	}
	p.logger.Debugf("Subtitles found %v", subtitleFiles)

	if err := p.videoRepo.UpdateVideoProgress(ctx, videoID, models.JobStatusProcessing, 22); err != nil {
		p.logger.Errorf("Failed to update progress after subtitle extraction: %v", err)
	}

	thumbnailPath, err := p.generateThumbnail(localPath, videoInfo.Duration)
	if err != nil {
		p.logger.Warnf("Thumbnail generation failed: %v", err)
		thumbnailPath = ""
	}

	if err := p.videoRepo.UpdateVideoProgress(ctx, videoID, models.JobStatusProcessing, 25); err != nil {
		p.logger.Errorf("Failed to update progress after thumbnail generation: %v", err)
	}

	segments, err := p.splitVideo(localPath, videoInfo)
	if err != nil {
		return nil, fmt.Errorf("split failed: %w", err)
	}

	if err := p.videoRepo.UpdateVideoProgress(ctx, videoID, models.JobStatusProcessing, 30); err != nil {
		p.logger.Errorf("Failed to update progress after splitting: %v", err)
	}

	applicablePresets := p.determineApplicablePresets(videoInfo)

	qualitySegments := make(map[models.VideoQuality][]string)
	qualityInfos := make([]models.InputQualityInfo, 0, len(applicablePresets))

	type qualityResult struct {
		preset   QualityPreset
		segments []string
		err      error
	}

	resultChan := make(chan qualityResult, len(applicablePresets))
	var wg sync.WaitGroup

	p.logger.Infof("Starting parallel encoding for %d quality levels with maximum CPU utilization", len(applicablePresets))

	for _, preset := range applicablePresets {
		wg.Add(1)
		go func(preset QualityPreset) {
			defer wg.Done()
			defer func() {
				if r := recover(); r != nil {
					p.logger.Errorf("Panic in quality encoding for %s: %v", preset.Name, r)
					resultChan <- qualityResult{
						preset:   preset,
						segments: nil,
						err:      fmt.Errorf("encoding panic for quality %s: %v", preset.Name, r),
					}
				}
			}()

			p.logger.Infof("Starting encoding for quality: %s", preset.Name)
			encodedSegments, err := p.encodeSegmentsWithQuality(segments, preset, videoInfo)
			resultChan <- qualityResult{
				preset:   preset,
				segments: encodedSegments,
				err:      err,
			}
		}(preset)
	}

	go func() {
		wg.Wait()
		close(resultChan)
	}()

	completedQualities := 0
	for result := range resultChan {
		if result.err != nil {
			return nil, fmt.Errorf("encoding failed for quality %s: %w", result.preset.Name, result.err)
		}

		qualitySegments[result.preset.Name] = result.segments

		qualityInfos = append(qualityInfos, models.InputQualityInfo{
			Resolution: fmt.Sprintf("%dx%d", result.preset.Resolution[0], result.preset.Resolution[1]),
			Bitrate:    result.preset.Bitrate,
			MaxBitrate: int(float64(result.preset.Bitrate) * 1.2),
			MinBitrate: int(float64(result.preset.Bitrate) * 0.8),
		})

		completedQualities++
		progressIncrement := 50.0 / float64(len(applicablePresets))
		currentProgress := 30.0 + float64(completedQualities)*progressIncrement

		if err := p.videoRepo.UpdateVideoProgress(ctx, videoID, models.JobStatusProcessing, float64(int(currentProgress))); err != nil {
			p.logger.Errorf("Failed to update progress for quality %s: %v", result.preset.Name, err)
		}

		p.logger.Infof("Completed aggressive encoding for quality: %s", result.preset.Name)
	}

	outputPath := filepath.Join(p.tempDir, "output")
	if err := os.MkdirAll(outputPath, os.ModePerm); err != nil {
		return nil, fmt.Errorf("failed to create output directory: %w", err)
	}

	if err := p.stitchAndPackageMultiQuality(qualitySegments, outputPath); err != nil {
		return nil, fmt.Errorf("finalization failed: %w", err)
	}

	if _, err := os.Stat(outputPath); os.IsNotExist(err) {
		return nil, fmt.Errorf("output directory does not exist after processing")
	}

	outputKey := strings.TrimPrefix(job.OutputS3Key, "/")
	outputKey = strings.TrimSuffix(outputKey, "/")

	if err := p.uploadProcessedFiles(ctx, outputPath, outputKey); err != nil {
		return nil, fmt.Errorf("upload failed: %w", err)
	}

	if err := p.uploadSubtitleAndThumbnailFiles(ctx, subtitleFiles, thumbnailPath, outputKey); err != nil {
		p.logger.Warnf("Failed to upload subtitle/thumbnail files: %v", err)
	}

	if err := p.videoRepo.UpdateVideoProgress(ctx, videoID, models.JobStatusProcessing, 90); err != nil {
		p.logger.Errorf("Failed to update progress after upload: %v", err)
	}

	result := &ProcessingResult{
		Duration:      videoInfo.Duration,
		Width:         videoInfo.Width,
		Height:        videoInfo.Height,
		Qualities:     qualityInfos,
		SubtitleFiles: subtitleFiles,
		ThumbnailPath: thumbnailPath,
	}

	return result, nil
}

func (p *videoProcessor) determineApplicablePresets(videoInfo *VideoInfo) []QualityPreset {
	var applicablePresets []QualityPreset

	sourceWidth := videoInfo.Width
	sourceHeight := videoInfo.Height

	for _, preset := range qualityPresets {
		if preset.Resolution[0] <= sourceWidth && preset.Resolution[1] <= sourceHeight {
			applicablePresets = append(applicablePresets, preset)
		}
	}

	if len(applicablePresets) == 0 {
		applicablePresets = append(applicablePresets, qualityPresets[len(qualityPresets)-1])
	}

	return applicablePresets
}

func (p *videoProcessor) encodeSegmentsWithQuality(segments []string, preset QualityPreset, _ *VideoInfo) ([]string, error) {
	type encodeResult struct {
		index int
		path  string
		err   error
	}

	maxEncoders := GetMaxConcurrentEncoders()
	resultChan := make(chan encodeResult, len(segments))
	sem := make(chan struct{}, maxEncoders)
	var wg sync.WaitGroup

	qualityDir := filepath.Join(p.tempDir, "encoded_segments", string(preset.Name))
	if err := os.MkdirAll(qualityDir, 0755); err != nil {
		return nil, fmt.Errorf("failed to create output directory for quality %s: %w", preset.Name, err)
	}

	p.logger.Infof("Starting aggressive encoding with %d concurrent encoders for %d segments", maxEncoders, len(segments))

	for i, segment := range segments {
		wg.Add(1)
		go func(idx int, inputPath string) {
			defer wg.Done()
			sem <- struct{}{}
			defer func() { <-sem }()

			outputPath := filepath.Join(qualityDir, fmt.Sprintf("encoded_%03d.mp4", idx))
			err := p.encodeSingleSegmentWithQualityOptimized(inputPath, outputPath, preset)

			resultChan <- encodeResult{
				index: idx,
				path:  outputPath,
				err:   err,
			}
		}(i, segment)
	}

	go func() {
		wg.Wait()
		close(resultChan)
	}()

	encodedSegments := make([]string, len(segments))
	for result := range resultChan {
		if result.err != nil {
			return nil, fmt.Errorf("segment %d encoding failed: %w", result.index, result.err)
		}
		encodedSegments[result.index] = result.path
	}

	return encodedSegments, nil
}

func (p *videoProcessor) encodeSingleSegmentWithQuality(inputPath, outputPath string, preset QualityPreset) error {
	switch p.job.Codec {
	case models.CodecH264:
		return p.encodeSingleSegmentWithH264(inputPath, outputPath, preset)
	case models.CodecAV1:
		return p.encodeSingleSegmentWithSVTAV1(inputPath, outputPath, preset)
	default:
		return fmt.Errorf("unsupported codec: %s", p.job.Codec)
	}
}

func (p *videoProcessor) encodeSingleSegmentWithQualityOptimized(inputPath, outputPath string, preset QualityPreset) error {
	switch p.job.Codec {
	case models.CodecH264:
		return p.encodeSingleSegmentWithH264Optimized(inputPath, outputPath, preset)
	case models.CodecAV1:
		return p.encodeSingleSegmentWithSVTAV1Optimized(inputPath, outputPath, preset)
	default:
		return fmt.Errorf("unsupported codec: %s", p.job.Codec)
	}
}

func (p *videoProcessor) encodeSingleSegmentWithH264(inputPath, outputPath string, preset QualityPreset) error {
	hwAccel := p.detectHardwareAcceleration()
	encodingPreset := p.determineEncodingPreset(hwAccel)

	args := []string{
		"-y",
		"-hide_banner",
		"-loglevel", "error",
		"-i", inputPath,
	}

	var encoder string
	var hwAccelArgs []string

	switch hwAccel {
	case HWAccelNVENC:
		encoder = "h264_nvenc"
		hwAccelArgs = []string{
			"-hwaccel", "cuda",
			"-hwaccel_output_format", "cuda",
		}
	case HWAccelQSV:
		encoder = "h264_qsv"
		hwAccelArgs = []string{
			"-hwaccel", "qsv",
			"-hwaccel_output_format", "qsv",
		}
	case HWAccelAMF:
		encoder = "h264_amf"
		hwAccelArgs = []string{
			"-hwaccel", "d3d11va",
			"-hwaccel_output_format", "d3d11",
		}
	case HWAccelVAAPI:
		encoder = "h264_vaapi"
		hwAccelArgs = []string{
			"-hwaccel", "vaapi",
			"-hwaccel_output_format", "vaapi",
			"-hwaccel_device", "/dev/dri/renderD128",
		}
	default:
		encoder = "libx264"
	}

	args = append(args, hwAccelArgs...)

	videoFilter := fmt.Sprintf("scale=%d:%d", preset.Resolution[0], preset.Resolution[1])
	if hwAccel == HWAccelVAAPI {
		videoFilter = fmt.Sprintf("scale_vaapi=%d:%d", preset.Resolution[0], preset.Resolution[1])
	} else if hwAccel == HWAccelNVENC {
		videoFilter = fmt.Sprintf("scale_cuda=%d:%d", preset.Resolution[0], preset.Resolution[1])
	}

	encodingArgs := []string{
		"-c:v", encoder,
		"-preset", encodingPreset,
		"-vf", videoFilter,
		"-b:v", fmt.Sprintf("%dk", preset.Bitrate),
		"-maxrate", fmt.Sprintf("%dk", int(float64(preset.Bitrate)*1.2)),
		"-bufsize", fmt.Sprintf("%dk", preset.Bitrate*2),
		"-g", "60",
		"-keyint_min", "60",
		"-sc_threshold", "0",
		"-avoid_negative_ts", "make_zero",
		"-fflags", "+genpts",
		"-async", "1",
		"-vsync", "cfr",
		"-af", "aresample=async=1",
		"-movflags", "+faststart",
		"-c:a", "aac",
		"-b:a", "128k",
		"-ar", "48000",
		"-ac", "2",
	}

	if hwAccel == HWAccelNone {
		encodingArgs = append(encodingArgs,
			"-profile:v", "high",
			"-level", "4.1",
			"-threads", "0",
			"-x264-params", "ref=3:bframes=3:b-adapt=1:direct=auto:me=umh:subme=7:trellis=1:rc-lookahead=50",
		)
	} else if hwAccel == HWAccelNVENC {
		encodingArgs = append(encodingArgs,
			"-profile:v", "high",
			"-level", "4.1",
			"-rc", "vbr",
			"-rc-lookahead", "32",
			"-surfaces", "32",
			"-bf", "3",
			"-b_ref_mode", "middle",
		)
	}

	args = append(args, encodingArgs...)
	args = append(args, outputPath)

	cmd := exec.Command("ffmpeg", args...)
	var stderr bytes.Buffer
	cmd.Stderr = &stderr

	if err := cmd.Run(); err != nil {
		if hwAccel != HWAccelNone {
			p.logger.Warn("Hardware acceleration failed, falling back to software encoding")
			return p.encodeSingleSegmentWithH264Software(inputPath, outputPath, preset)
		}
		return fmt.Errorf("H.264 encoding failed: %v, stderr: %s", err, stderr.String())
	}

	if stat, err := os.Stat(outputPath); err != nil || stat.Size() == 0 {
		return fmt.Errorf("encoding produced invalid output file")
	}

	return nil
}

func (p *videoProcessor) encodeSingleSegmentWithH264Software(inputPath, outputPath string, preset QualityPreset) error {
	args := []string{
		"-y",
		"-hide_banner",
		"-loglevel", "error",
		"-i", inputPath,
		"-c:v", "libx264",
		"-preset", "fast",
		"-profile:v", "high",
		"-level", "4.1",
		"-vf", fmt.Sprintf("scale=%d:%d", preset.Resolution[0], preset.Resolution[1]),
		"-b:v", fmt.Sprintf("%dk", preset.Bitrate),
		"-maxrate", fmt.Sprintf("%dk", int(float64(preset.Bitrate)*1.2)),
		"-bufsize", fmt.Sprintf("%dk", preset.Bitrate*2),
		"-threads", "0",
		"-g", "60",
		"-keyint_min", "60",
		"-sc_threshold", "0",
		"-avoid_negative_ts", "make_zero",
		"-fflags", "+genpts",
		"-async", "1",
		"-vsync", "cfr",
		"-af", "aresample=async=1",
		"-x264-params", "ref=3:bframes=3:b-adapt=1:direct=auto:me=umh:subme=7:trellis=1:rc-lookahead=50",
		"-movflags", "+faststart",
		"-c:a", "aac",
		"-b:a", "128k",
		"-ar", "48000",
		"-ac", "2",
		outputPath,
	}

	cmd := exec.Command("ffmpeg", args...)
	var stderr bytes.Buffer
	cmd.Stderr = &stderr

	if err := cmd.Run(); err != nil {
		return fmt.Errorf("software H.264 encoding failed: %v, stderr: %s", err, stderr.String())
	}

	if stat, err := os.Stat(outputPath); err != nil || stat.Size() == 0 {
		return fmt.Errorf("encoding produced invalid output file")
	}

	return nil
}

type HardwareAccelType string

const (
	HWAccelNone    HardwareAccelType = ""
	HWAccelNVENC   HardwareAccelType = "nvenc"
	HWAccelVAAPI   HardwareAccelType = "vaapi"
	HWAccelQSV     HardwareAccelType = "qsv"
	HWAccelAMF     HardwareAccelType = "amf"
)

func (p *videoProcessor) detectHardwareAcceleration() HardwareAccelType {
	if runtime.GOOS == "windows" {
		if p.checkNVIDIA() {
			return HWAccelNVENC
		}
		if p.checkAMD() {
			return HWAccelAMF
		}
		if p.checkIntelQSV() {
			return HWAccelQSV
		}
	} else if runtime.GOOS == "linux" {
		if p.checkNVIDIA() {
			return HWAccelNVENC
		}
		if p.checkVAAPI() {
			return HWAccelVAAPI
		}
		if p.checkIntelQSV() {
			return HWAccelQSV
		}
	}
	return HWAccelNone
}

func (p *videoProcessor) checkNVIDIA() bool {
	cmd := exec.Command("nvidia-smi")
	return cmd.Run() == nil
}

func (p *videoProcessor) checkVAAPI() bool {
	_, err := os.Stat("/dev/dri/renderD128")
	return err == nil
}

func (p *videoProcessor) checkIntelQSV() bool {
	if runtime.GOOS == "windows" {
		cmd := exec.Command("wmic", "path", "win32_VideoController", "get", "name")
		output, err := cmd.Output()
		if err != nil {
			return false
		}
		return strings.Contains(strings.ToLower(string(output)), "intel")
	}
	return false
}

func (p *videoProcessor) checkAMD() bool {
	if runtime.GOOS == "windows" {
		cmd := exec.Command("wmic", "path", "win32_VideoController", "get", "name")
		output, err := cmd.Output()
		if err != nil {
			return false
		}
		return strings.Contains(strings.ToLower(string(output)), "amd") ||
			   strings.Contains(strings.ToLower(string(output)), "radeon")
	}
	return false
}

func (p *videoProcessor) checkHardwareAcceleration() bool {
	return p.detectHardwareAcceleration() != HWAccelNone
}

func (p *videoProcessor) determineEncodingPreset(hwAccel HardwareAccelType) string {
	cores := runtime.NumCPU()

	if hwAccel != HWAccelNone {
		switch hwAccel {
		case HWAccelNVENC:
			return "p4"
		case HWAccelQSV:
			return "balanced"
		case HWAccelAMF:
			return "balanced"
		case HWAccelVAAPI:
			return "balanced"
		}
	}

	switch {
	case cores >= 16:
		return "slow"
	case cores >= 8:
		return "medium"
	case cores >= 4:
		return "fast"
	default:
		return "veryfast"
	}
}

func (p *videoProcessor) encodeSingleSegmentWithSVTAV1(inputPath, outputPath string, preset QualityPreset) error {
	cores := runtime.NumCPU()
	svtPreset := "8"

	switch {
	case cores >= 16:
		svtPreset = "6"
	case cores >= 8:
		svtPreset = "7"
	case cores >= 4:
		svtPreset = "8"
	default:
		svtPreset = "9"
	}

	args := []string{
		"-y",
		"-hide_banner",
		"-loglevel", "error",
		"-i", inputPath,
		"-c:v", "libsvtav1",
		"-preset", svtPreset,
		"-vf", fmt.Sprintf("scale=%d:%d", preset.Resolution[0], preset.Resolution[1]),
		"-crf", "28",
		"-maxrate", fmt.Sprintf("%dk", int(float64(preset.Bitrate)*1.2)),
		"-bufsize", fmt.Sprintf("%dk", preset.Bitrate*2),
		"-g", "240",
		"-keyint_min", "240",
		"-tile-columns", "2",
		"-tile-rows", "1",
		"-avoid_negative_ts", "make_zero",
		"-fflags", "+genpts",
		"-async", "1",
		"-vsync", "cfr",
		"-af", "aresample=async=1",
		"-movflags", "+faststart",
		"-c:a", "aac",
		"-b:a", "128k",
		"-ar", "48000",
		"-ac", "2",
		outputPath,
	}

	cmd := exec.Command("ffmpeg", args...)
	var stderr bytes.Buffer
	cmd.Stderr = &stderr

	if err := cmd.Run(); err != nil {
		return fmt.Errorf("SVT-AV1 encoding failed: %v, stderr: %s", err, stderr.String())
	}

	if stat, err := os.Stat(outputPath); err != nil || stat.Size() == 0 {
		return fmt.Errorf("AV1 encoding produced invalid output file")
	}

	return nil
}

func (p *videoProcessor) encodeSingleSegmentWithH264Optimized(inputPath, outputPath string, preset QualityPreset) error {
	hwAccel := p.detectHardwareAcceleration()
	cores := runtime.NumCPU()

	args := []string{
		"-y",
		"-hide_banner",
		"-loglevel", "error",
		"-i", inputPath,
	}

	var encoder string
	var hwAccelArgs []string

	switch hwAccel {
	case HWAccelNVENC:
		encoder = "h264_nvenc"
		hwAccelArgs = []string{
			"-hwaccel", "cuda",
			"-hwaccel_output_format", "cuda",
		}
	case HWAccelQSV:
		encoder = "h264_qsv"
		hwAccelArgs = []string{
			"-hwaccel", "qsv",
			"-hwaccel_output_format", "qsv",
		}
	case HWAccelAMF:
		encoder = "h264_amf"
		hwAccelArgs = []string{
			"-hwaccel", "d3d11va",
			"-hwaccel_output_format", "d3d11",
		}
	case HWAccelVAAPI:
		encoder = "h264_vaapi"
		hwAccelArgs = []string{
			"-hwaccel", "vaapi",
			"-hwaccel_output_format", "vaapi",
			"-hwaccel_device", "/dev/dri/renderD128",
		}
	default:
		encoder = "libx264"
	}

	args = append(args, hwAccelArgs...)

	videoFilter := fmt.Sprintf("scale=%d:%d", preset.Resolution[0], preset.Resolution[1])
	if hwAccel == HWAccelVAAPI {
		videoFilter = fmt.Sprintf("scale_vaapi=%d:%d", preset.Resolution[0], preset.Resolution[1])
	} else if hwAccel == HWAccelNVENC {
		videoFilter = fmt.Sprintf("scale_cuda=%d:%d", preset.Resolution[0], preset.Resolution[1])
	}

	encodingArgs := []string{
		"-c:v", encoder,
		"-preset", "medium", // Changed from fast to medium for better quality/time balance
		"-vf", videoFilter,
		"-b:v", fmt.Sprintf("%dk", preset.Bitrate),
		"-maxrate", fmt.Sprintf("%dk", int(float64(preset.Bitrate)*1.2)), // Slightly higher maxrate
		"-bufsize", fmt.Sprintf("%dk", preset.Bitrate*2), // Larger buffer
		"-g", "60", // Standard GOP size based on typical 2s segment for 30fps
		"-keyint_min", "60",
		"-sc_threshold", "0",
		"-avoid_negative_ts", "make_zero",
		"-fflags", "+genpts",
		"-async", "1",
		"-vsync", "cfr",
		"-af", "aresample=async=1",
		"-movflags", "+faststart",
		"-c:a", "aac",
		"-b:a", "96k",
		"-ar", "44100",
		"-ac", "2",
	}

	if hwAccel == HWAccelNone {
		encodingArgs = append(encodingArgs,
			"-profile:v", "high", // Changed from main to high
			"-level", "4.0",      // Adjusted level for broader compatibility with high profile
			"-threads", fmt.Sprintf("%d", cores),
			// Adjusted x264-params for better quality than very fast/aggressive settings
			"-x264-params", "ref=3:bframes=2:b-adapt=1:direct=auto:me=hex:subme=7:trellis=1:rc-lookahead=40",
		)
	} else if hwAccel == HWAccelNVENC {
		encodingArgs = append(encodingArgs,
			"-profile:v", "high", // Changed from main to high
			"-level", "4.0",      // Adjusted level
			"-rc", "vbr",         // Changed from cbr to vbr for better quality
			"-cq", "23",          // Constant Quality target for VBR
			"-rc-lookahead", "20", // Adjusted lookahead
			"-surfaces", "16",     // Adjusted surfaces
			"-bf", "2",            // Allow B-frames
			"-b_ref_mode", "middle",
		)
	}

	args = append(args, encodingArgs...)
	args = append(args, outputPath)

	cmd := exec.Command("ffmpeg", args...)
	var stderr bytes.Buffer
	cmd.Stderr = &stderr

	if err := cmd.Run(); err != nil {
		if hwAccel != HWAccelNone {
			return p.encodeSingleSegmentWithH264Software(inputPath, outputPath, preset)
		}
		return fmt.Errorf("optimized H.264 encoding failed: %v, stderr: %s", err, stderr.String())
	}

	if stat, err := os.Stat(outputPath); err != nil || stat.Size() == 0 {
		return fmt.Errorf("encoding produced invalid output file")
	}

	return nil
}

func (p *videoProcessor) encodeSingleSegmentWithSVTAV1Optimized(inputPath, outputPath string, preset QualityPreset) error {
	cores := runtime.NumCPU()
	// Adjusted SVT-AV1 preset for a better balance. Lower is better quality but slower.
	// Presets range from 0 (slowest, best quality) to 13 (fastest, lowest quality).
	// Targeting a preset around 8-10 for a good balance.
	// The original logic was: 32+ cores -> 8, 16-31 cores -> 9, 8-15 cores -> 10, <8 cores -> 11
	// Let's adjust this to be slightly more quality focused:
	svtPreset := "10" // Default for fewer cores
	if cores >= 32 {
		svtPreset = "7" // Higher quality for many cores
	} else if cores >= 16 {
		svtPreset = "8" // Good balance for 16+ cores
	} else if cores >= 8 {
		svtPreset = "9" // Reasonable for 8+ cores
	}

	args := []string{
		"-y",
		"-hide_banner",
		"-loglevel", "error",
		"-i", inputPath,
		"-c:v", "libsvtav1",
		"-preset", svtPreset, // Uses the adjusted preset
		"-vf", fmt.Sprintf("scale=%d:%d", preset.Resolution[0], preset.Resolution[1]),
		"-crf", "30", // Lowered CRF for better quality (was 32)
		"-maxrate", fmt.Sprintf("%dk", int(float64(preset.Bitrate)*1.2)), // Slightly higher maxrate
		"-bufsize", fmt.Sprintf("%dk", preset.Bitrate*2), // Larger buffer
		"-g", "240", // Standard GOP size, can be ~10 seconds for 24-30fps.
		"-keyint_min", "240",
		// Tile columns/rows depend on resolution and preset, these are common starting points
		// For higher resolutions and faster presets, more tiles can be beneficial.
		// Let's make it dynamic based on cores, similar to svt-av1-ffmpeg examples
		"-tile-columns", fmt.Sprintf("%d", getTileCount(cores, preset.Resolution[0])),
		"-tile-rows", "1", // Often 0 or 1 for better compression efficiency with multiple tile columns
		"-avoid_negative_ts", "make_zero",
		"-fflags", "+genpts",
		"-async", "1",
		"-vsync", "cfr",
		"-af", "aresample=async=1",
		"-movflags", "+faststart",
		"-c:a", "aac",
		"-b:a", "96k",
		"-ar", "44100",
		"-ac", "2",
		outputPath,
	}

	cmd := exec.Command("ffmpeg", args...)
	var stderr bytes.Buffer
	cmd.Stderr = &stderr

	if err := cmd.Run(); err != nil {
		return fmt.Errorf("optimized SVT-AV1 encoding failed: %v, stderr: %s", err, stderr.String())
	}

	if stat, err := os.Stat(outputPath); err != nil || stat.Size() == 0 {
		return fmt.Errorf("AV1 encoding produced invalid output file")
	}

	return nil
}

// getTileCount determines the number of tile columns for SVT-AV1 encoding
// based on number of cores and video width.
// This is a heuristic and might need further tuning based on specific content and hardware.
// Reference: SVT-AV1 documentation suggests tile parallelism benefits from more cores.
func getTileCount(cores int, width int) int {
	if width >= 3840 { // 4K
		if cores >= 16 {
			return 4 // Maximize parallelism for 4K on many cores
		} else if cores >= 8 {
			return 2
		}
		return 1
	} else if width >= 1920 { // 1080p
		if cores >= 8 {
			return 2
		}
		return 1
	}
	// For lower resolutions, fewer tiles are generally better for compression efficiency.
	return 0 // SVT-AV1 default (usually 0 or 1 based on preset)
}

func (p *videoProcessor) uploadProcessedFiles(ctx context.Context, outputPath, outputKey string) error {
	if outputPath == "" || outputKey == "" {
		return fmt.Errorf("output path and key cannot be empty")
	}

	outputKey = strings.TrimPrefix(outputKey, "/")
	baseKey := strings.TrimSuffix(outputKey, filepath.Ext(outputKey))

	log.Printf("Starting concurrent upload process from %s with base key: %s", outputPath, baseKey)

	type uploadJob struct {
		path     string
		relPath  string
		s3Key    string
		fileInfo os.FileInfo
	}

	jobs := make(chan uploadJob)
	results := make(chan error)
	var wg sync.WaitGroup

	maxWorkers := min(MaxConcurrentUploads, MaxIOWorkers)
	for i := 0; i < maxWorkers; i++ {
		wg.Add(1)
		go func(workerID int) {
			defer wg.Done()
			for job := range jobs {
				err := p.uploadSingleFileOptimized(ctx, job.path, job.s3Key, job.fileInfo)
				if err != nil {
					select {
					case results <- fmt.Errorf("worker %d failed to upload %s: %w", workerID, job.relPath, err):
					case <-ctx.Done():
					}
				} else {
					log.Printf("Worker %d successfully uploaded %s", workerID, job.s3Key)
				}
			}
		}(i)
	}

	go func() {

		err := filepath.Walk(outputPath, func(path string, info os.FileInfo, err error) error {
			if err != nil {
				return err
			}

			if info.IsDir() {
				return nil
			}

			relPath, err := filepath.Rel(outputPath, path)
			if err != nil {
				return fmt.Errorf("failed to get relative path: %w", err)
			}

			relPath = filepath.ToSlash(relPath)
			s3Key := fmt.Sprintf("%s/%s", baseKey, relPath)
			s3Key = strings.TrimPrefix(s3Key, "/")

			select {
			case jobs <- uploadJob{
				path:     path,
				relPath:  relPath,
				s3Key:    s3Key,
				fileInfo: info,
			}:
			case <-ctx.Done():
				return ctx.Err()
			}
			return nil
		})

		if err != nil {
			select {
			case results <- fmt.Errorf("failed to walk output directory: %w", err):
			case <-ctx.Done():
			}
		}

		close(jobs)
	}()

	go func() {
		wg.Wait()
		close(results)
	}()

	var uploadErrors []error
	for err := range results {
		if err != nil {
			uploadErrors = append(uploadErrors, err)
		}
	}

	if len(uploadErrors) > 0 {
		return fmt.Errorf("encountered %d upload errors: %v", len(uploadErrors), uploadErrors[0])
	}

	return nil
}

func (p *videoProcessor) uploadSingleFile(ctx context.Context, path, s3Key string, fileInfo os.FileInfo) error {
	file, err := os.Open(path)
	if err != nil {
		return fmt.Errorf("failed to open file: %w", err)
	}
	defer file.Close()

	contentType := getContentType(path)

	uploadInput := models.UploadInput{
		File:       file,
		BucketName: p.cfg.S3.OutputBucket,
		Key:        s3Key,
		MimeType:   contentType,
		Size:       fileInfo.Size(),
	}

	maxRetries := 3
	for attempt := 1; attempt <= maxRetries; attempt++ {
		if _, err := file.Seek(0, 0); err != nil {
			return fmt.Errorf("failed to reset file pointer: %w", err)
		}

		_, err := p.awsRepo.PutObject(ctx, uploadInput)
		if err == nil {
			return nil
		}

		if attempt < maxRetries {
			log.Printf("Upload attempt %d/%d failed for %s: %v. Retrying...",
				attempt, maxRetries, s3Key, err)
			time.Sleep(time.Duration(attempt) * time.Second)
			continue
		}

		return fmt.Errorf("failed to upload after %d attempts: %w", maxRetries, err)
	}

	return nil
}

func (p *videoProcessor) uploadSingleFileOptimized(ctx context.Context, path, s3Key string, fileInfo os.FileInfo) error {
	file, err := os.Open(path)
	if err != nil {
		return fmt.Errorf("failed to open file: %w", err)
	}
	defer file.Close()

	contentType := getContentType(path)

	uploadInput := models.UploadInput{
		File:       file,
		BucketName: p.cfg.S3.OutputBucket,
		Key:        s3Key,
		MimeType:   contentType,
		Size:       fileInfo.Size(),
	}

	maxRetries := 2
	for attempt := 1; attempt <= maxRetries; attempt++ {
		if _, err := file.Seek(0, 0); err != nil {
			return fmt.Errorf("failed to reset file pointer: %w", err)
		}

		_, err := p.awsRepo.PutObject(ctx, uploadInput)
		if err == nil {
			return nil
		}

		if attempt < maxRetries {
			time.Sleep(time.Duration(attempt) * 500 * time.Millisecond)
			continue
		}

		return fmt.Errorf("failed to upload after %d attempts: %w", maxRetries, err)
	}

	return nil
}

func (p *videoProcessor) uploadSubtitleAndThumbnailFiles(ctx context.Context, subtitleFiles []string, thumbnailPath, outputKey string) error {
	baseKey := strings.TrimSuffix(outputKey, filepath.Ext(outputKey))

	for _, subtitleFile := range subtitleFiles {
		if subtitleFile == "" {
			continue
		}

		fileName := filepath.Base(subtitleFile)
		s3Key := fmt.Sprintf("%s/subtitles/%s", baseKey, fileName)

		fileInfo, err := os.Stat(subtitleFile)
		if err != nil {
			p.logger.Warnf("Failed to stat subtitle file %s: %v", subtitleFile, err)
			continue
		}

		if err := p.uploadSingleFileOptimized(ctx, subtitleFile, s3Key, fileInfo); err != nil {
			p.logger.Warnf("Failed to upload subtitle file %s: %v", subtitleFile, err)
		} else {
			p.logger.Infof("Successfully uploaded subtitle file: %s", s3Key)
		}
	}

	if thumbnailPath != "" {
		fileName := filepath.Base(thumbnailPath)
		s3Key := fmt.Sprintf("%s/%s", baseKey, fileName)

		fileInfo, err := os.Stat(thumbnailPath)
		if err != nil {
			return fmt.Errorf("failed to stat thumbnail file %s: %w", thumbnailPath, err)
		}

		if err := p.uploadSingleFileOptimized(ctx, thumbnailPath, s3Key, fileInfo); err != nil {
			return fmt.Errorf("failed to upload thumbnail file %s: %w", thumbnailPath, err)
		}

		p.logger.Infof("Successfully uploaded thumbnail file: %s", s3Key)
	}

	return nil
}

func getContentType(filename string) string {
	ext := strings.ToLower(filepath.Ext(filename))
	switch ext {
	case ".m3u8":
		return "application/vnd.apple.mpegurl"
	case ".ts":
		return "video/mp2t"
	case ".mp4":
		return "video/mp4"
	case ".m4s":
		return "video/mp4"
	case ".mpd":
		return "application/dash+xml"
	case ".json":
		return "application/json"
	case ".srt":
		return "text/srt"
	case ".vtt":
		return "text/vtt"
	case ".ass":
		return "text/x-ass"
	case ".jpg", ".jpeg":
		return "image/jpeg"
	case ".png":
		return "image/png"
	default:
		if contentType := mime.TypeByExtension(ext); contentType != "" {
			return contentType
		}
		return "application/octet-stream"
	}
}
func (p *videoProcessor) cleanup() {
	os.RemoveAll(p.tempDir)
}

func (p *videoProcessor) downloadVideo(ctx context.Context, inputKey string) (string, error) {
	if err := os.MkdirAll(p.tempDir, os.ModePerm); err != nil {
		return "", fmt.Errorf("failed to create temp directory: %w", err)
	}

	localPath := filepath.Join(p.tempDir, filepath.Base(inputKey))

	videoFile, err := p.awsRepo.GetObject(ctx, p.cfg.S3.InputBucket, inputKey)
	if err != nil {
		return "", fmt.Errorf("failed to get object from S3: %w", err)
	}
	defer videoFile.Body.Close()

	outFile, err := os.Create(localPath)
	if err != nil {
		return "", fmt.Errorf("failed to create local video file: %w", err)
	}
	defer outFile.Close()

	buffer := make([]byte, 1024*1024)
	if _, err = io.CopyBuffer(outFile, videoFile.Body, buffer); err != nil {
		return "", fmt.Errorf("failed to write video file: %w", err)
	}

	return localPath, nil
}

func (p *videoProcessor) splitVideo(inputPath string, videoInfo *VideoInfo) ([]string, error) {
	segmentDir := filepath.Join(p.tempDir, "segments")
	if err := os.MkdirAll(segmentDir, 0755); err != nil {
		return nil, fmt.Errorf("failed to create segment directory: %w", err)
	}

	optimalSegmentDuration := p.calculateOptimalSegmentDuration(videoInfo.Duration)
	segmentCount := math.Min(math.Ceil(videoInfo.Duration/optimalSegmentDuration), MaxSegments)
	segmentDuration := math.Ceil(videoInfo.Duration / segmentCount)

	args := []string{
		"-y",
		"-hide_banner",
		"-loglevel", "error",
		"-i", inputPath,
		"-c", "copy",
		"-f", "segment",
		"-segment_time", fmt.Sprintf("%.0f", segmentDuration),
		"-avoid_negative_ts", "make_zero",
		"-fflags", "+genpts",
		"-segment_format_options", "movflags=+faststart",
		filepath.Join(segmentDir, "segment_%03d.mp4"),
	}

	cmd := exec.Command("ffmpeg", args...)
	var stderr bytes.Buffer
	cmd.Stderr = &stderr

	if err := cmd.Run(); err != nil {
		return nil, fmt.Errorf("splitting failed: %v, stderr: %s", err, stderr.String())
	}

	segments, err := filepath.Glob(filepath.Join(segmentDir, "segment_*.mp4"))
	if err != nil {
		return nil, fmt.Errorf("failed to list segments: %w", err)
	}

	if len(segments) == 0 {
		return nil, fmt.Errorf("no segments were created")
	}

	return segments, nil
}

func (p *videoProcessor) calculateOptimalSegmentDuration(totalDuration float64) float64 {
	maxEncoders := GetMaxConcurrentEncoders()

	switch {
	case totalDuration <= 30:
		return math.Max(totalDuration/float64(maxEncoders/2), MinSegmentDuration)
	case totalDuration <= 120:
		return math.Max(totalDuration/float64(maxEncoders), MinSegmentDuration)
	case totalDuration <= 600:
		return math.Max(totalDuration/float64(maxEncoders*2), MinSegmentDuration)
	case totalDuration <= 1800:
		return math.Max(totalDuration/float64(maxEncoders*3), MinSegmentDuration)
	default:
		return math.Max(totalDuration/float64(MaxSegments), MinSegmentDuration)
	}
}

// normalizeVideoDuration ensures that the video has exactly the specified duration
// This helps prevent alignment issues when packaging multiple quality versions
func (p *videoProcessor) normalizeVideoDuration(inputPath string, targetDuration float64) (string, error) {
	outputPath := inputPath + ".normalized.mp4"

	// Use FFmpeg to precisely trim the video to the target duration
	cmd := exec.Command("ffmpeg",
		"-i", inputPath,
		"-t", fmt.Sprintf("%.3f", targetDuration),
		"-c", "copy",
		"-avoid_negative_ts", "make_zero",
		"-fflags", "+genpts",
		outputPath,
	)

	var stderr bytes.Buffer
	cmd.Stderr = &stderr

	if err := cmd.Run(); err != nil {
		return "", fmt.Errorf("failed to normalize video duration: %v, stderr: %s", err, stderr.String())
	}

	return outputPath, nil
}

func (p *videoProcessor) stitchAndPackageMultiQuality(qualitySegments map[models.VideoQuality][]string, outputPath string) error {

	packagingDir := filepath.Join(p.tempDir, "packaging")
	log.Println("packagingDir ",packagingDir)
	if err := os.MkdirAll(packagingDir, 0755); err != nil {
		return fmt.Errorf("failed to create packaging directory: %w", err)
	}

	// First, stitch all segments for each quality
	stitchedPaths := make(map[models.VideoQuality]string)
	for quality, segments := range qualitySegments {
		qualityOutputPath := filepath.Join(outputPath, string(quality))
		if err := os.MkdirAll(qualityOutputPath, 0755); err != nil {
			return fmt.Errorf("failed to create output directory for quality %s: %w", quality, err)
		}

		p.logger.Infof("Stitching %d segments for quality %s", len(segments), quality)
		for i, segment := range segments {
			p.logger.Infof("Segment %d: %s", i, segment)
		}

		stitchedPath := filepath.Join(packagingDir, fmt.Sprintf("stitched_%s.mp4", quality))
		if err := p.stitchSegmentsToFileOptimized(segments, stitchedPath); err != nil {
			return fmt.Errorf("failed to stitch segments for quality %s: %w", quality, err)
		}

		stitchedPaths[quality] = stitchedPath
	}

	// Get duration of the first video to use as reference
	var referenceDuration float64
	var referenceQuality models.VideoQuality
	for quality, path := range stitchedPaths {
		info, err := GetVideoInfo(path)
		if err != nil {
			return fmt.Errorf("failed to get video info for quality %s: %w", quality, err)
		}
		referenceDuration = info.Duration
		referenceQuality = quality
		break
	}

	// Ensure all videos have the same duration
	fragmentPaths := []string{}
	for quality, stitchedPath := range stitchedPaths {
		info, err := GetVideoInfo(stitchedPath)
		if err != nil {
			return fmt.Errorf("failed to get video info for quality %s: %w", quality, err)
		}

		// If durations differ by more than 0.1 seconds, normalize the duration
		normalizedPath := stitchedPath
		if math.Abs(info.Duration-referenceDuration) > 0.1 {
			p.logger.Warn(fmt.Sprintf("Duration mismatch: %s (%.3fs) vs %s (%.3fs) - normalizing",
				quality, info.Duration, referenceQuality, referenceDuration))

			normalizedPath, err = p.normalizeVideoDuration(stitchedPath, referenceDuration)
			if err != nil {
				return fmt.Errorf("failed to normalize duration for quality %s: %w", quality, err)
			}
		}

		fragmentedPath := filepath.Join(packagingDir, fmt.Sprintf("fragmented_%s.mp4", quality))
		if err := p.fragmentVideo(normalizedPath, fragmentedPath); err != nil {
			return fmt.Errorf("failed to fragment video for quality %s: %w", quality, err)
		}

		fragmentPaths = append(fragmentPaths, fragmentedPath)
	}

	opts := stitchAndPackageOptions{
		segmentDuration: 4,
		withHLS:         true,
		withDASH:        true,
	}

	p.logger.Info(fmt.Sprintf("Packaging %d fragment paths", len(fragmentPaths)))

	if err := p.packageVideo(fragmentPaths, outputPath, opts); err != nil {
		return fmt.Errorf("failed to package video: %w", err)
	}

	return nil
}

func (p *videoProcessor) stitchSegmentsToFileOptimized(segments []string, outputPath string) error {
	if len(segments) == 0 {
		return fmt.Errorf("no segments to stitch")
	}

	if len(segments) == 1 {
		return p.copyFile(segments[0], outputPath)
	}

	concatListPath := outputPath + ".concat"
	defer os.Remove(concatListPath)

	concatFile, err := os.Create(concatListPath)
	if err != nil {
		return fmt.Errorf("failed to create concat list: %w", err)
	}
	defer concatFile.Close()

	for _, segment := range segments {
		if _, err := os.Stat(segment); os.IsNotExist(err) {
			return fmt.Errorf("segment file does not exist: %s", segment)
		}

		absPath, err := filepath.Abs(segment)
		if err != nil {
			return fmt.Errorf("failed to get absolute path for %s: %w", segment, err)
		}

		cleanPath := filepath.Clean(absPath)
		if _, err := fmt.Fprintf(concatFile, "file '%s'\n", cleanPath); err != nil {
			return fmt.Errorf("failed to write to concat list: %w", err)
		}
	}

	if err := concatFile.Close(); err != nil {
		return fmt.Errorf("failed to close concat file: %w", err)
	}

	args := []string{
		"-y",
		"-hide_banner",
		"-loglevel", "error",
		"-f", "concat",
		"-safe", "0",
		"-i", concatListPath,
		"-c", "copy",
		"-avoid_negative_ts", "make_zero",
		"-fflags", "+genpts",
		outputPath,
	}

	cmd := exec.Command("ffmpeg", args...)
	var stderr bytes.Buffer
	cmd.Stderr = &stderr

	workingDir, _ := os.Getwd()
	p.logger.Infof("FFmpeg working directory: %s", workingDir)
	p.logger.Infof("FFmpeg command: %v", args)

	if err := cmd.Run(); err != nil {
		p.logger.Errorf("FFmpeg stitching failed. Args: %v", args)
		p.logger.Errorf("Working directory: %s", workingDir)
		p.logger.Errorf("Concat file path: %s", concatListPath)
		p.logger.Errorf("Output path: %s", outputPath)
		p.logger.Errorf("Concat file contents:")
		if content, readErr := os.ReadFile(concatListPath); readErr == nil {
			p.logger.Errorf("%s", string(content))
		}
		return fmt.Errorf("stitching failed: %v, stderr: %s", err, stderr.String())
	}

	return nil
}

func (p *videoProcessor) copyFile(src, dst string) error {
	sourceFile, err := os.Open(src)
	if err != nil {
		return err
	}
	defer sourceFile.Close()

	destFile, err := os.Create(dst)
	if err != nil {
		return err
	}
	defer destFile.Close()

	buffer := make([]byte, 1024*1024)
	_, err = io.CopyBuffer(destFile, sourceFile, buffer)
	return err
}

func (p *videoProcessor) createMasterPlaylist(outputPath string, qualitySegments map[models.VideoQuality][]string) error {
	masterPlaylistPath := filepath.Join(outputPath, "master.m3u8")
	file, err := os.Create(masterPlaylistPath)
	if err != nil {
		return fmt.Errorf("failed to create master playlist: %w", err)
	}
	defer file.Close()

	if _, err := file.WriteString("#EXTM3U\n#EXT-X-VERSION:3\n"); err != nil {
		return fmt.Errorf("failed to write to master playlist: %w", err)
	}

	qualityOrder := []models.VideoQuality{
		models.Quality1080P,
		models.Quality720P,
		models.Quality480P,
		models.Quality360P,
	}

	for _, quality := range qualityOrder {
		if _, exists := qualitySegments[quality]; !exists {
			continue
		}

		var bandwidth int
		var resolution string

		switch quality {
		case models.Quality1080P:
			bandwidth = 4500000
			resolution = "1920x1080"
		case models.Quality720P:
			bandwidth = 2500000
			resolution = "1280x720"
		case models.Quality480P:
			bandwidth = 1000000
			resolution = "854x480"
		case models.Quality360P:
			bandwidth = 600000
			resolution = "640x360"
		}

		streamInfo := fmt.Sprintf("#EXT-X-STREAM-INF:BANDWIDTH=%d,RESOLUTION=%s,CODECS=\"av01.0.08M.08.0.110.01.01.01.0,mp4a.40.2\",FRAME-RATE=30\n",
			bandwidth, resolution)
		if _, err := file.WriteString(streamInfo); err != nil {
			return fmt.Errorf("failed to write stream info to master playlist: %w", err)
		}

		variantPath := fmt.Sprintf("%s/master.m3u8\n", quality)
		if _, err := file.WriteString(variantPath); err != nil {
			return fmt.Errorf("failed to write variant path to master playlist: %w", err)
		}
	}

	return nil
}



func GetVideoInfo(inputPath string) (*VideoInfo, error) {
	dir, err := os.Getwd()
	if err != nil {
		return nil, err
	}
	finalPath := filepath.Join(dir, inputPath)

	cmd := exec.Command("ffprobe", "-v", "quiet", "-select_streams", "v:0",
		"-show_entries", "stream=width,height", "-of", "csv=p=0", finalPath)
	output, err := cmd.CombinedOutput()
	if err != nil {
		return nil, fmt.Errorf("ffprobe error: %v output: %v", err, string(output))
	}

	trimmedOutput := strings.TrimSpace(string(output))
	trimmedOutput = strings.TrimRight(trimmedOutput, ",")

	lines := strings.Split(trimmedOutput, "\n")
	var validLine string
	for _, line := range lines {
		line = strings.TrimSpace(line)
		if line != "" && !strings.Contains(line, "@") && !strings.Contains(line, "[") {
			validLine = line
			break
		}
	}

	if validLine == "" {
		return nil, fmt.Errorf("no valid video info found in ffprobe output: %s", trimmedOutput)
	}

	parts := strings.Split(validLine, ",")
	if len(parts) != 2 {
		return nil, fmt.Errorf("unexpected ffprobe output format: %s", validLine)
	}

	width, err := strconv.Atoi(parts[0])
	if err != nil {
		return nil, fmt.Errorf("invalid width: %v", err)
	}

	height, err := strconv.Atoi(parts[1])
	if err != nil {
		return nil, fmt.Errorf("invalid height: %v", err)
	}

	cmd = exec.Command("ffprobe", "-v", "quiet", "-show_entries",
		"format=duration", "-of", "csv=p=0", finalPath)
	durationOutput, err := cmd.CombinedOutput()
	if err != nil {
		return nil, fmt.Errorf("ffprobe duration error: %v", err)
	}

	durationStr := strings.TrimSpace(string(durationOutput))
	durationLines := strings.Split(durationStr, "\n")
	var validDurationLine string
	for _, line := range durationLines {
		line = strings.TrimSpace(line)
		if line != "" && !strings.Contains(line, "@") && !strings.Contains(line, "[") {
			validDurationLine = line
			break
		}
	}

	duration, err := strconv.ParseFloat(validDurationLine, 64)
	if err != nil {
		return nil, fmt.Errorf("invalid duration: %v", err)
	}

	return &VideoInfo{
		Width:    width,
		Height:   height,
		Duration: duration,
	}, nil
}

func (p *videoProcessor) parseLogFile(filename, key string) (float64, error) {
	file, err := os.Open(filename)
	if err != nil {
		return 0, fmt.Errorf("failed to open log file: %w", err)
	}
	defer file.Close()

	var sum float64
	var count int
	scanner := bufio.NewScanner(file)

	for scanner.Scan() {
		line := scanner.Text()
		if strings.Contains(line, key) {
			parts := strings.Split(line, "=")
			if len(parts) < 2 {
				continue
			}
			val, err := strconv.ParseFloat(strings.TrimSpace(parts[1]), 64)
			if err != nil {
				continue
			}
			sum += val
			count++
		}
	}

	if err := scanner.Err(); err != nil {
		return 0, fmt.Errorf("error reading log file: %w", err)
	}

	if count == 0 {
		return 0, fmt.Errorf("no valid entries found for key %s", key)
	}

	return sum / float64(count), nil
}

func (p *videoProcessor) analyzeComplexity(inputPath string) (spatial, temporal float64, err error) {
	dir := filepath.Dir(inputPath)
	spatialLog := filepath.Join(dir, "spatial.log")
	temporalLog := filepath.Join(dir, "temporal.log")

	defer os.Remove(spatialLog)
	defer os.Remove(temporalLog)

	cmdSpatial := exec.Command("ffmpeg",
		"-i", inputPath,
		"-vf", "signalstats=stat=tout,metadata=print:key=lavfi.signalstats.YAVG:file="+spatialLog,
		"-f", "null", "-",
	)

	var spatialStderr bytes.Buffer
	cmdSpatial.Stderr = &spatialStderr

	if err := cmdSpatial.Run(); err != nil {
		return 0, 0, fmt.Errorf("spatial analysis failed: %v, stderr: %s", err, spatialStderr.String())
	}

	yavg, err := p.parseLogFile(spatialLog, "lavfi.signalstats.YAVG=")
	if err != nil {
		return 0, 0, fmt.Errorf("parsing spatial log failed: %w", err)
	}
	spatial = math.Pow(yavg, 2)

	cmdTemp := exec.Command("ffmpeg",
		"-i", inputPath,
		"-vf", "signalstats=stat=tout,metadata=print:key=lavfi.signalstats.YDIF:file="+temporalLog,
		"-f", "null", "-",
	)

	var temporalStderr bytes.Buffer
	cmdTemp.Stderr = &temporalStderr

	if err := cmdTemp.Run(); err != nil {
		return 0, 0, fmt.Errorf("temporal analysis failed: %v, stderr: %s", err, temporalStderr.String())
	}

	temporal, err = p.parseLogFile(temporalLog, "lavfi.signalstats.YDIF=")
	if err != nil {
		return 0, 0, fmt.Errorf("parsing temporal log failed: %w", err)
	}

	return spatial, temporal, nil
}

func (p *videoProcessor) analyzeBitrate(sampleSegment string, videoInfo *VideoInfo) (int, error) {

	spatial, temporal, err := p.analyzeComplexity(sampleSegment)
	if err != nil {
		return 0, fmt.Errorf("complexity analysis failed: %w", err)
	}

	pixels := videoInfo.Width * videoInfo.Height
	baseBitrate := DefaultBaseBitrate
	switch {
	case pixels >= 1920*1080:
		baseBitrate = FullHDBaseBitrate
	case pixels >= 1280*720:
		baseBitrate = HDBaseBitrate
	}

	spatialComplexity := math.Min(spatial/800.0, 1.0)
	temporalComplexity := math.Min(temporal/40.0, 1.0)

	complexityScore := (spatialComplexity*0.7 + temporalComplexity*0.3)

	adjustedBitrate := int(float64(baseBitrate) * (0.3 + 0.7*complexityScore))

	return adjustedBitrate, nil
}



func (p *videoProcessor) extractSubtitles(inputPath string) ([]string, error) {
	subtitleDir := filepath.Join(p.tempDir, "subtitles")
	if err := os.MkdirAll(subtitleDir, 0755); err != nil {
		return nil, fmt.Errorf("failed to create subtitle directory: %w", err)
	}

	cmd := exec.Command("ffprobe", "-v", "quiet", "-select_streams", "s",
		"-show_entries", "stream=index,codec_name:stream_tags=language,title",
		"-of", "csv=p=0", inputPath)

	var stdout bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = io.Discard

	if err := cmd.Run(); err != nil {
		p.logger.Infof("No subtitle streams found in video: %v", err)
		return []string{}, nil
	}

	lines := strings.Split(strings.TrimSpace(stdout.String()), "\n")
	var extractedFiles []string
	subtitleIndex := 0

	for _, line := range lines {
		line = strings.TrimSpace(line)
		if line == "" {
			continue
		}

		parts := strings.Split(line, ",")
		if len(parts) < 2 {
			continue
		}

		streamIndex := parts[0]
		codecName := parts[1]

		var language string
		if len(parts) > 2 && parts[2] != "" {
			language = parts[2]
		} else {
			language = "und"
		}

		tempOutputPath := filepath.Join(subtitleDir, fmt.Sprintf("temp_subtitle_%d.%s", subtitleIndex, getOriginalSubtitleExt(codecName)))

		extractCmd := exec.Command("ffmpeg", "-y", "-hide_banner", "-loglevel", "error",
			"-i", inputPath, "-map", fmt.Sprintf("0:%s", streamIndex), "-c:s", "copy", tempOutputPath)

		var stderr bytes.Buffer
		extractCmd.Stderr = &stderr

		if err := extractCmd.Run(); err != nil {
			p.logger.Warnf("Failed to extract subtitle stream %s: %v, stderr: %s", streamIndex, err, stderr.String())
			continue
		}

		if stat, err := os.Stat(tempOutputPath); err != nil || stat.Size() == 0 {
			p.logger.Warnf("Extracted subtitle file is empty or doesn't exist: %s", tempOutputPath)
			os.Remove(tempOutputPath)
			continue
		}

		finalOutputPath := filepath.Join(subtitleDir, fmt.Sprintf("subtitle_%d_%s.vtt", subtitleIndex, language))

		if err := p.convertToVTT(tempOutputPath, finalOutputPath, codecName); err != nil {
			p.logger.Warnf("Failed to convert subtitle to VTT: %v", err)
			os.Remove(tempOutputPath)
			continue
		}

		os.Remove(tempOutputPath)

		extractedFiles = append(extractedFiles, finalOutputPath)
		p.logger.Infof("Extracted and converted subtitle stream %s (%s) to %s", streamIndex, language, finalOutputPath)
		subtitleIndex++
	}

	return extractedFiles, nil
}

func getOriginalSubtitleExt(codecName string) string {
	switch codecName {
	case "subrip":
		return "srt"
	case "webvtt":
		return "vtt"
	case "ass", "ssa":
		return "ass"
	case "mov_text":
		return "srt"
	case "dvd_subtitle", "dvdsub":
		return "sub"
	case "hdmv_pgs_subtitle":
		return "sup"
	default:
		return "srt"
	}
}

func (p *videoProcessor) convertToVTT(inputPath, outputPath, codecName string) error {
	if codecName == "webvtt" {
		return p.copyFile(inputPath, outputPath)
	}

	args := []string{
		"-y",
		"-hide_banner",
		"-loglevel", "error",
		"-i", inputPath,
		"-c:s", "webvtt",
		outputPath,
	}

	cmd := exec.Command("ffmpeg", args...)
	var stderr bytes.Buffer
	cmd.Stderr = &stderr

	if err := cmd.Run(); err != nil {
		return fmt.Errorf("VTT conversion failed: %v, stderr: %s", err, stderr.String())
	}

	if stat, err := os.Stat(outputPath); err != nil || stat.Size() == 0 {
		return fmt.Errorf("VTT conversion produced invalid output file")
	}

	return nil
}

func (p *videoProcessor) generateThumbnail(inputPath string, duration float64) (string, error) {
	thumbnailDir := filepath.Join(p.tempDir, "thumbnails")
	if err := os.MkdirAll(thumbnailDir, 0755); err != nil {
		return "", fmt.Errorf("failed to create thumbnail directory: %w", err)
	}

	outputPath := filepath.Join(thumbnailDir, "thumbnail.jpg")

	timestamp := duration * 0.1
	if timestamp < 1.0 {
		timestamp = 1.0
	}

	args := []string{
		"-y",
		"-hide_banner",
		"-loglevel", "error",
		"-ss", fmt.Sprintf("%.2f", timestamp),
		"-i", inputPath,
		"-vframes", "1",
		"-q:v", "2",
		"-vf", "scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2",
		outputPath,
	}

	cmd := exec.Command("ffmpeg", args...)
	var stderr bytes.Buffer
	cmd.Stderr = &stderr

	if err := cmd.Run(); err != nil {
		return "", fmt.Errorf("thumbnail generation failed: %v, stderr: %s", err, stderr.String())
	}

	if stat, err := os.Stat(outputPath); err != nil || stat.Size() == 0 {
		return "", fmt.Errorf("thumbnail generation produced invalid output file")
	}

	p.logger.Infof("Generated thumbnail at timestamp %.2fs: %s", timestamp, outputPath)
	return outputPath, nil
}
