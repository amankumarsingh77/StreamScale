package services

import (
	"errors"

	"github.com/amankumarsingh77/streamscale_api/internal/models"
	"github.com/amankumarsingh77/streamscale_api/internal/repository"
	"github.com/amankumarsingh77/streamscale_api/internal/utils"
)

type AuthService interface {
	Login(username, password string) (string, error)
	Register(user *models.User) error
}

type authService struct {
	userRepo repository.UserRepository
}

func NewAuthService(userRepo repository.UserRepository) AuthService {
	return &authService{
		userRepo: userRepo,
	}
}

func (s *authService) Login(username, password string) (string, error) {
	user, err := s.userRepo.GetUserByUsername(username)
	if err != nil {
		return "", errors.New("user not found")
	}
	err = utils.VerifyPassword(password, user.Password)
	if err != nil {
		return "", errors.New("invalid credentials")
	}
	token, err := utils.GenerateAuthToken(user)
	if err != nil {
		return "", err
	}
	return token, nil
}

func (s *authService) Register(user *models.User) error {
	hashedPassword, err := utils.HashPassword(user.Password)
	if err != nil {
		return err
	}
	user.Password = hashedPassword
	user.IsAllowed = false

	err = s.userRepo.CreateUser(user)
	if err != nil {
		return err
	}

	return nil
}
