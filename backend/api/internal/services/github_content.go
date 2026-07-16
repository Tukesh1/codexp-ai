package services

import (
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"regexp"
	"strconv"
	"strings"
	"time"

	"github.com/google/uuid"
)

var githubRepoPattern = regexp.MustCompile(`(?i)github\.com[:/]([^/]+)/([^/.]+)(?:\.git)?/?$`)

// ParseGitHubRepo extracts owner/repo from common GitHub URL forms.
func ParseGitHubRepo(repoURL string) (owner, repo string, ok bool) {
	repoURL = strings.TrimSpace(repoURL)
	if repoURL == "" {
		return "", "", false
	}
	if m := githubRepoPattern.FindStringSubmatch(repoURL); len(m) == 3 {
		return m[1], m[2], true
	}
	u, err := url.Parse(repoURL)
	if err != nil {
		return "", "", false
	}
	if !strings.Contains(strings.ToLower(u.Host), "github.com") {
		return "", "", false
	}
	parts := strings.Split(strings.Trim(u.Path, "/"), "/")
	if len(parts) >= 2 {
		return parts[0], strings.TrimSuffix(parts[1], ".git"), true
	}
	return "", "", false
}

func (s *ProjectService) resolveGitHubToken(userID uuid.UUID) string {
	if s.settings != nil {
		if tok, err := s.settings.GetGitHubToken(userID); err == nil && tok != "" {
			return tok
		}
	}
	return s.githubToken
}

func (s *ProjectService) applyGitHubAuth(req *http.Request, token string) {
	req.Header.Set("Accept", "application/vnd.github+json")
	req.Header.Set("User-Agent", "CodeExp-AI")
	req.Header.Set("X-GitHub-Api-Version", "2022-11-28")
	if token != "" {
		req.Header.Set("Authorization", "Bearer "+token)
	}
}

func githubAPIError(status int, body []byte, resp *http.Response) error {
	msg := strings.TrimSpace(string(body))
	if len(msg) > 180 {
		msg = msg[:180] + "…"
	}
	remaining := resp.Header.Get("X-RateLimit-Remaining")
	reset := resp.Header.Get("X-RateLimit-Reset")
	retryAfter := resp.Header.Get("Retry-After")

	if status == http.StatusForbidden || status == http.StatusTooManyRequests {
		hint := "GitHub rate limit hit"
		if remaining != "" {
			hint = fmt.Sprintf("GitHub rate limit exceeded (remaining=%s)", remaining)
		}
		if reset != "" {
			if ts, err := strconv.ParseInt(reset, 10, 64); err == nil {
				hint += fmt.Sprintf("; resets %s", time.Unix(ts, 0).Local().Format(time.Kitchen))
			}
		}
		if retryAfter != "" {
			hint += fmt.Sprintf("; retry after %ss", retryAfter)
		}
		hint += ". Add a GitHub token in Settings for higher limits, or Refresh this panel later."
		if msg != "" {
			return fmt.Errorf("%s — %s", hint, msg)
		}
		return fmt.Errorf("%s", hint)
	}
	if msg != "" {
		return fmt.Errorf("GitHub API error (%d): %s", status, msg)
	}
	return fmt.Errorf("GitHub API error (%d)", status)
}

