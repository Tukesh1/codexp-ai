package services

import (
	"errors"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

type AuthService struct {
	jwtSecret      string
	clerkSecretKey string
}

type Claims struct {
	UserID  string `json:"user_id"`
	ClerkID string `json:"clerk_id"`
	jwt.RegisteredClaims
}

func NewAuthService(jwtSecret, clerkSecretKey string) *AuthService {
	return &AuthService{
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
	// TODO: Implement Clerk webhook signature validation
	// This is a placeholder - implement proper webhook validation
	return nil
}
