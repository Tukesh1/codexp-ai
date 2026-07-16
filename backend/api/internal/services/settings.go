package services

import (
	"database/sql"
	"fmt"
	"strings"

	"github.com/Tukesh1/codexp-ai/backend/api/internal/models"
	"github.com/google/uuid"
)

type SettingsService struct {
	db *sql.DB
}

func NewSettingsService(db *sql.DB) *SettingsService {
	return &SettingsService{db: db}
}

func (s *SettingsService) GetSettings(userID uuid.UUID) (*models.UserSettings, error) {
	var email, plan string
	var aiModel, provider sql.NullString
	var openaiKey, geminiKey, githubToken sql.NullString

	err := s.db.QueryRow(`
		SELECT email, plan,
			COALESCE(ai_provider, 'openai'),
			COALESCE(ai_model, 'gpt-4o-mini'),
			openai_api_key,
			gemini_api_key,
			github_token
		FROM users WHERE id = $1
	`, userID).Scan(&email, &plan, &provider, &aiModel, &openaiKey, &geminiKey, &githubToken)
	if err != nil {
		return nil, fmt.Errorf("user not found")
	}

	settings := &models.UserSettings{
		Email:      email,
		Plan:       plan,
		AIProvider: provider.String,
		AIModel:    aiModel.String,
	}

	if openaiKey.Valid && strings.TrimSpace(openaiKey.String) != "" {
		settings.HasOpenAIKey = true
		settings.OpenAIKeyPreview = maskAPIKey(openaiKey.String)
	}
	if geminiKey.Valid && strings.TrimSpace(geminiKey.String) != "" {
		settings.HasGeminiKey = true
		settings.GeminiKeyPreview = maskAPIKey(geminiKey.String)
	}
	if githubToken.Valid && strings.TrimSpace(githubToken.String) != "" {
		settings.HasGitHubToken = true
		settings.GitHubTokenPreview = maskAPIKey(githubToken.String)
	}

	switch settings.AIProvider {
	case "gemini":
		settings.HasAPIKey = settings.HasGeminiKey
		settings.APIKeyPreview = settings.GeminiKeyPreview
	default:
		settings.HasAPIKey = settings.HasOpenAIKey
		settings.APIKeyPreview = settings.OpenAIKeyPreview
	}

	return settings, nil
}

func (s *SettingsService) UpdateSettings(userID uuid.UUID, req *models.UpdateSettingsRequest) (*models.UserSettings, error) {
	if req.AIProvider != nil {
		provider := strings.ToLower(strings.TrimSpace(*req.AIProvider))
		if provider != "openai" && provider != "gemini" {
			return nil, fmt.Errorf("ai_provider must be openai or gemini")
		}
		_, err := s.db.Exec(`UPDATE users SET ai_provider = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $1`, userID, provider)
		if err != nil {
			return nil, err
		}
	}

	if req.ClearOpenAI || req.ClearAPIKey {
		if req.ClearOpenAI {
			_, err := s.db.Exec(`UPDATE users SET openai_api_key = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = $1`, userID)
			if err != nil {
				return nil, err
			}
		} else if req.ClearAPIKey {
			settings, err := s.GetSettings(userID)
			if err != nil {
				return nil, err
			}
			col := "openai_api_key"
			if settings.AIProvider == "gemini" {
				col = "gemini_api_key"
			}
			_, err = s.db.Exec(fmt.Sprintf(`UPDATE users SET %s = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = $1`, col), userID)
			if err != nil {
				return nil, err
			}
		}
	}

	if req.ClearGemini {
		_, err := s.db.Exec(`UPDATE users SET gemini_api_key = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = $1`, userID)
		if err != nil {
			return nil, err
		}
	}

	if req.ClearGitHub {
		_, err := s.db.Exec(`UPDATE users SET github_token = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = $1`, userID)
		if err != nil {
			return nil, err
		}
	}

	if req.OpenAIAPIKey != nil {
		key := strings.TrimSpace(*req.OpenAIAPIKey)
		if key != "" {
			_, err := s.db.Exec(`UPDATE users SET openai_api_key = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $1`, userID, key)
			if err != nil {
				return nil, err
			}
		}
	}

	if req.GeminiAPIKey != nil {
		key := strings.TrimSpace(*req.GeminiAPIKey)
		if key != "" {
			_, err := s.db.Exec(`UPDATE users SET gemini_api_key = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $1`, userID, key)
			if err != nil {
				return nil, err
			}
		}
	}

	if req.GitHubToken != nil {
		key := strings.TrimSpace(*req.GitHubToken)
		if key != "" {
			_, err := s.db.Exec(`UPDATE users SET github_token = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $1`, userID, key)
			if err != nil {
				return nil, err
			}
		}
	}

	if req.AIModel != nil {
		model := strings.TrimSpace(*req.AIModel)
		if model == "" {
			model = "gpt-4o-mini"
		}
		_, err := s.db.Exec(`UPDATE users SET ai_model = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $1`, userID, model)
		if err != nil {
			return nil, err
		}
	}

	return s.GetSettings(userID)
}

// GetAPICredentials returns provider, api key, and model for the active provider.
func (s *SettingsService) GetAPICredentials(userID uuid.UUID) (provider, apiKey, model string, err error) {
	var p, m sql.NullString
	var openaiKey, geminiKey sql.NullString
	err = s.db.QueryRow(`
		SELECT COALESCE(ai_provider, 'openai'),
			COALESCE(ai_model, 'gpt-4o-mini'),
			openai_api_key,
			gemini_api_key
		FROM users WHERE id = $1
	`, userID).Scan(&p, &m, &openaiKey, &geminiKey)
	if err != nil {
		return "", "", "", err
	}

	provider = p.String
	model = m.String

	switch provider {
	case "gemini":
		if !geminiKey.Valid || strings.TrimSpace(geminiKey.String) == "" {
			return "", "", "", fmt.Errorf("gemini api key not configured")
		}
		if model == "" || strings.HasPrefix(model, "gpt-") {
			model = "gemini-2.0-flash"
		}
		return provider, strings.TrimSpace(geminiKey.String), model, nil
	default:
		if !openaiKey.Valid || strings.TrimSpace(openaiKey.String) == "" {
			return "", "", "", fmt.Errorf("openai api key not configured")
		}
		if model == "" || strings.HasPrefix(model, "gemini-") {
			model = "gpt-4o-mini"
		}
		return "openai", strings.TrimSpace(openaiKey.String), model, nil
	}
}

func (s *SettingsService) HasAPIKey(userID uuid.UUID) bool {
	_, _, _, err := s.GetAPICredentials(userID)
	return err == nil
}

// GetGitHubToken returns the user's saved GitHub personal access token, if any.
func (s *SettingsService) GetGitHubToken(userID uuid.UUID) (string, error) {
	var token sql.NullString
	err := s.db.QueryRow(`SELECT github_token FROM users WHERE id = $1`, userID).Scan(&token)
	if err != nil {
		return "", err
	}
	if !token.Valid {
		return "", nil
	}
	return strings.TrimSpace(token.String), nil
}

func maskAPIKey(key string) string {
	key = strings.TrimSpace(key)
	if len(key) <= 8 {
		return "••••••••"
	}
	return key[:3] + "••••••••" + key[len(key)-4:]
}
