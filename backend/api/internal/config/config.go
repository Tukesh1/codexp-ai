package config

import (
	"os"
)

type Config struct {
	Environment         string
	DatabaseURL         string
	RedisURL            string
	JWTSecret           string
	ClerkSecretKey      string
	GitHubAppID         string
	GitHubPrivateKey    string
	GitHubWebhookSecret string
	HuggingFaceAPIKey   string
	S3Bucket            string
	S3AccessKey         string
	S3SecretKey         string
	S3Region            string
	StripeSecretKey     string
	StripeWebhookSecret string
	SentryDSN           string
}

func Load() *Config {
	return &Config{
		Environment:         getEnv("GO_ENV", "development"),
		DatabaseURL:         getEnv("DATABASE_URL", "postgresql://codeexp:secure_password@localhost:5432/codeexp"),
		RedisURL:            getEnv("REDIS_URL", "redis://localhost:6379"),
		JWTSecret:           getEnv("JWT_SECRET", "your-jwt-secret"),
		ClerkSecretKey:      getEnv("CLERK_SECRET_KEY", ""),
		GitHubAppID:         getEnv("GITHUB_APP_ID", ""),
		GitHubPrivateKey:    getEnv("GITHUB_APP_PRIVATE_KEY", ""),
		GitHubWebhookSecret: getEnv("GITHUB_WEBHOOK_SECRET", ""),
		HuggingFaceAPIKey:   getEnv("HUGGINGFACE_API_KEY", ""),
		S3Bucket:            getEnv("S3_BUCKET", "codeexp-storage"),
		S3AccessKey:         getEnv("S3_ACCESS_KEY", ""),
		S3SecretKey:         getEnv("S3_SECRET_KEY", ""),
		S3Region:            getEnv("S3_REGION", "us-east-1"),
		StripeSecretKey:     getEnv("STRIPE_SECRET_KEY", ""),
		StripeWebhookSecret: getEnv("STRIPE_WEBHOOK_SECRET", ""),
		SentryDSN:           getEnv("SENTRY_DSN", ""),
	}
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}
