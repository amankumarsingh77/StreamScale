package main

import (
	"context"
	"fmt"
	"log"

	"github.com/joho/godotenv"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
	"go.mongodb.org/mongo-driver/mongo/readpref"
)

type File struct {
	Name   string `json:"name"`
	Path   string `json:"path"`
	Status string `json:"status"`
	Views  int    `json:"views"`
}

var Client *mongo.Client

// ConnectMongoDB connects to the MongoDB database
func ConnectMongoDB(uri string) {
	godotenv.Load()
	clientOptions := options.Client().ApplyURI(uri)

	var err error
	Client, err = mongo.Connect(context.TODO(), clientOptions)
	if err != nil {
		log.Fatal(err)
	}

	err = Client.Ping(context.TODO(), readpref.Primary())
	if err != nil {
		log.Fatal(err)
	}

	fmt.Println("Connected to MongoDB!")
}

func UpdateViews(path string) (int64, error) {
	collection := Client.Database("video-transcoder").Collection("files")
	filter := bson.D{{Key: "path", Value: path}}
	update := bson.D{
		{Key: "$inc", Value: bson.D{{Key: "views", Value: 1}}},
	}
	updateResult, err := collection.UpdateOne(context.TODO(), filter, update, options.Update().SetUpsert(true))
	if err != nil {
		return 0, err
	}

	return updateResult.ModifiedCount, nil
}