func (s *ProjectService) githubGET(apiURL string, dest interface{}, token string) error {
	req, err := http.NewRequest(http.MethodGet, apiURL, nil)
	if err != nil {
		return err
	}
	s.applyGitHubAuth(req, token)
	client := &http.Client{Timeout: 20 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	body, err := io.ReadAll(io.LimitReader(resp.Body, 2<<20))
	if err != nil {
		return err
	}
	if resp.StatusCode != http.StatusOK {
		return githubAPIError(resp.StatusCode, body, resp)
	}
	return json.Unmarshal(body, dest)
}

func (s *ProjectService) fetchGitHubFileContent(repoURL, path, token string) (string, string, error) {
	owner, repo, ok := ParseGitHubRepo(repoURL)
	if !ok {
		return "", "", fmt.Errorf("unsupported repository URL — expected a GitHub repo")
	}
	path = strings.TrimPrefix(path, "/")
	escapedParts := make([]string, 0)
	for _, part := range strings.Split(path, "/") {
		if part == "" {
			continue
		}
		escapedParts = append(escapedParts, url.PathEscape(part))
	}
	apiURL := fmt.Sprintf("https://api.github.com/repos/%s/%s/contents/%s", owner, repo, strings.Join(escapedParts, "/"))

	var payload struct {
		Type     string `json:"type"`
		Encoding string `json:"encoding"`
		Content  string `json:"content"`
		HTMLURL  string `json:"html_url"`
		Size     int    `json:"size"`
	}
	if err := s.githubGET(apiURL, &payload, token); err != nil {
		return "", "", err
	}
	if payload.Type == "dir" {
		return "", "", fmt.Errorf("path is a directory")
	}
	if payload.Encoding != "base64" || payload.Content == "" {
		return "", "", fmt.Errorf("unsupported file encoding from GitHub")
	}
	decoded, err := base64.StdEncoding.DecodeString(strings.ReplaceAll(payload.Content, "\n", ""))
	if err != nil {
		return "", "", fmt.Errorf("failed to decode file content")
	}
	text := string(decoded)
	if strings.ContainsRune(text, 0) {
		return "", "", fmt.Errorf("binary files cannot be previewed")
	}
	return text, payload.HTMLURL, nil
}

func (s *ProjectService) fetchGitHubCommits(repoURL string, limit int, token string) ([]map[string]interface{}, error) {
	owner, repo, ok := ParseGitHubRepo(repoURL)
	if !ok {
		return nil, fmt.Errorf("unsupported repository URL")
	}
	if limit <= 0 || limit > 30 {
		limit = 20
	}
	var commits []struct {
		SHA     string `json:"sha"`
		HTMLURL string `json:"html_url"`
		Commit  struct {
			Message string `json:"message"`
			Author  struct {
				Name string    `json:"name"`
				Date time.Time `json:"date"`
			} `json:"author"`
		} `json:"commit"`
		Author *struct {
			Login     string `json:"login"`
			AvatarURL string `json:"avatar_url"`
		} `json:"author"`
	}
	urlStr := fmt.Sprintf("https://api.github.com/repos/%s/%s/commits?per_page=%d", owner, repo, limit)
	if err := s.githubGET(urlStr, &commits, token); err != nil {
		return nil, err
	}
	out := make([]map[string]interface{}, 0, len(commits))
	for _, c := range commits {
		item := map[string]interface{}{
			"sha":     c.SHA,
			"message": strings.SplitN(c.Commit.Message, "\n", 2)[0],
			"author":  c.Commit.Author.Name,
			"date":    c.Commit.Author.Date,
			"url":     c.HTMLURL,
		}
		if c.Author != nil {
			item["login"] = c.Author.Login
			item["avatar_url"] = c.Author.AvatarURL
		}
		out = append(out, item)
	}
	return out, nil
}

func (s *ProjectService) fetchGitHubRepoMeta(repoURL, token string) (map[string]interface{}, error) {
	owner, repo, ok := ParseGitHubRepo(repoURL)
	if !ok {
		return nil, fmt.Errorf("unsupported repository URL")
	}
	var payload struct {
		FullName         string   `json:"full_name"`
		Description      string   `json:"description"`
		DefaultBranch    string   `json:"default_branch"`
		StargazersCount  int      `json:"stargazers_count"`
		WatchersCount    int      `json:"watchers_count"`
		ForksCount       int      `json:"forks_count"`
		OpenIssuesCount  int      `json:"open_issues_count"`
		SubscribersCount int      `json:"subscribers_count"`
		NetworkCount     int      `json:"network_count"`
		Size             int      `json:"size"`
		Language         string   `json:"language"`
		Homepage         string   `json:"homepage"`
		Topics           []string `json:"topics"`
		License          *struct {
			SPDXID string `json:"spdx_id"`
			Name   string `json:"name"`
		} `json:"license"`
		CreatedAt   time.Time `json:"created_at"`
		UpdatedAt   time.Time `json:"updated_at"`
		PushedAt    time.Time `json:"pushed_at"`
		HTMLURL     string    `json:"html_url"`
		CloneURL    string    `json:"clone_url"`
		Private     bool      `json:"private"`
		Fork        bool      `json:"fork"`
		Archived    bool      `json:"archived"`
		HasWiki     bool      `json:"has_wiki"`
		HasIssues   bool      `json:"has_issues"`
		HasProjects bool      `json:"has_projects"`
		HasPages    bool      `json:"has_pages"`
		Visibility  string    `json:"visibility"`
	}
	if err := s.githubGET(fmt.Sprintf("https://api.github.com/repos/%s/%s", owner, repo), &payload, token); err != nil {
		return nil, err
	}
	meta := map[string]interface{}{
		"full_name":      payload.FullName,
		"description":    payload.Description,
		"default_branch": payload.DefaultBranch,
		"stars":          payload.StargazersCount,
		"watchers":       payload.WatchersCount,
		"forks":          payload.ForksCount,
		"open_issues":    payload.OpenIssuesCount,
		"subscribers":    payload.SubscribersCount,
		"network_count":  payload.NetworkCount,
		"size_kb":        payload.Size,
		"language":       payload.Language,
		"homepage":       payload.Homepage,
		"topics":         payload.Topics,
		"created_at":     payload.CreatedAt,
		"updated_at":     payload.UpdatedAt,
		"pushed_at":      payload.PushedAt,
		"html_url":       payload.HTMLURL,
		"clone_url":      payload.CloneURL,
		"private":        payload.Private,
		"fork":           payload.Fork,
		"archived":       payload.Archived,
		"has_wiki":       payload.HasWiki,
		"has_issues":     payload.HasIssues,
		"has_projects":   payload.HasProjects,
		"has_pages":      payload.HasPages,
		"visibility":     payload.Visibility,
	}
	if payload.License != nil {
		meta["license"] = payload.License.SPDXID
		meta["license_name"] = payload.License.Name
	}
	return meta, nil
}

func (s *ProjectService) fetchGitHubLanguages(repoURL, token string) ([]map[string]interface{}, error) {
	owner, repo, ok := ParseGitHubRepo(repoURL)
	if !ok {
		return nil, fmt.Errorf("unsupported repository URL")
	}
	var raw map[string]int64
	if err := s.githubGET(fmt.Sprintf("https://api.github.com/repos/%s/%s/languages", owner, repo), &raw, token); err != nil {
		return nil, err
	}
	var total int64
	for _, v := range raw {
		total += v
	}
	out := make([]map[string]interface{}, 0, len(raw))
	for lang, bytes := range raw {
		pct := 0.0
		if total > 0 {
			pct = float64(bytes) / float64(total) * 100
		}
		out = append(out, map[string]interface{}{
			"language": lang,
			"bytes":    bytes,
			"percent":  pct,
		})
	}
	for i := 0; i < len(out); i++ {
		for j := i + 1; j < len(out); j++ {
			if out[j]["bytes"].(int64) > out[i]["bytes"].(int64) {
				out[i], out[j] = out[j], out[i]
			}
		}
	}
	return out, nil
}

func (s *ProjectService) fetchGitHubContributors(repoURL string, limit int, token string) ([]map[string]interface{}, error) {
	owner, repo, ok := ParseGitHubRepo(repoURL)
	if !ok {
		return nil, fmt.Errorf("unsupported repository URL")
	}
	if limit <= 0 || limit > 20 {
		limit = 12
	}
	var raw []struct {
		Login         string `json:"login"`
		AvatarURL     string `json:"avatar_url"`
		HTMLURL       string `json:"html_url"`
		Contributions int    `json:"contributions"`
		Type          string `json:"type"`
	}
	urlStr := fmt.Sprintf("https://api.github.com/repos/%s/%s/contributors?per_page=%d", owner, repo, limit)
	if err := s.githubGET(urlStr, &raw, token); err != nil {
		return nil, err
	}
	out := make([]map[string]interface{}, 0, len(raw))
	for _, c := range raw {
		out = append(out, map[string]interface{}{
			"login":         c.Login,
			"avatar_url":    c.AvatarURL,
			"url":           c.HTMLURL,
			"contributions": c.Contributions,
			"type":          c.Type,
		})
	}
	return out, nil
}

func (s *ProjectService) fetchGitHubReleases(repoURL string, limit int, token string) ([]map[string]interface{}, error) {
	owner, repo, ok := ParseGitHubRepo(repoURL)
	if !ok {
		return nil, fmt.Errorf("unsupported repository URL")
	}
	if limit <= 0 || limit > 10 {
		limit = 5
	}
	var raw []struct {
		TagName     string    `json:"tag_name"`
		Name        string    `json:"name"`
		HTMLURL     string    `json:"html_url"`
		PublishedAt time.Time `json:"published_at"`
		Prerelease  bool      `json:"prerelease"`
		Draft       bool      `json:"draft"`
	}
	urlStr := fmt.Sprintf("https://api.github.com/repos/%s/%s/releases?per_page=%d", owner, repo, limit)
	if err := s.githubGET(urlStr, &raw, token); err != nil {
		return nil, err
	}
	out := make([]map[string]interface{}, 0, len(raw))
	for _, r := range raw {
		name := r.Name
		if name == "" {
			name = r.TagName
		}
		out = append(out, map[string]interface{}{
			"tag":          r.TagName,
			"name":         name,
			"url":          r.HTMLURL,
			"published_at": r.PublishedAt,
			"prerelease":   r.Prerelease,
			"draft":        r.Draft,
		})
	}
	return out, nil
}

func (s *ProjectService) fetchGitHubReadme(repoURL, token string) (map[string]interface{}, error) {
	owner, repo, ok := ParseGitHubRepo(repoURL)
	if !ok {
		return nil, fmt.Errorf("unsupported repository URL")
	}
	var payload struct {
		Name     string `json:"name"`
		Path     string `json:"path"`
		HTMLURL  string `json:"html_url"`
		Encoding string `json:"encoding"`
		Content  string `json:"content"`
		Size     int    `json:"size"`
	}
	if err := s.githubGET(fmt.Sprintf("https://api.github.com/repos/%s/%s/readme", owner, repo), &payload, token); err != nil {
		return nil, err
	}
	excerpt := ""
	if payload.Encoding == "base64" && payload.Content != "" {
		decoded, err := base64.StdEncoding.DecodeString(strings.ReplaceAll(payload.Content, "\n", ""))
		if err == nil {
			text := string(decoded)
			lines := strings.Split(text, "\n")
			kept := make([]string, 0, 24)
			for _, line := range lines {
				trimmed := strings.TrimSpace(line)
				if trimmed == "" {
					if len(kept) > 0 {
						kept = append(kept, "")
					}
					continue
				}
				if strings.HasPrefix(trimmed, "![") || strings.HasPrefix(trimmed, "<") {
					continue
				}
				kept = append(kept, line)
				if len(kept) >= 18 {
					break
				}
			}
			excerpt = strings.TrimSpace(strings.Join(kept, "\n"))
			if len(excerpt) > 1600 {
				excerpt = excerpt[:1600] + "…"
			}
		}
	}
	return map[string]interface{}{
		"name":    payload.Name,
		"path":    payload.Path,
		"url":     payload.HTMLURL,
		"size":    payload.Size,
		"excerpt": excerpt,
	}, nil
}

func (s *ProjectService) fetchGitHubPullsOpen(repoURL, token string) (int, error) {
	owner, repo, ok := ParseGitHubRepo(repoURL)
	if !ok {
		return 0, fmt.Errorf("unsupported repository URL")
	}
	var raw []struct {
		ID int64 `json:"id"`
	}
	urlStr := fmt.Sprintf("https://api.github.com/repos/%s/%s/pulls?state=open&per_page=100", owner, repo)
	if err := s.githubGET(urlStr, &raw, token); err != nil {
		return 0, err
	}
	return len(raw), nil
}
