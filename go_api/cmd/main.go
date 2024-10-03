package main

import (
	"github.com/amankumarsingh77/streamscale_api/internal/api"
	"github.com/amankumarsingh77/streamscale_api/internal/config"
	"github.com/amankumarsingh77/streamscale_api/internal/database"
	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
)

func main() {
	err := godotenv.Load()
	if err != nil {
		panic(err)
	}

	router := gin.Default()
	cfg, err := config.Load()
	if err != nil {
		panic(err)
	}

	client, err := database.ConnectToDB(cfg.MongoURI)
	if err != nil {
		panic(err)
	}

	db := client.Database(cfg.DBName)

	api.SetupRoutes(router, db)

	port := ":" + cfg.Port
	if err := router.Run(port); err != nil {
		panic(err)
	}
}
