package worker

import (
	"context"
	"errors"
	"fmt"
	"log"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"github.com/go-redis/redis/v8"
	"github.com/google/uuid"

	"github.com/amankumarsingh77/cloud-video-encoder/internal/config"
	"github.com/amankumarsingh77/cloud-video-encoder/internal/models"
	"github.com/amankumarsingh77/cloud-video-encoder/internal/videofiles"
	"github.com/amankumarsingh77/cloud-video-encoder/pkg/logger"
	"github.com/amankumarsingh77/cloud-video-encoder/pkg/utils"
)

const (
	VideoJobsQueue  = VideoJobsQueueKey
	JobChannel      = "new_video_jobs_channel"
	DefaultCPULimit = 1.0
)

var ErrNoJob = errors.New("no job available")

func NewWorker(cfg *config.Config, logger logger.Logger, redisRepo videofiles.RedisRepository, awsRepo videofiles.AWSRepository, videoRepo videofiles.Repository) (*Worker, error) {
	if cfg == nil || logger == nil || redisRepo == nil || awsRepo == nil || videoRepo == nil {
		return nil, errors.New("missing required dependencies")
	}

	return &Worker{
		logger:    logger,
		redisRepo: redisRepo,
		awsRepo:   awsRepo,
		videoRepo: videoRepo,
		cfg:       cfg,
		stopChan:  make(chan struct{}),
		jobs:      make(chan *models.EncodeJob, 100),
		semaphore: make(chan struct{}, cfg.Worker.WorkerCount),
	}, nil
}

func (w *Worker) Start(ctx context.Context) error {
	w.logger.Info("Starting worker pool")
	log.Println(w.cfg.Worker.WorkerCount)

	w.wg.Add(1)
	go w.subscribeToJobs(ctx)

	for i := 0; i < w.cfg.Worker.WorkerCount; i++ {
		log.Println("Starting worker", i)
		w.wg.Add(1)
		go func(id int) {
			w.runWorker(ctx, id)
		}(i)
	}

	return nil
}

func (w *Worker) subscribeToJobs(ctx context.Context) {
	defer w.wg.Done()

	redisClient, ok := w.redisRepo.(interface{ GetRedisClient() *redis.Client })
	if !ok {
		w.logger.Error("Redis repository doesn't support getting client")
		return
	}
	client := redisClient.GetRedisClient()

	pubsub := client.Subscribe(ctx, JobChannel)
	defer pubsub.Close()

	_, err := pubsub.Receive(ctx)
	if err != nil {
		w.logger.Errorf("Failed to subscribe to job channel: %v", err)
		return
	}

	w.logger.Info("Successfully subscribed to job notifications channel")
	ch := pubsub.Channel()

	w.wg.Add(1)
	go func() {
		defer w.wg.Done()
		w.dequeueJobs(ctx)
	}()

	for {
		select {
		case <-ctx.Done():
			w.logger.Info("Job subscriber received context cancellation")
			return
		case <-w.stopChan:
			w.logger.Info("Job subscriber received stop signal")
			return
		case msg := <-ch:
			if msg != nil {
				w.logger.Infof("Received job notification: %s", msg.Payload)
			}
		}
	}
}

func (w *Worker) dequeueJobs(ctx context.Context) {
	for {
		select {
		case <-ctx.Done():
			return
		case <-w.stopChan:
			return
		default:

			job, err := w.redisRepo.DequeueJob(ctx, VideoJobsQueueKey)

			if err != nil {
				if err != redis.Nil {

				}
				time.Sleep(1 * time.Second)
				continue
			}

			if job == nil {
				time.Sleep(1 * time.Second)
				continue
			}

			w.logger.Infof("Successfully dequeued job %s for video %s", job.JobID, job.VideoID)

			select {
			case w.jobs <- job:
				w.logger.Infof("Successfully queued job %s for processing", job.JobID)
			default:
				w.logger.Warnf("Job queue is full, waiting to queue job %s", job.JobID)

				for {
					select {
					case <-ctx.Done():
						return
					case <-w.stopChan:
						return
					case w.jobs <- job:
						w.logger.Infof("Successfully queued job %s after waiting", job.JobID)
						break
					case <-time.After(1 * time.Second):
						continue
					}
					break
				}
			}
		}
	}
}

func (w *Worker) Stop() {
	close(w.stopChan)
	w.wg.Wait()
	w.logger.Info("Worker stopped successfully")
}

