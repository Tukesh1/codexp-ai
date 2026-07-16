package services

import (
	"database/sql"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/Tukesh1/codexp-ai/backend/api/internal/models"
	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
)

type AuthService struct {
	db             *sql.DB
	jwtSecret      string
	clerkSecretKey string
}

type Claims struct {
	UserID  string `json:"user_id"`
	ClerkID string `json:"clerk_id"`
	jwt.RegisteredClaims
}

func NewAuthService(db *sql.DB, jwtSecret, clerkSecretKey string) *AuthService {
	return &AuthService{
		db:             db,
		jwtSecret:      jwtSecret,
		clerkSecretKey: clerkSecretKey,
	}
}

func (s *AuthService) GenerateToken(userID, clerkID string) (string, error) {
	claims := &Claims{
		UserID:  userID,
		ClerkID: clerkID,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(24 * time.Hour)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			NotBefore: jwt.NewNumericDate(time.Now()),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(s.jwtSecret))
}

func (s *AuthService) ValidateToken(tokenString string) (string, error) {
	token, err := jwt.ParseWithClaims(tokenString, &Claims{}, func(token *jwt.Token) (interface{}, error) {
		return []byte(s.jwtSecret), nil
	})

	if err != nil {
		return "", err
	}

	if claims, ok := token.Claims.(*Claims); ok && token.Valid {
		return claims.UserID, nil
	}

	return "", errors.New("invalid token")
}

func (s *AuthService) ValidateClerkWebhook(payload []byte, signature string) error {
	// Production: validate Svix signature with clerkSecretKey
	_ = payload
	_ = signature
	return nil
}

func (s *AuthService) UpsertUserFromClerk(clerkID, email string) (*models.User, error) {
	user := &models.User{}
	err := s.db.QueryRow(`
		INSERT INTO users (clerk_id, email, plan)
		VALUES ($1, $2, 'free')
		ON CONFLICT (clerk_id) DO UPDATE SET email = EXCLUDED.email, updated_at = CURRENT_TIMESTAMP
		RETURNING id, clerk_id, email, plan, created_at, updated_at
	`, clerkID, email).Scan(&user.ID, &user.ClerkID, &user.Email, &user.Plan, &user.CreatedAt, &user.UpdatedAt)
	if err != nil {
		return nil, fmt.Errorf("failed to upsert user: %w", err)
	}
	return user, nil
}

func (s *AuthService) DevLogin(email, name string) (*models.DevLoginResponse, error) {
	email = strings.TrimSpace(strings.ToLower(email))
	if email == "" {
		return nil, fmt.Errorf("email is required")
	}

	clerkID := "dev_" + strings.ReplaceAll(email, "@", "_at_")
	user, err := s.UpsertUserFromClerk(clerkID, email)
	if err != nil {
		return nil, err
	}

	// Reload for HasAPIKey / AIModel fields
	user, err = s.GetUser(user.ID)
	if err != nil {
		return nil, err
	}

	token, err := s.GenerateToken(user.ID.String(), user.ClerkID)
	if err != nil {
		return nil, err
	}

	_ = name
	return &models.DevLoginResponse{Token: token, User: *user}, nil
}

func (s *AuthService) GetUser(userID uuid.UUID) (*models.User, error) {
	user := &models.User{}
	var openaiKey, geminiKey sql.NullString
	var aiModel, provider sql.NullString
	err := s.db.QueryRow(`
		SELECT id, clerk_id, email, plan,
			COALESCE(ai_provider, 'openai'),
			COALESCE(ai_model, 'gpt-4o-mini'),
			openai_api_key, gemini_api_key,
			created_at, updated_at
		FROM users WHERE id = $1
	`, userID).Scan(
		&user.ID, &user.ClerkID, &user.Email, &user.Plan,
		&provider, &aiModel, &openaiKey, &geminiKey,
		&user.CreatedAt, &user.UpdatedAt,
	)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("user not found")
		}
		return nil, err
	}
	user.AIProvider = provider.String
	user.AIModel = aiModel.String
	hasOpenAI := openaiKey.Valid && strings.TrimSpace(openaiKey.String) != ""
	hasGemini := geminiKey.Valid && strings.TrimSpace(geminiKey.String) != ""
	if user.AIProvider == "gemini" {
		user.HasAPIKey = hasGemini
	} else {
		user.HasAPIKey = hasOpenAI
	}
	return user, nil
}

func (s *AuthService) HandleClerkEvent(eventType string, data map[string]interface{}) error {
	switch eventType {
	case "user.created", "user.updated":
		clerkID, _ := data["id"].(string)
		email := ""
		if emails, ok := data["email_addresses"].([]interface{}); ok && len(emails) > 0 {
			if first, ok := emails[0].(map[string]interface{}); ok {
				email, _ = first["email_address"].(string)
			}
		}
		if clerkID == "" || email == "" {
			return fmt.Errorf("missing clerk user fields")
		}
		_, err := s.UpsertUserFromClerk(clerkID, email)
		return err
	case "user.deleted":
		clerkID, _ := data["id"].(string)
		if clerkID == "" {
			return nil
		}
		_, err := s.db.Exec(`DELETE FROM users WHERE clerk_id = $1`, clerkID)
		return err
	default:
		return nil
	}
}
