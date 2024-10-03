package repository

import (
	"context"
	"errors"
	"time"

	"github.com/amankumarsingh77/streamscale_api/internal/models"
	"github.com/golang-jwt/jwt/v5"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
)

type UserRepository interface {
	CreateUser(user *models.User) error
	GetUserByUsername(username string) (*models.User, error)
	GetUserById(id string) (*models.User, error)
	UpdateUser(user *models.User) error
	IsAllowedToUpload(username string) (bool, error)
}

type mongoUserRepository struct {
	collection *mongo.Collection
}

func CreateUserRepository(db *mongo.Database) UserRepository {
	return &mongoUserRepository{
		collection: db.Collection("users"),
	}
}

func (ur *mongoUserRepository) CreateUser(user *models.User) error {
	var existingUser models.User
	err := ur.collection.FindOne(context.Background(), bson.M{"username": user.Username}).Decode(&existingUser)
	if err == nil {
		return errors.New("user already exists")
	}
	if err != mongo.ErrNoDocuments {
		return errors.New("error occurred while checking for existing user: " + err.Error())
	}

	user.CreatedAt = time.Now()
	user.UpdatedAt = time.Now()

	_, err = ur.collection.InsertOne(context.Background(), user)
	if err != nil {
		return err
	}
	return nil
}

func (ur *mongoUserRepository) GetUserByUsername(username string) (*models.User, error) {
	var user *models.User
	err := ur.collection.FindOne(context.Background(), bson.M{"username": username}).Decode(&user)
	if err != nil {
		return nil, err
	}
	return user, nil
}

func (ur *mongoUserRepository) GetUserById(id string) (*models.User, error) {
	var user *models.User
	err := ur.collection.FindOne(context.Background(), bson.M{"_id": id}).Decode(&user)
	if err != nil {
		return nil, err
	}
	return user, nil
}

func GenerateAuthToken(user *models.User) (string, error) {
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"usr": user.ID,
		"exp": time.Now().Add(time.Hour * 24).Unix(),
		"iat": time.Now().Unix(),
	})

	tokenString, err := token.SignedString([]byte("secret"))
	if err != nil {
		return "", err
	}
	return tokenString, nil
}

func (ur *mongoUserRepository) UpdateUser(user *models.User) error {
	user.UpdatedAt = time.Now()
	_, err := ur.collection.UpdateOne(context.Background(), bson.M{"_id": user.ID}, bson.M{"$set": user})
	if err != nil {
		return err
	}
	return nil
}

func (ur *mongoUserRepository) IsAllowedToUpload(id string) (bool, error) {
	user, err := ur.GetUserById(id)
	if err != nil {
		return false, err
	}
	return user.IsAllowed, nil
}