func (w *Worker) runWorker(ctx context.Context, workerID int) {
	defer w.wg.Done()
	w.logger.Infof("Worker %d started", workerID)

	for {
		select {
		case <-ctx.Done():
			w.logger.Infof("Worker %d received shutdown signal", workerID)
			return
		case <-w.stopChan:
			w.logger.Infof("Worker %d received stop signal", workerID)
			return
		case job := <-w.jobs:

			select {
			case w.semaphore <- struct{}{}:

				go func() {
					defer func() { <-w.semaphore }()
					if err := w.processJob(ctx, workerID, job); err != nil {
						w.logger.Errorf("Worker %d failed to process job %s for video %s: %v", workerID, job.JobID, job.VideoID, err)
					}
				}()
			default:
				// Semaphore is full, try to requeue the job to the input channel w.jobs
				// This is a simple requeue. If w.jobs is also full, it might block or fail.
				// Adding a timeout to prevent indefinite blocking if the jobs channel is persistently full.
				select {
				case w.jobs <- job:
					w.logger.Infof("Worker %d: Requeued job %s for video %s due to full semaphore, job sent back to worker queue.", workerID, job.JobID, job.VideoID)
				case <-time.After(2 * time.Second): // Timeout for attempting to requeue
					w.logger.Warnf("Worker %d: Failed to requeue job %s for video %s after 2s timeout; job channel likely full. Job %s may be dropped or delayed significantly.", workerID, job.JobID, job.VideoID, job.JobID)
					// Potentially, this job could be pushed to a "dead letter" queue or a delayed retry mechanism in a more complex system.
					// For now, it's logged as a warning.
				case <-ctx.Done():
					w.logger.Infof("Worker %d: Context cancelled while attempting to requeue job %s for video %s.", workerID, job.JobID, job.VideoID)
				case <-w.stopChan:
					w.logger.Infof("Worker %d: Stop signal received while attempting to requeue job %s for video %s.", workerID, job.JobID, job.VideoID)
				}
			}
		}
	}
}

