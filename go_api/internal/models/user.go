package models

import (
	"time"
)

type User struct {
	ID             string    `bson:"_id,omitempty" json:"id,omitempty"`
	Username       string    `bson:"username" json:"username" validate:"required,min=3,max=20"`
	FullName       string    `bson:"fullname" json:"fullname" validate:"required,min=4,max=20"`
	ProfilePicture string    `bson:"profile_picture" json:"profile_picture"`
	IsAllowed      bool      `bson:"is_allowed" json:"is_allowed"`
	Videos         []Video   `bson:"videos" json:"videos"`
	Email          string    `bson:"email" json:"email" validate:"required,email"`
	Password       string    `bson:"password" json:"password" validate:"required,min=8"`
	CreatedAt      time.Time `bson:"created_at" json:"created_at"`
	UpdatedAt      time.Time `bson:"updated_at" json:"updated_at"`
}
