package utils

import (
	"time"

	"github.com/amankumarsingh77/streamscale_api/internal/models"
	"github.com/golang-jwt/jwt/v5"
)

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
