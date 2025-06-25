package main

import (
	"context"
	"github.com/amankumarsingh77/cloud-video-encoder/internal/config"
	"github.com/amankumarsingh77/cloud-video-encoder/internal/videofiles/repository"
	"github.com/amankumarsingh77/cloud-video-encoder/internal/worker"
	"github.com/amankumarsingh77/cloud-video-encoder/pkg/db/aws"
	"github.com/amankumarsingh77/cloud-video-encoder/pkg/db/postgres"
	"github.com/amankumarsingh77/cloud-video-encoder/pkg/logger"
	"log"
	"path/filepath"
	"time"
)

func main() {
	// Load config
	cfgFile, err := config.LoadConfig("config.yml")
	if err != nil {
		log.Fatalf("Failed to load config: %v", err)
	}

	cfg, err := config.ParseConfig(cfgFile)
	if err != nil {
		log.Fatalf("Failed to parse config: %v", err)
	}

	// Init logger
	appLogger := logger.NewApiLogger(cfg)
	appLogger.InitLogger()

	// PostgreSQL
	psqlDB, err := postgres.NewPsqlDB(cfg)
	if err != nil {
		log.Fatalf("PostgreSQL init error: %s", err)
	}
	defer psqlDB.Close()

	// AWS S3
	awsClient, presignClient, err := aws.NewAWSClient(
		cfg.S3.Endpoint,
		cfg.S3.Region,
		cfg.S3.AccessKey,
		cfg.S3.SecretKey,
	)
	if err != nil {
		log.Fatalf("AWS init error: %s", err)
	}

	// Initialize repositories
	awsRepo := repository.NewAwsRepository(awsClient, presignClient)
	videoRepo := repository.NewVideoRepo(psqlDB)

	// Initialize TranscriptionService
	language := "hi" // Or change to desired language
	transcriptionService := worker.NewTranscriptionService(awsRepo, language, appLogger, videoRepo)

	appLogger.Info("Transcription service initialized successfully")

	// Example usage (assuming you have a method like Transcribe on the service)
	ctx := context.Background()
	videoPath := "./cmd/demo_video.mp4"
	outPutKey := filepath.Join("demo_transcription")
	start := time.Now()
	err = transcriptionService.ProcessAudioForTranscription(ctx, videoPath, outPutKey)
	if err != nil {
		log.Fatalf("UploadChunks error: %v", err)
	}
	log.Printf("It took %v time to transcribe", time.Since(start))

}
