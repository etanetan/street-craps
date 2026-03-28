package handlers

import (
	"encoding/json"
	"net/http"
	"strings"
	"time"

	"github.com/etanetan/street-craps/backend/internal/auth"
	"github.com/etanetan/street-craps/backend/internal/repository"
	"golang.org/x/crypto/bcrypt"
)

type AuthHandler struct {
	users *repository.UserRepo
	jwt   *auth.Service
}

func NewAuthHandler(users *repository.UserRepo, jwt *auth.Service) *AuthHandler {
	return &AuthHandler{users: users, jwt: jwt}
}

type registerRequest struct {
	Username string `json:"username"`
	Email    string `json:"email"`
	Password string `json:"password"`
}

type loginRequest struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

type authResponse struct {
	AccessToken string `json:"accessToken"`
	UserID      string `json:"userId"`
	Username    string `json:"username"`
}

func (h *AuthHandler) Register(w http.ResponseWriter, r *http.Request) {
	var req registerRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid_request", "Invalid request body")
		return
	}
	req.Username = strings.TrimSpace(req.Username)
	req.Email = strings.TrimSpace(strings.ToLower(req.Email))
	if req.Username == "" || req.Password == "" {
		writeError(w, http.StatusBadRequest, "missing_fields", "Username and password required")
		return
	}

	existing, _ := h.users.GetByUsername(r.Context(), req.Username)
	if existing != nil {
		writeError(w, http.StatusConflict, "username_taken", "Username already taken")
		return
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "server_error", "Failed to hash password")
		return
	}

	user, err := h.users.Create(r.Context(), req.Username, req.Email, string(hash))
	if err != nil {
		writeError(w, http.StatusInternalServerError, "server_error", "Failed to create user")
		return
	}

	accessToken, err := h.jwt.SignAccess(user.ID, user.Username)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "server_error", "Failed to sign token")
		return
	}

	refreshToken, _ := h.jwt.SignRefresh(user.ID)
	setRefreshCookie(w, refreshToken)

	writeJSON(w, http.StatusCreated, authResponse{
		AccessToken: accessToken,
		UserID:      user.ID,
		Username:    user.Username,
	})
}

func (h *AuthHandler) Login(w http.ResponseWriter, r *http.Request) {
	var req loginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid_request", "Invalid request body")
		return
	}

	user, err := h.users.GetByUsername(r.Context(), req.Username)
	if err != nil || user == nil {
		writeError(w, http.StatusUnauthorized, "invalid_credentials", "Invalid username or password")
		return
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password)); err != nil {
		writeError(w, http.StatusUnauthorized, "invalid_credentials", "Invalid username or password")
		return
	}

	accessToken, err := h.jwt.SignAccess(user.ID, user.Username)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "server_error", "Failed to sign token")
		return
	}

	refreshToken, _ := h.jwt.SignRefresh(user.ID)
	setRefreshCookie(w, refreshToken)

	writeJSON(w, http.StatusOK, authResponse{
		AccessToken: accessToken,
		UserID:      user.ID,
		Username:    user.Username,
	})
}

func (h *AuthHandler) Refresh(w http.ResponseWriter, r *http.Request) {
	cookie, err := r.Cookie("refresh_token")
	if err != nil {
		writeError(w, http.StatusUnauthorized, "no_refresh_token", "No refresh token")
		return
	}

	claims, err := h.jwt.VerifyRefresh(cookie.Value)
	if err != nil {
		writeError(w, http.StatusUnauthorized, "invalid_refresh_token", "Invalid refresh token")
		return
	}

	user, err := h.users.GetByID(r.Context(), claims.UserID)
	if err != nil || user == nil {
		writeError(w, http.StatusUnauthorized, "user_not_found", "User not found")
		return
	}

	accessToken, err := h.jwt.SignAccess(user.ID, user.Username)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "server_error", "Failed to sign token")
		return
	}

	writeJSON(w, http.StatusOK, authResponse{
		AccessToken: accessToken,
		UserID:      user.ID,
		Username:    user.Username,
	})
}

func (h *AuthHandler) Logout(w http.ResponseWriter, r *http.Request) {
	http.SetCookie(w, &http.Cookie{
		Name:     "refresh_token",
		Value:    "",
		Path:     "/",
		MaxAge:   -1,
		HttpOnly: true,
		Secure:   true,
		SameSite: http.SameSiteNoneMode,
	})
	w.WriteHeader(http.StatusNoContent)
}

func setRefreshCookie(w http.ResponseWriter, token string) {
	http.SetCookie(w, &http.Cookie{
		Name:     "refresh_token",
		Value:    token,
		Path:     "/",
		Expires:  time.Now().Add(7 * 24 * time.Hour),
		HttpOnly: true,
		Secure:   true,
		SameSite: http.SameSiteNoneMode,
	})
}
