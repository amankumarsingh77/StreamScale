package repository

import (
	"context"
	"errors"
	"time"

	"github.com/amankumarsingh77/streamscale_api/internal/models"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

type VideoRepository interface {
	CreateVideo(video *models.Video) error
	GetVideoByID(id string) (*models.Video, error)
	GetVideoByUserID(id string, page int, limit int) ([]*models.Video, error)
	UpdateVideo(video *models.Video) error
	GetHLSUrl(id string) (string, error)
	DeleteVideo(id string) error
}

type videoRepository struct {
	collection *mongo.Collection
}

func CreateVideoRepository(db *mongo.Database) VideoRepository {
	return &videoRepository{
		collection: db.Collection("videos"),
	}
}

func (vr *videoRepository) CreateVideo(video *models.Video) error {
	video.CreatedAt = time.Now()
	video.UpdatedAt = time.Now()

	_, err := vr.collection.InsertOne(context.Background(), video)
	if err != nil {
		return err
	}
	return nil
}

func (vr *videoRepository) GetVideoByID(id string) (*models.Video, error) {
	var video *models.Video
	err := vr.collection.FindOne(context.Background(), bson.M{"_id": id}).Decode(&video)
	if err != nil {
		return nil, err
	}
	if video == nil {
		return nil, errors.New("video not found")
	}
	return video, nil
}

func (vr *videoRepository) GetVideoByUserID(id string, page int, limit int) ([]*models.Video, error) {
	skip := (page - 1) * limit
	filter := bson.M{"user_id": id}
	cursor, err := vr.collection.Find(context.Background(), filter, options.Find().SetSkip(int64(skip)).SetLimit(int64(limit)))
	if err != nil {
		return nil, err
	}
	defer cursor.Close(context.Background())

	var videos []*models.Video
	for cursor.Next(context.Background()) {
		var video *models.Video
		if err := cursor.Decode(&video); err != nil {
			return nil, err
		}
		videos = append(videos, video)
	}
	if err := cursor.Err(); err != nil {
		return nil, err
	}
	return videos, nil
}

func (vr *videoRepository) UpdateVideo(video *models.Video) error {
	res, err := vr.collection.UpdateByID(context.Background(), video.ID, video)
	if err != nil {
		return err
	}
	if res.ModifiedCount == 0 {
		return errors.New("could not update the video")
	}
	return nil
}

func (vr *videoRepository) GetHLSUrl(id string) (string, error) {
	video, err := vr.GetVideoByID(id)
	if err != nil {
		return "", err
	}
	return video.HLSUrl, nil
}

func (vr *videoRepository) DeleteVideo(id string) error {
	res, err := vr.collection.DeleteOne(context.Background(), bson.M{"_id": id})
	if err != nil {
		return err
	}
	if res.DeletedCount == 0 {
		return errors.New("could not delete the video")
	}
	return nil
}
