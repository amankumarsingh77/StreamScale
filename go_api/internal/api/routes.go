package api

import (
	"github.com/amankumarsingh77/streamscale_api/internal/api/handlers"
	"github.com/amankumarsingh77/streamscale_api/internal/repository"
	"github.com/amankumarsingh77/streamscale_api/internal/services"
	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/mongo"
)

func SetupRoutes(router *gin.Engine, db *mongo.Database) {
	repo := repository.CreateUserRepository(db)
	svc := services.NewAuthService(repo)
	h := handlers.NewAuthHandler(svc)

	v1 := router.Group("/v1/api")

	v1.POST("/auth/register", h.SignUp)
	v1.POST("/auth/login", h.Login)
}
