package handlers

import (
	"net/http"

	"github.com/amankumarsingh77/streamscale_api/internal/models"
	"github.com/amankumarsingh77/streamscale_api/internal/services"
	"github.com/gin-gonic/gin"
)

type AuthHandler struct {
	authService services.AuthService
}

func NewAuthHandler(authService services.AuthService) *AuthHandler {
	return &AuthHandler{
		authService: authService,
	}
}

func (h *AuthHandler) Login(ctx *gin.Context) {
	var loginReq struct {
		Username string `json:"username" binding:"required"`
		Password string `json:"password" binding:"required"`
	}

	if err := ctx.ShouldBindJSON(&loginReq); err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	token, err := h.authService.Login(loginReq.Username, loginReq.Password)
	if err != nil {
		ctx.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
	}

	ctx.JSON(http.StatusOK, gin.H{"token": token})
}

func (h *AuthHandler) SignUp(ctx *gin.Context) {
	var signUpReq struct {
		Username string `json:"username" binding:"required"`
		Password string `json:"password" binding:"required"`
		FullName string `json:"fullname" binding:"required"`
		Email    string `json:"email" binding:"required"`
	}
	if err := ctx.ShouldBindJSON(&signUpReq); err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	user := &models.User{
		Username:  signUpReq.Username,
		Password:  signUpReq.Password,
		Email:     signUpReq.Email,
		IsAllowed: false,
		FullName:  signUpReq.FullName,
	}
	err := h.authService.Register(user)
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	ctx.JSON(http.StatusOK, gin.H{"message": "User registered successfully"})
}
