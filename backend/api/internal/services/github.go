package services

import (
	"fmt"
	"os/exec"
	"path/filepath"
	"strings"
)

type GitHubService struct {
	appID      string
	privateKey string
}

func NewGitHubService(appID, privateKey string) *GitHubService {
	return &GitHubService{
		appID:      appID,
		privateKey: privateKey,
	}
}

// CloneRepository clones a repository to a local directory
func (s *GitHubService) CloneRepository(repoURL, destination string) error {
	// Ensure the destination directory exists
	cmd := exec.Command("mkdir", "-p", filepath.Dir(destination))
	if err := cmd.Run(); err != nil {
		return fmt.Errorf("failed to create destination directory: %w", err)
	}

	// Clone the repository
	cmd = exec.Command("git", "clone", "--depth=1", repoURL, destination)
	if err := cmd.Run(); err != nil {
		return fmt.Errorf("failed to clone repository: %w", err)
	}

	return nil
}

// GetRepositoryMetadata extracts basic metadata from a cloned repository
func (s *GitHubService) GetRepositoryMetadata(repoPath string) (*RepositoryMetadata, error) {
	metadata := &RepositoryMetadata{
		Path: repoPath,
	}

	// Count files and detect languages
	files, err := s.scanDirectory(repoPath)
	if err != nil {
		return nil, fmt.Errorf("failed to scan repository: %w", err)
	}

	metadata.Files = files
	metadata.FileCount = len(files)
	metadata.Languages = s.detectLanguages(files)

	return metadata, nil
}

type RepositoryMetadata struct {
	Path      string         `json:"path"`
	Files     []string       `json:"files"`
	FileCount int            `json:"file_count"`
	Languages map[string]int `json:"languages"`
}

func (s *GitHubService) scanDirectory(dir string) ([]string, error) {
	var files []string

	// Use find command to get all files, excluding .git directory
	cmd := exec.Command("find", dir, "-type", "f", "-not", "-path", "*/.git/*")
	output, err := cmd.Output()
	if err != nil {
		return nil, err
	}

	lines := strings.Split(strings.TrimSpace(string(output)), "\n")
	for _, line := range lines {
		if line != "" {
			// Convert to relative path
			relPath, err := filepath.Rel(dir, line)
			if err == nil {
				files = append(files, relPath)
			}
		}
	}

	return files, nil
}

func (s *GitHubService) detectLanguages(files []string) map[string]int {
	languages := make(map[string]int)

	extensionToLanguage := map[string]string{
		".py":    "Python",
		".js":    "JavaScript",
		".ts":    "TypeScript",
		".jsx":   "JavaScript",
		".tsx":   "TypeScript",
		".go":    "Go",
		".cpp":   "C++",
		".cc":    "C++",
		".cxx":   "C++",
		".c":     "C",
		".h":     "C/C++",
		".hpp":   "C++",
		".java":  "Java",
		".rs":    "Rust",
		".php":   "PHP",
		".rb":    "Ruby",
		".cs":    "C#",
		".swift": "Swift",
		".kt":    "Kotlin",
		".dart":  "Dart",
		".scala": "Scala",
		".clj":   "Clojure",
		".r":     "R",
		".R":     "R",
		".m":     "Objective-C",
		".mm":    "Objective-C++",
	}

	for _, file := range files {
		ext := filepath.Ext(file)
		if lang, exists := extensionToLanguage[ext]; exists {
			languages[lang]++
		}
	}

	return languages
}

// ValidateWebhookSignature validates GitHub webhook signatures
func (s *GitHubService) ValidateWebhookSignature(payload []byte, signature string) error {
	// TODO: Implement GitHub webhook signature validation
	// This is a placeholder - implement proper webhook validation
	return nil
}
