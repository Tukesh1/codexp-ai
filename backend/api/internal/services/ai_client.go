package services

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"
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

func (c *AIClient) Ask(projectID, question string) (map[string]interface{}, error) {
	body := map[string]interface{}{
		"project_id": projectID,
		"question":   question,
		"limit":      8,
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
