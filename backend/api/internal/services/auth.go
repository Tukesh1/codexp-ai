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
	"golang.org/x/crypto/bcrypt"
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
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(30 * 24 * time.Hour)),
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

func (s *AuthService) issueAuth(user *models.User) (*models.AuthResponse, error) {
	user, err := s.GetUser(user.ID)
	if err != nil {
		return nil, err
	}
	token, err := s.GenerateToken(user.ID.String(), user.ClerkID)
	if err != nil {
		return nil, err
	}
	return &models.AuthResponse{Token: token, User: *user}, nil
}

func normalizeEmail(email string) string {
	return strings.TrimSpace(strings.ToLower(email))
}

func localClerkID(email string) string {
	return "local_" + strings.ReplaceAll(email, "@", "_at_")
}

func hashPassword(password string) (string, error) {
	b, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return "", err
	}
	return string(b), nil
}

func (s *AuthService) Signup(email, password, name string) (*models.AuthResponse, error) {
	email = normalizeEmail(email)
	name = strings.TrimSpace(name)
	if email == "" {
		return nil, fmt.Errorf("email is required")
	}
	if len(password) < 8 {
		return nil, fmt.Errorf("password must be at least 8 characters")
	}

	hash, err := hashPassword(password)
	if err != nil {
		return nil, fmt.Errorf("failed to hash password")
	}

	clerkID := localClerkID(email)

	var existingID uuid.UUID
	var existingHash sql.NullString
	err = s.db.QueryRow(`SELECT id, password_hash FROM users WHERE email = $1`, email).Scan(&existingID, &existingHash)
	if err == nil {
		if existingHash.Valid && strings.TrimSpace(existingHash.String) != "" {
			return nil, fmt.Errorf("an account with this email already exists — sign in instead")
		}
		// Legacy email-only account: set password and continue
		_, err = s.db.Exec(`
			UPDATE users
			SET password_hash = $1,
			    display_name = COALESCE(NULLIF($2, ''), display_name),
			    updated_at = CURRENT_TIMESTAMP
			WHERE id = $3
		`, hash, name, existingID)
		if err != nil {
			return nil, fmt.Errorf("failed to update account: %w", err)
		}
		user, err := s.GetUser(existingID)
		if err != nil {
			return nil, err
		}
		return s.issueAuth(user)
	}
	if err != sql.ErrNoRows {
		return nil, fmt.Errorf("failed to check email: %w", err)
	}

	user := &models.User{}
	err = s.db.QueryRow(`
		INSERT INTO users (clerk_id, email, plan, password_hash, display_name)
		VALUES ($1, $2, 'free', $3, NULLIF($4, ''))
		RETURNING id, clerk_id, email, plan, created_at, updated_at
	`, clerkID, email, hash, name).Scan(&user.ID, &user.ClerkID, &user.Email, &user.Plan, &user.CreatedAt, &user.UpdatedAt)
	if err != nil {
		if strings.Contains(err.Error(), "duplicate") || strings.Contains(err.Error(), "unique") {
			return nil, fmt.Errorf("an account with this email already exists — sign in instead")
		}
		return nil, fmt.Errorf("failed to create account: %w", err)
	}
	user.DisplayName = name
	return s.issueAuth(user)
}

func (s *AuthService) Login(email, password string) (*models.AuthResponse, error) {
	email = normalizeEmail(email)
	if email == "" || password == "" {
		return nil, fmt.Errorf("email and password are required")
	}

	var id uuid.UUID
	var hash sql.NullString
	err := s.db.QueryRow(`SELECT id, password_hash FROM users WHERE email = $1`, email).Scan(&id, &hash)
	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("invalid email or password")
	}
	if err != nil {
		return nil, fmt.Errorf("failed to look up user: %w", err)
	}
	if !hash.Valid || strings.TrimSpace(hash.String) == "" {
		return nil, fmt.Errorf("this account has no password yet — use Sign up to set one")
	}
	if err := bcrypt.CompareHashAndPassword([]byte(hash.String), []byte(password)); err != nil {
		return nil, fmt.Errorf("invalid email or password")
	}

	user, err := s.GetUser(id)
	if err != nil {
		return nil, err
	}
	return s.issueAuth(user)
}

func (s *AuthService) DevLogin(email, name string) (*models.DevLoginResponse, error) {
	email = normalizeEmail(email)
	if email == "" {
		return nil, fmt.Errorf("email is required")
	}

	clerkID := "dev_" + strings.ReplaceAll(email, "@", "_at_")
	user, err := s.UpsertUserFromClerk(clerkID, email)
	if err != nil {
		return nil, err
	}

	if name = strings.TrimSpace(name); name != "" {
		_, _ = s.db.Exec(`UPDATE users SET display_name = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`, name, user.ID)
	}

	user, err = s.GetUser(user.ID)
	if err != nil {
		return nil, err
	}

	token, err := s.GenerateToken(user.ID.String(), user.ClerkID)
	if err != nil {
		return nil, err
	}

	return &models.DevLoginResponse{Token: token, User: *user}, nil
}

func (s *AuthService) GetUser(userID uuid.UUID) (*models.User, error) {
	user := &models.User{}
	var openaiKey, geminiKey sql.NullString
	var aiModel, provider, displayName sql.NullString
	err := s.db.QueryRow(`
		SELECT id, clerk_id, email, plan,
			COALESCE(ai_provider, 'openai'),
			COALESCE(ai_model, 'gpt-4o-mini'),
			openai_api_key, gemini_api_key,
			display_name,
			created_at, updated_at
		FROM users WHERE id = $1
	`, userID).Scan(
		&user.ID, &user.ClerkID, &user.Email, &user.Plan,
		&provider, &aiModel, &openaiKey, &geminiKey,
		&displayName,
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
	if displayName.Valid {
		user.DisplayName = displayName.String
	}
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
