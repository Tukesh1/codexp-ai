package services

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/Tukesh1/codexp-ai/backend/api/internal/models"
)

type AIClient struct {
	baseURL    string
	httpClient *http.Client
}

func NewAIClient(baseURL string) *AIClient {
	return &AIClient{
		baseURL: baseURL,
		httpClient: &http.Client{
			Timeout: 180 * time.Second,
		},
	}
}

func (c *AIClient) Ask(projectID, question string, ctx *models.AskCodeContext) (map[string]interface{}, error) {
	return c.AskWithOptions(projectID, question, ctx, nil, "")
}

func (c *AIClient) AskWithOptions(projectID, question string, ctx *models.AskCodeContext, files []models.AskCodeContext, lens string) (map[string]interface{}, error) {
	body := map[string]interface{}{
		"project_id": projectID,
		"question":   question,
		"limit":      8,
	}
	if lens != "" {
		body["lens"] = lens
	}
	if ctx != nil && strings.TrimSpace(ctx.Code) != "" {
		body["selection"] = map[string]interface{}{
			"path":       ctx.Path,
			"code":       ctx.Code,
			"language":   ctx.Language,
			"start_line": ctx.StartLine,
			"end_line":   ctx.EndLine,
		}
	}
	if len(files) > 0 {
		payload := make([]map[string]interface{}, 0, len(files))
		for _, f := range files {
			if strings.TrimSpace(f.Code) == "" {
				continue
			}
			payload = append(payload, map[string]interface{}{
				"path":       f.Path,
				"code":       f.Code,
				"language":   f.Language,
				"start_line": f.StartLine,
				"end_line":   f.EndLine,
			})
		}
		if len(payload) > 0 {
			body["files"] = payload
		}
	}
	return c.postJSON("/api/v1/ask", body)
}

func (c *AIClient) GenerateDocs(projectID string, force bool) (map[string]interface{}, error) {
	body := map[string]interface{}{
		"project_id": projectID,
		"force":      force,
	}
	return c.postJSON("/api/v1/docs/generate", body)
}

func (c *AIClient) postJSON(path string, payload interface{}) (map[string]interface{}, error) {
	b, err := json.Marshal(payload)
	if err != nil {
		return nil, err
	}
	req, err := http.NewRequest(http.MethodPost, c.baseURL+path, bytes.NewReader(b))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("AI service unreachable: %w", err)
	}
	defer resp.Body.Close()

	raw, _ := io.ReadAll(resp.Body)
	if resp.StatusCode >= 400 {
		return nil, fmt.Errorf("AI service error (%d): %s", resp.StatusCode, string(raw))
	}

	var out map[string]interface{}
	if err := json.Unmarshal(raw, &out); err != nil {
		return nil, err
	}
	return out, nil
}