func (w *Worker) processJob(ctx context.Context, workerID int, job *models.EncodeJob) error {
	w.logger.Infof("Worker %d processing job: %s", workerID, job.VideoID)

	videoID, err := uuid.Parse(job.VideoID)
	if err != nil {
		w.logger.Errorf("Failed to parse video ID: %v", err)
		return fmt.Errorf("invalid video ID: %w", err)
	}

	canAcceptJob, usage := utils.CheckCPUUsage(w.cfg.Worker.MaxCPUUsage)
	memoryUsage := utils.CheckMemoryUsage()

	if !canAcceptJob || memoryUsage > 85.0 {
		w.logger.Infof("Worker %d: System resources too high (CPU: %.2f%%, Memory: %.2f%%), requeueing job", workerID, usage, memoryUsage)
		select {
		case w.jobs <- job:
			return nil
		default:
			return fmt.Errorf("failed to requeue job, channel full")
		}
	}

	if err := w.videoRepo.UpdateVideoProgress(ctx, videoID, models.JobStatusProcessing, 0); err != nil {
		w.logger.Errorf("Failed to update initial progress: %v", err)
	}

	if err := w.redisRepo.UpdateStatus(ctx, job.VideoID, VideoJobsQueue, "processing"); err != nil {
		w.logger.Errorf("Failed to update job status: %v", err)
	}

	processor := NewVideoProcessor(w.cfg, w.awsRepo, w.videoRepo, w.logger, job)
	result, err := processor.ProcessVideo(ctx, job, videoID)
	if err != nil {
		// Log the main processing error first
		processingErr := fmt.Errorf("failed to process video %s (job %s): %w", job.VideoID, job.JobID, err)
		w.logger.Error(processingErr.Error())

		// Attempt to update statuses, logging any errors from these updates
		// but ensuring the original processing error is returned.
		if statusUpdateErr := w.redisRepo.UpdateStatus(ctx, job.VideoID, VideoJobsQueue, "failed"); statusUpdateErr != nil {
			w.logger.Errorf("CRITICAL: Failed to update Redis job status to 'failed' for video %s (job %s) after processing error: %v. Main error: %s", job.VideoID, job.JobID, statusUpdateErr, processingErr)
		}

		if progressUpdateErr := w.videoRepo.UpdateVideoProgress(ctx, videoID, models.JobStatusFailed, 0); progressUpdateErr != nil {
			w.logger.Errorf("CRITICAL: Failed to update PostgreSQL video progress to 'failed' for video %s (job %s) after processing error: %v. Main error: %s", videoID, job.JobID, progressUpdateErr, processingErr)
		}
		return processingErr // Return the original error that caused the failure
	}

	// Video processing completed successfully, now update statuses.
	var finalError error

	if err := w.videoRepo.UpdateVideoProgress(ctx, videoID, models.JobStatusCompleted, 100); err != nil {
		errMsg := fmt.Sprintf("Failed to update final video progress to 'completed' in PostgreSQL for video %s (job %s): %v", videoID, job.JobID, err)
		w.logger.Error(errMsg)
		finalError = fmt.Errorf(errMsg) // Store this error
	}

	outputPath := job.OutputS3Key
	videoExtensions := []string{".mp4", ".mkv", ".avi", ".mov", ".wmv", ".flv", ".webm"}
	for _, ext := range videoExtensions {
		outputPath = strings.TrimSuffix(outputPath, ext)
	}

	var thumbnailURL string
	if result.ThumbnailPath != "" {
		thumbnailURL = fmt.Sprintf("%s/%s/thumbnail.jpg", w.cfg.S3.CDNEndpoint, outputPath)
	}

	var subtitleURLs []string
	for _, subtitleFile := range result.SubtitleFiles {
		if subtitleFile != "" {
			fileName := filepath.Base(subtitleFile)
			subtitleURL := fmt.Sprintf("%s/%s/subtitles/%s", w.cfg.S3.CDNEndpoint, outputPath, fileName)
			subtitleURLs = append(subtitleURLs, subtitleURL)
		}
	}

	playbackInfo := &models.PlaybackInfo{
		VideoID:   job.VideoID,
		Title:     filepath.Base(job.InputS3Key),
		Duration:  result.Duration,
		Thumbnail: thumbnailURL,
		Qualities: make(map[models.VideoQuality]models.QualityInfo),
		Subtitles: subtitleURLs,
		Format:    models.FormatHLS,
		Status:    models.JobStatusCompleted,
	}

	for _, qualityInfo := range result.Qualities {
		resolutionParts := strings.Split(qualityInfo.Resolution, "x")
		if len(resolutionParts) != 2 {
			continue
		}

		var qualityKey models.VideoQuality
		width, _ := strconv.Atoi(resolutionParts[0])

		switch {
		case width >= 1920:
			qualityKey = models.Quality1080P
		case width >= 1280:
			qualityKey = models.Quality720P
		case width >= 854:
			qualityKey = models.Quality480P
		default:
			qualityKey = models.Quality360P
		}

		playbackInfo.Qualities[qualityKey] = models.QualityInfo{
			URLs: models.PlaybackURLs{
				HLS:  fmt.Sprintf("%s/%s/%s/master.m3u8", w.cfg.S3.CDNEndpoint, outputPath, qualityKey),
				DASH: fmt.Sprintf("%s/%s/%s/stream.mpd", w.cfg.S3.CDNEndpoint, outputPath, qualityKey),
			},
			Resolution: qualityInfo.Resolution,
			Bitrate:    qualityInfo.Bitrate,
		}
	}

	playbackInfo.Qualities[models.QualityMaster] = models.QualityInfo{
		URLs: models.PlaybackURLs{
			HLS:  fmt.Sprintf("%s/%s/master.m3u8", w.cfg.S3.CDNEndpoint, outputPath),
			DASH: fmt.Sprintf("%s/%s/stream.mpd", w.cfg.S3.CDNEndpoint, outputPath),
		},
		Resolution: "adaptive",
		Bitrate:    0,
	}

	if err := w.videoRepo.CreatePlaybackInfo(ctx, videoID, playbackInfo); err != nil {
		errMsg := fmt.Sprintf("Failed to create playback info in PostgreSQL for video %s (job %s): %v", videoID, job.JobID, err)
		w.logger.Error(errMsg)
		// If previous update was successful, this becomes the finalError. Otherwise, append.
		if finalError == nil {
			finalError = fmt.Errorf(errMsg)
		} else {
			finalError = fmt.Errorf("%v; and %s", finalError, errMsg)
		}
		// Also attempt to mark Redis as 'failed' because the job isn't fully complete.
		if statusUpdateErr := w.redisRepo.UpdateStatus(ctx, job.VideoID, VideoJobsQueue, "failed"); statusUpdateErr != nil {
			w.logger.Errorf("CRITICAL: Failed to update Redis job status to 'failed' for video %s (job %s) after CreatePlaybackInfo error: %v", job.VideoID, job.JobID, statusUpdateErr)
		}
	}

	// Update Redis status last. If everything above was successful, mark as 'completed'.
	// If there was an error in PG updates, finalError will be non-nil.
	// In such case, it's debatable whether to mark Redis as 'completed' or 'failed'.
	// For now, if finalError is set, we will consider the job not fully completed.
	if finalError == nil {
		if err := w.redisRepo.UpdateStatus(ctx, job.VideoID, VideoJobsQueue, "completed"); err != nil {
			errMsg := fmt.Sprintf("Failed to update final job status to 'completed' in Redis for video %s (job %s): %v", job.VideoID, job.JobID, err)
			w.logger.Error(errMsg)
			finalError = fmt.Errorf(errMsg)
		}
	} else {
		// If there was a PG error, ensure Redis is not 'completed'.
		// It might have been set to 'failed' above if CreatePlaybackInfo failed.
		// If it's still 'processing', update to 'failed'.
		currentStatus, _ := w.redisRepo.GetStatus(ctx, job.VideoID, VideoJobsQueue) // Ignoring error for simplicity here
		if currentStatus != "failed" {
			if statusUpdateErr := w.redisRepo.UpdateStatus(ctx, job.VideoID, VideoJobsQueue, "failed"); statusUpdateErr != nil {
				w.logger.Errorf("CRITICAL: Failed to update Redis job status to 'failed' for video %s (job %s) after PostgreSQL update errors: %v. Original PG error: %s", job.VideoID, job.JobID, statusUpdateErr, finalError)
			}
		}
	}

	if finalError != nil {
		return finalError // Return the collected error(s)
	}

	w.logger.Infof("Worker %d successfully processed job: %s", workerID, job.JobID)
	return nil
}
