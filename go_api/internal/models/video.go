package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type Video struct {
	ID          string             `bson:"_id,omitempty" json:"id,omitempty"`
	Title       string             `bson:"title" json:"title" validate:"required,min=3,max=20"`
	Url         string             `bson:"url" json:"url" validate:"min=3,max=20"`
	Size        int64              `bson:"size" json:"size" validate:"required,min=3,max=20"`
	Path        string             `bson:"path" json:"path" validate:"required,min=3,max=20"`
	Type        string             `bson:"type" json:"type" validate:"required,min=3,max=20"`
	UploadId    string             `bson:"upload_id" json:"upload_id" validate:"required,min=3,max=20"`
	Progress    int                `bson:"progress" json:"progress" validate:"min=3,max=20"`
	IsPublic    bool               `bson:"is_public" json:"is_public"`
	Category    string             `bson:"category" json:"category" validate:"required,min=3,max=20"`
	HLSUrl      string             `bson:"hls_url" json:"hls_url"`
	Tags        []string           `bson:"tags" json:"tags"`
	Views       int                `bson:"views" json:"views"`
	User        primitive.ObjectID `bson:"user,omitempty" json:"user" validate:"required"`
	Description string             `bson:"description" json:"description" validate:"required,min=3,max=20"`
	Thumbnail   string             `bson:"thumbnail" json:"thumbnail"`
	Video       string             `bson:"video" json:"video" validate:"required,min=3,max=20"`
	CreatedAt   time.Time          `bson:"created_at" json:"created_at"`
	UpdatedAt   time.Time          `bson:"updated_at" json:"updated_at"`
}
