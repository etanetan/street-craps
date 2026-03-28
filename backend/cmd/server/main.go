package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/etanetan/street-craps/backend/internal/auth"
	"github.com/etanetan/street-craps/backend/internal/game"
	"github.com/etanetan/street-craps/backend/internal/handlers"
	"github.com/etanetan/street-craps/backend/internal/hub"
	"github.com/etanetan/street-craps/backend/internal/repository"
)

func main() {
	ctx := context.Background()

	// Config from env
	port := getEnv("PORT", "8080")
	projectID := getEnv("FIRESTORE_PROJECT_ID", "")
	credFile := getEnv("GOOGLE_APPLICATION_CREDENTIALS", "")
	accessSecret := getEnv("JWT_ACCESS_SECRET", "change-me-access-secret")
	refreshSecret := getEnv("JWT_REFRESH_SECRET", "change-me-refresh-secret")
	allowedOrigins := strings.Split(getEnv("ALLOWED_ORIGINS", "http://localhost:5173"), ",")

	// Services
	jwtService := auth.NewService(accessSecret, refreshSecret)
	gameManager := game.NewManager()

	// Firestore (optional for local dev without GCP)
	var userRepo *repository.UserRepo
	var gameRepo *repository.GameRepo
	if projectID != "" {
		fsClient, err := repository.NewFirestoreClient(ctx, projectID, credFile)
		if err != nil {
			log.Fatalf("firestore init: %v", err)
		}
		defer fsClient.Close()
		userRepo = repository.NewUserRepo(fsClient)
		gameRepo = repository.NewGameRepo(fsClient)
	} else {
		log.Println("WARNING: FIRESTORE_PROJECT_ID not set; running without persistence")
	}

	// WebSocket hub + handler (bidirectional)
	var wsHandler *handlers.WSHandler
	wsHub := hub.New(func(c *hub.Client, raw []byte) {
		if wsHandler != nil {
			wsHandler.OnMessage(c, raw)
		}
	})
	wsHandler = handlers.NewWSHandler(wsHub, gameManager, gameRepo, userRepo, jwtService)

	// REST handlers
	authH := handlers.NewAuthHandler(userRepo, jwtService)
	gameH := handlers.NewGameHandler(gameRepo, userRepo, gameManager, jwtService, wsHub)

	// Router
	mux := http.NewServeMux()

	// Health
	mux.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("ok"))
	})

	// Auth
	mux.HandleFunc("/api/auth/register", authH.Register)
	mux.HandleFunc("/api/auth/login", authH.Login)
	mux.HandleFunc("/api/auth/refresh", authH.Refresh)
	mux.HandleFunc("/api/auth/logout", authH.Logout)

	// Games
	mux.Handle("/api/games", jwtService.Optional(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodPost {
			gameH.CreateGame(w, r)
		} else {
			http.NotFound(w, r)
		}
	})))
	mux.Handle("/api/games/", jwtService.Optional(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		path := strings.TrimPrefix(r.URL.Path, "/api/games/")
		if strings.HasSuffix(path, "/join") && r.Method == http.MethodPost {
			gameH.JoinGame(w, r)
		} else if r.Method == http.MethodGet {
			gameH.GetGame(w, r)
		} else {
			http.NotFound(w, r)
		}
	})))

	// Stats
	mux.Handle("/api/users/", jwtService.Middleware(http.HandlerFunc(gameH.GetStats)))

	// WebSocket
	mux.HandleFunc("/ws/", wsHandler.ServeHTTP)

	// CORS middleware
	handler := corsMiddleware(allowedOrigins, mux)

	srv := &http.Server{
		Addr:         ":" + port,
		Handler:      handler,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	log.Printf("Street Craps backend listening on :%s", port)
	if err := srv.ListenAndServe(); err != nil {
		log.Fatalf("server error: %v", err)
	}
}

func corsMiddleware(allowedOrigins []string, next http.Handler) http.Handler {
	originSet := make(map[string]bool, len(allowedOrigins))
	for _, o := range allowedOrigins {
		originSet[strings.TrimSpace(o)] = true
	}

	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		origin := r.Header.Get("Origin")
		if originSet[origin] {
			w.Header().Set("Access-Control-Allow-Origin", origin)
			w.Header().Set("Access-Control-Allow-Credentials", "true")
			w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
			w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		}
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
