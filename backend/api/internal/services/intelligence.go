package services

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"regexp"
	"sort"
	"strings"
	"time"

	"github.com/Tukesh1/codexp-ai/backend/api/internal/models"
	"github.com/google/uuid"
)

// Vendor/generated path patterns to detect dead-end or non-essential files.
var vendorPatterns = []string{
	"node_modules", "vendor", "dist", "build", ".venv", "venv",
	"third_party", "generated", "__pycache__", ".git", "target",
	"coverage", ".next", ".nuxt", "out", "pkg/mod",
}

// ----- Notes CRUD -----

func (s *ProjectService) ListNotes(userID, projectID uuid.UUID, path string) ([]models.Note, error) {
	if _, err := s.GetProject(userID, projectID); err != nil {
		return nil, err
	}

	var rows *sql.Rows
	var err error

	if path != "" {
		rows, err = s.db.Query(`
			SELECT id, project_id, user_id, path, start_line, end_line, symbol_name, content, created_at, updated_at
			FROM notes
			WHERE project_id = $1 AND path = $2
			ORDER BY start_line NULLS LAST, created_at DESC
		`, projectID, path)
	} else {
		rows, err = s.db.Query(`
			SELECT id, project_id, user_id, path, start_line, end_line, symbol_name, content, created_at, updated_at
			FROM notes
			WHERE project_id = $1
			ORDER BY path, start_line NULLS LAST, created_at DESC
		`, projectID)
	}
	if err != nil {
		return nil, fmt.Errorf("failed to list notes: %w", err)
	}
	defer rows.Close()

	notes := make([]models.Note, 0)
	for rows.Next() {
		var n models.Note
		var startLine, endLine sql.NullInt64
		var symbolName sql.NullString
		if err := rows.Scan(&n.ID, &n.ProjectID, &n.UserID, &n.Path, &startLine, &endLine, &symbolName, &n.Content, &n.CreatedAt, &n.UpdatedAt); err != nil {
			continue
		}
		if startLine.Valid {
			v := int(startLine.Int64)
			n.StartLine = &v
		}
		if endLine.Valid {
			v := int(endLine.Int64)
			n.EndLine = &v
		}
		if symbolName.Valid {
			n.SymbolName = &symbolName.String
		}
		notes = append(notes, n)
	}
	return notes, nil
}

func (s *ProjectService) CreateNote(userID, projectID uuid.UUID, req *models.CreateNoteRequest) (*models.Note, error) {
	if _, err := s.GetProject(userID, projectID); err != nil {
		return nil, err
	}

	note := &models.Note{
		ID:         uuid.New(),
		ProjectID:  projectID,
		UserID:     userID,
		Path:       req.Path,
		Content:    req.Content,
		StartLine:  req.StartLine,
		EndLine:    req.EndLine,
		SymbolName: req.SymbolName,
	}

	err := s.db.QueryRow(`
		INSERT INTO notes (id, project_id, user_id, path, start_line, end_line, symbol_name, content)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		RETURNING created_at, updated_at
	`, note.ID, note.ProjectID, note.UserID, note.Path, note.StartLine, note.EndLine, note.SymbolName, note.Content).
		Scan(&note.CreatedAt, &note.UpdatedAt)
	if err != nil {
		return nil, fmt.Errorf("failed to create note: %w", err)
	}
	return note, nil
}

func (s *ProjectService) UpdateNote(userID, projectID, noteID uuid.UUID, req *models.UpdateNoteRequest) (*models.Note, error) {
	// Ownership check
	var ownerID uuid.UUID
	err := s.db.QueryRow(`SELECT user_id FROM notes WHERE id = $1 AND project_id = $2`, noteID, projectID).Scan(&ownerID)
	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("note not found")
	}
	if err != nil {
		return nil, fmt.Errorf("failed to verify note ownership: %w", err)
	}
	if ownerID != userID {
		return nil, fmt.Errorf("not authorized to update this note")
	}

	note := &models.Note{ID: noteID, ProjectID: projectID, UserID: userID}
	err = s.db.QueryRow(`
		UPDATE notes
		SET content = $1, updated_at = CURRENT_TIMESTAMP
		WHERE id = $2
		RETURNING path, start_line, end_line, symbol_name, content, created_at, updated_at
	`, req.Content, noteID).Scan(&note.Path, &note.StartLine, &note.EndLine, &note.SymbolName, &note.Content, &note.CreatedAt, &note.UpdatedAt)
	if err != nil {
		return nil, fmt.Errorf("failed to update note: %w", err)
	}
	return note, nil
}

func (s *ProjectService) DeleteNote(userID, projectID, noteID uuid.UUID) error {
	var ownerID uuid.UUID
	err := s.db.QueryRow(`SELECT user_id FROM notes WHERE id = $1 AND project_id = $2`, noteID, projectID).Scan(&ownerID)
	if err == sql.ErrNoRows {
		return fmt.Errorf("note not found")
	}
	if err != nil {
		return fmt.Errorf("failed to verify note ownership: %w", err)
	}
	if ownerID != userID {
		return fmt.Errorf("not authorized to delete this note")
	}

	_, err = s.db.Exec(`DELETE FROM notes WHERE id = $1`, noteID)
	if err != nil {
		return fmt.Errorf("failed to delete note: %w", err)
	}
	return nil
}

// ----- GetReadiness -----

func (s *ProjectService) GetReadiness(userID, projectID uuid.UUID) (*models.ReadinessResponse, error) {
	if _, err := s.GetProject(userID, projectID); err != nil {
		return nil, err
	}

	res := &models.ReadinessResponse{
		VendorPaths: vendorPatterns,
	}

	// Basic counts
	_ = s.db.QueryRow(`SELECT COUNT(*) FROM files WHERE project_id = $1`, projectID).Scan(&res.FileCount)
	_ = s.db.QueryRow(`
		SELECT COUNT(*) FROM functions f
		JOIN files fl ON fl.id = f.file_id
		WHERE fl.project_id = $1
	`, projectID).Scan(&res.FunctionCount)
	_ = s.db.QueryRow(`
		SELECT COUNT(*) FROM classes c
		JOIN files fl ON fl.id = c.file_id
		WHERE fl.project_id = $1
	`, projectID).Scan(&res.ClassCount)

	// Embedding counts
	_ = s.db.QueryRow(`
		SELECT COUNT(*) FROM embeddings e
		WHERE (e.content_type = 'function' AND e.content_id IN (
			SELECT f.id FROM functions f JOIN files fl ON fl.id = f.file_id WHERE fl.project_id = $1
		)) OR (e.content_type = 'class' AND e.content_id IN (
			SELECT c.id FROM classes c JOIN files fl ON fl.id = c.file_id WHERE fl.project_id = $1
		)) OR (e.content_type = 'file' AND e.content_id IN (
			SELECT id FROM files WHERE project_id = $1
		))
	`, projectID).Scan(&res.EmbeddingCount)

	// Embedded functions/classes specifically
	_ = s.db.QueryRow(`
		SELECT COUNT(*) FROM embeddings e
		WHERE e.content_type = 'function' AND e.content_id IN (
			SELECT f.id FROM functions f JOIN files fl ON fl.id = f.file_id WHERE fl.project_id = $1
		)
	`, projectID).Scan(&res.EmbeddedFunctions)
	_ = s.db.QueryRow(`
		SELECT COUNT(*) FROM embeddings e
		WHERE e.content_type = 'class' AND e.content_id IN (
			SELECT c.id FROM classes c JOIN files fl ON fl.id = c.file_id WHERE fl.project_id = $1
		)
	`, projectID).Scan(&res.EmbeddedClasses)

	// Analyses
	_ = s.db.QueryRow(`SELECT EXISTS(SELECT 1 FROM analyses WHERE project_id=$1 AND type='overview')`, projectID).Scan(&res.HasOverview)
	_ = s.db.QueryRow(`SELECT EXISTS(SELECT 1 FROM analyses WHERE project_id=$1 AND type='diagram')`, projectID).Scan(&res.HasDiagram)
	_ = s.db.QueryRow(`SELECT EXISTS(SELECT 1 FROM analyses WHERE project_id=$1 AND type='docs')`, projectID).Scan(&res.HasDocs)

	// Coverage percentage
	totalSymbols := res.FunctionCount + res.ClassCount
	if totalSymbols > 0 {
		res.CoveragePct = float64(res.EmbeddedFunctions+res.EmbeddedClasses) / float64(totalSymbols) * 100
	}

	// Dead-end files: files with zero symbols + small or vendor-like
	deadEndRows, err := s.db.Query(`
		SELECT fl.id, fl.path, COALESCE(fl.size_bytes, 0) as size_bytes
		FROM files fl
		WHERE fl.project_id = $1
		  AND NOT EXISTS (SELECT 1 FROM functions f WHERE f.file_id = fl.id)
		  AND NOT EXISTS (SELECT 1 FROM classes c WHERE c.file_id = fl.id)
		ORDER BY fl.path
		LIMIT 100
	`, projectID)
	if err == nil {
		defer deadEndRows.Close()
		for deadEndRows.Next() {
			var fileID uuid.UUID
			var path string
			var sizeBytes int
			if deadEndRows.Scan(&fileID, &path, &sizeBytes) == nil {
				reason := "no symbols detected"
				if isVendorPath(path) {
					reason = "vendor/generated path"
				} else if sizeBytes < 500 {
					reason = "very small file"
				}
				res.DeadEndFiles = append(res.DeadEndFiles, models.DeadEndFile{
					FileID: fileID,
					Path:   path,
					Reason: reason,
				})
			}
		}
	}

	// Calculate readiness score
	score := 0
	if res.FileCount > 0 {
		score += 10
	}
	if res.FunctionCount > 0 {
		score += 15
	}
	if res.ClassCount > 0 {
		score += 10
	}
	if res.EmbeddingCount > 0 {
		score += 20
	}
	if res.CoveragePct >= 50 {
		score += 15
	} else if res.CoveragePct >= 20 {
		score += 8
	}
	if res.HasOverview {
		score += 10
	}
	if res.HasDiagram {
		score += 10
	}
	if res.HasDocs {
		score += 10
	}
	if score > 100 {
		score = 100
	}
	res.Score = score

	switch {
	case score >= 80:
		res.Label = "Fully Explored"
	case score >= 60:
		res.Label = "Well Analyzed"
	case score >= 40:
		res.Label = "Partially Analyzed"
	case score >= 20:
		res.Label = "Basic Analysis"
	default:
		res.Label = "Needs Analysis"
	}

	return res, nil
}

func isVendorPath(path string) bool {
	pathLower := strings.ToLower(path)
	for _, pattern := range vendorPatterns {
		if strings.Contains(pathLower, pattern) {
			return true
		}
	}
	return false
}

// ----- GetConcepts -----

func (s *ProjectService) GetConcepts(userID, projectID uuid.UUID) (*models.ConceptsResponse, error) {
	if _, err := s.GetProject(userID, projectID); err != nil {
		return nil, err
	}

	// Try to load cached concepts analysis
	var resultsJSON []byte
	err := s.db.QueryRow(`
		SELECT results FROM analyses
		WHERE project_id = $1 AND type = 'concepts'
		ORDER BY created_at DESC LIMIT 1
	`, projectID).Scan(&resultsJSON)
	if err == nil && len(resultsJSON) > 0 {
		var cached models.ConceptsResponse
		if json.Unmarshal(resultsJSON, &cached) == nil && len(cached.Clusters) > 0 {
			cached.Cached = true
			return &cached, nil
		}
	}

	// Compute concepts via embedding clustering
	clusters, err := s.computeConceptClusters(projectID)
	if err != nil {
		return nil, err
	}
	if len(clusters) == 0 {
		clusters, _ = s.computeFolderClusters(projectID)
	}

	result := &models.ConceptsResponse{
		Clusters: clusters,
		Cached:   false,
	}

	// Store for future retrieval
	resultBytes, _ := json.Marshal(result)
	_, _ = s.db.Exec(`
		INSERT INTO analyses (project_id, type, results)
		VALUES ($1, 'concepts', $2::jsonb)
	`, projectID, string(resultBytes))

	return result, nil
}

func (s *ProjectService) computeConceptClusters(projectID uuid.UUID) ([]models.ConceptCluster, error) {
	// Load up to 80 functions/classes that have embeddings
	rows, err := s.db.Query(`
		SELECT e.content_id, e.content_type, e.vector
		FROM embeddings e
		WHERE (e.content_type = 'function' AND e.content_id IN (
			SELECT f.id FROM functions f JOIN files fl ON fl.id = f.file_id WHERE fl.project_id = $1
		)) OR (e.content_type = 'class' AND e.content_id IN (
			SELECT c.id FROM classes c JOIN files fl ON fl.id = c.file_id WHERE fl.project_id = $1
		))
		ORDER BY e.created_at DESC
		LIMIT 80
	`, projectID)
	if err != nil {
		return nil, fmt.Errorf("failed to load embeddings: %w", err)
	}
	defer rows.Close()

	type symbolEmbed struct {
		ID          uuid.UUID
		ContentType string
		Vector      []float32
	}
	var symbols []symbolEmbed

	for rows.Next() {
		var se symbolEmbed
		var vecStr string
		if err := rows.Scan(&se.ID, &se.ContentType, &vecStr); err != nil {
			continue
		}
		// Parse pgvector format [0.1,0.2,...]
		se.Vector = parseVector(vecStr)
		if len(se.Vector) > 0 {
			symbols = append(symbols, se)
		}
	}

	if len(symbols) < 3 {
		return []models.ConceptCluster{}, nil
	}

	// Simple greedy clustering: find nearest neighbors and group connected components
	const threshold = 0.35 // cosine distance threshold
	const maxClusters = 12
	const minClusters = 6

	// Build adjacency based on cosine similarity
	n := len(symbols)
	adj := make([][]int, n)
	for i := 0; i < n; i++ {
		for j := i + 1; j < n; j++ {
			dist := cosineDistance(symbols[i].Vector, symbols[j].Vector)
			if dist < threshold {
				adj[i] = append(adj[i], j)
				adj[j] = append(adj[j], i)
			}
		}
	}

	// Find connected components with BFS
	visited := make([]bool, n)
	var components [][]int
	for i := 0; i < n; i++ {
		if visited[i] {
			continue
		}
		component := []int{}
		queue := []int{i}
		for len(queue) > 0 {
			curr := queue[0]
			queue = queue[1:]
			if visited[curr] {
				continue
			}
			visited[curr] = true
			component = append(component, curr)
			for _, nb := range adj[curr] {
				if !visited[nb] {
					queue = append(queue, nb)
				}
			}
		}
		components = append(components, component)
	}

	// Sort by size descending, take top clusters
	sort.Slice(components, func(i, j int) bool {
		return len(components[i]) > len(components[j])
	})

	// Merge tiny components if too many clusters
	finalComponents := components
	if len(finalComponents) > maxClusters {
		finalComponents = components[:maxClusters]
	}

	// Build cluster response
	clusters := make([]models.ConceptCluster, 0, len(finalComponents))
	for idx, comp := range finalComponents {
		if len(comp) == 0 {
			continue
		}

		cluster := models.ConceptCluster{
			ID:   fmt.Sprintf("concept-%d", idx+1),
			Size: len(comp),
		}

		// Load symbol details
		symbolIDs := make([]uuid.UUID, 0, len(comp))
		for _, i := range comp {
			symbolIDs = append(symbolIDs, symbols[i].ID)
		}

		symDetails := s.loadSymbolDetails(projectID, symbolIDs)
		cluster.Symbols = symDetails

		// Generate cluster name from path segments and symbol names
		cluster.Name = generateClusterName(symDetails, idx+1)

		clusters = append(clusters, cluster)
	}

	// Ensure minimum clusters by splitting large ones if needed
	if len(clusters) < minClusters && len(clusters) > 0 {
		// Just return what we have
	}

	return clusters, nil
}

func parseVector(vecStr string) []float32 {
	// pgvector format: [0.1,0.2,0.3...]
	vecStr = strings.TrimSpace(vecStr)
	vecStr = strings.TrimPrefix(vecStr, "[")
	vecStr = strings.TrimSuffix(vecStr, "]")
	if vecStr == "" {
		return nil
	}
	parts := strings.Split(vecStr, ",")
	vec := make([]float32, 0, len(parts))
	for _, p := range parts {
		var f float64
		_, err := fmt.Sscanf(strings.TrimSpace(p), "%f", &f)
		if err == nil {
			vec = append(vec, float32(f))
		}
	}
	return vec
}

func cosineDistance(a, b []float32) float64 {
	if len(a) != len(b) || len(a) == 0 {
		return 1.0
	}
	var dot, normA, normB float64
	for i := range a {
		dot += float64(a[i]) * float64(b[i])
		normA += float64(a[i]) * float64(a[i])
		normB += float64(b[i]) * float64(b[i])
	}
	if normA == 0 || normB == 0 {
		return 1.0
	}
	similarity := dot / (sqrt(normA) * sqrt(normB))
	return 1.0 - similarity
}

func sqrt(x float64) float64 {
	if x <= 0 {
		return 0
	}
	z := x
	for i := 0; i < 10; i++ {
		z = z - (z*z-x)/(2*z)
	}
	return z
}

func (s *ProjectService) loadSymbolDetails(projectID uuid.UUID, ids []uuid.UUID) []models.SymbolInfo {
	if len(ids) == 0 {
		return nil
	}

	// Build placeholder string
	placeholders := make([]string, len(ids))
	args := make([]interface{}, len(ids)+1)
	args[0] = projectID
	for i, id := range ids {
		placeholders[i] = fmt.Sprintf("$%d", i+2)
		args[i+1] = id
	}
	idList := strings.Join(placeholders, ",")

	query := fmt.Sprintf(`
		SELECT id, name, path, kind FROM (
			SELECT f.id, f.name, fl.path, 'function' as kind
			FROM functions f
			JOIN files fl ON fl.id = f.file_id
			WHERE fl.project_id = $1 AND f.id IN (%s)
			UNION ALL
			SELECT c.id, c.name, fl.path, 'class' as kind
			FROM classes c
			JOIN files fl ON fl.id = c.file_id
			WHERE fl.project_id = $1 AND c.id IN (%s)
		) symbols
	`, idList, idList)

	rows, err := s.db.Query(query, args...)
	if err != nil {
		return nil
	}
	defer rows.Close()

	var symbols []models.SymbolInfo
	for rows.Next() {
		var si models.SymbolInfo
		if rows.Scan(&si.ID, &si.Name, &si.Path, &si.Kind) == nil {
			symbols = append(symbols, si)
		}
	}
	return symbols
}

func generateClusterName(symbols []models.SymbolInfo, index int) string {
	if len(symbols) == 0 {
		return fmt.Sprintf("Cluster %d", index)
	}

	// Find most common path segment
	segmentCount := make(map[string]int)
	for _, sym := range symbols {
		parts := strings.Split(sym.Path, "/")
		for _, part := range parts {
			if part != "" && len(part) > 2 && !strings.HasPrefix(part, ".") {
				segmentCount[part]++
			}
		}
	}

	var topSegment string
	var topCount int
	for seg, cnt := range segmentCount {
		if cnt > topCount {
			topCount = cnt
			topSegment = seg
		}
	}

	// Get most common symbol name prefix
	nameWords := make(map[string]int)
	for _, sym := range symbols {
		// Extract first word from camelCase or snake_case
		words := regexp.MustCompile(`[A-Z][a-z]+|[a-z]+|[A-Z]+`).FindAllString(sym.Name, 3)
		for _, w := range words {
			w = strings.ToLower(w)
			if len(w) > 2 {
				nameWords[w]++
			}
		}
	}

	var topWord string
	topCount = 0
	for word, cnt := range nameWords {
		if cnt > topCount {
			topCount = cnt
			topWord = word
		}
	}

	if topSegment != "" && topWord != "" {
		return fmt.Sprintf("%s / %s", strings.Title(topSegment), strings.Title(topWord))
	}
	if topSegment != "" {
		return strings.Title(topSegment)
	}
	if topWord != "" {
		return fmt.Sprintf("%s Related", strings.Title(topWord))
	}
	return fmt.Sprintf("Concept Group %d", index)
}

func (s *ProjectService) computeFolderClusters(projectID uuid.UUID) ([]models.ConceptCluster, error) {
	rows, err := s.db.Query(`
		SELECT name, path, kind FROM (
			SELECT f.name, fl.path, 'function' AS kind
			FROM functions f JOIN files fl ON fl.id = f.file_id WHERE fl.project_id = $1
			UNION ALL
			SELECT c.name, fl.path, 'class'
			FROM classes c JOIN files fl ON fl.id = c.file_id WHERE fl.project_id = $1
		) s ORDER BY path, name LIMIT 160
	`, projectID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	groups := map[string][]models.SymbolInfo{}
	for rows.Next() {
		var name, path, kind string
		if rows.Scan(&name, &path, &kind) != nil {
			continue
		}
		folder := "(root)"
		if i := strings.Index(path, "/"); i > 0 {
			folder = path[:i]
		}
		groups[folder] = append(groups[folder], models.SymbolInfo{
			Name: name,
			Path: path,
			Kind: kind,
		})
	}

	clusters := []models.ConceptCluster{}
	i := 0
	for name, members := range groups {
		if len(members) == 0 {
			continue
		}
		if len(members) > 12 {
			members = members[:12]
		}
		clusters = append(clusters, models.ConceptCluster{
			ID:      fmt.Sprintf("folder-%d", i),
			Name:    name,
			Symbols: members,
			Size:    len(members),
		})
		i++
		if i >= 10 {
			break
		}
	}
	return clusters, nil
}

// ----- GetSymbolGraph -----

func (s *ProjectService) GetSymbolGraph(userID, projectID uuid.UUID, name, path string) (*models.SymbolGraphResponse, error) {
	project, err := s.GetProject(userID, projectID)
	if err != nil {
		return nil, err
	}

	if name == "" {
		return nil, fmt.Errorf("name parameter is required")
	}

	// Find the symbol
	var symbolID uuid.UUID
	var symbolKind, symbolPath, signature string
	var startLine sql.NullInt64

	// Try functions first
	query := `
		SELECT f.id, 'function', fl.path, COALESCE(f.signature, ''), f.start_line
		FROM functions f
		JOIN files fl ON fl.id = f.file_id
		WHERE fl.project_id = $1 AND f.name = $2
	`
	args := []interface{}{projectID, name}
	if path != "" {
		query += ` AND fl.path = $3`
		args = append(args, path)
	}
	query += ` LIMIT 1`

	err = s.db.QueryRow(query, args...).Scan(&symbolID, &symbolKind, &symbolPath, &signature, &startLine)
	if err == sql.ErrNoRows {
		// Try classes
		query = `
			SELECT c.id, 'class', fl.path, '', c.start_line
			FROM classes c
			JOIN files fl ON fl.id = c.file_id
			WHERE fl.project_id = $1 AND c.name = $2
		`
		args = []interface{}{projectID, name}
		if path != "" {
			query += ` AND fl.path = $3`
			args = append(args, path)
		}
		query += ` LIMIT 1`
		err = s.db.QueryRow(query, args...).Scan(&symbolID, &symbolKind, &symbolPath, &signature, &startLine)
	}
	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("symbol not found: %s", name)
	}
	if err != nil {
		return nil, fmt.Errorf("failed to find symbol: %w", err)
	}

	resp := &models.SymbolGraphResponse{
		Symbol: models.SymbolInfo{
			ID:        symbolID,
			Name:      name,
			Path:      symbolPath,
			Kind:      symbolKind,
			Signature: signature,
		},
	}
	if startLine.Valid {
		line := int(startLine.Int64)
		resp.Symbol.StartLine = &line
	}

	// Get callers from code_references
	callerRows, err := s.db.Query(`
		SELECT DISTINCT cr.from_path, cr.from_line, fl.id
		FROM code_references cr
		LEFT JOIN files fl ON fl.project_id = $1 AND fl.path = cr.from_path
		WHERE cr.project_id = $1 AND cr.to_name = $2
		LIMIT 20
	`, projectID, name)
	if err == nil {
		defer callerRows.Close()
		for callerRows.Next() {
			var fromPath string
			var fromLine sql.NullInt64
			var fileID sql.NullString
			if callerRows.Scan(&fromPath, &fromLine, &fileID) == nil {
				caller := models.SymbolRef{
					Path:   fromPath,
					Source: "database",
				}
				if fromLine.Valid {
					line := int(fromLine.Int64)
					caller.Line = &line
				}
				resp.Callers = append(resp.Callers, caller)
			}
		}
	}

	// If no callers in DB and project has GitHub URL, try GitHub code search
	if len(resp.Callers) == 0 && project.RepoURL != nil && *project.RepoURL != "" {
		owner, repo, ok := ParseGitHubRepo(*project.RepoURL)
		if ok {
			token := s.resolveGitHubToken(userID)
			ghCallers := s.searchGitHubCode(owner, repo, name, token)
			for _, gc := range ghCallers {
				resp.Callers = append(resp.Callers, models.SymbolRef{
					Path:   gc["path"].(string),
					URL:    gc["url"].(string),
					Source: "github",
				})
			}
		}
	}

	// Get callees from code_references
	calleeRows, err := s.db.Query(`
		SELECT DISTINCT cr.to_name, cr.to_kind, cr.to_path
		FROM code_references cr
		WHERE cr.project_id = $1 AND cr.from_path = $2
		LIMIT 20
	`, projectID, symbolPath)
	if err == nil {
		defer calleeRows.Close()
		for calleeRows.Next() {
			var toName string
			var toKind, toPath sql.NullString
			if calleeRows.Scan(&toName, &toKind, &toPath) == nil {
				callee := models.SymbolRef{
					Name:   toName,
					Source: "database",
				}
				if toKind.Valid {
					callee.Kind = toKind.String
				}
				if toPath.Valid {
					callee.Path = toPath.String
				}
				resp.Callees = append(resp.Callees, callee)
			}
		}
	}

	// If no callees and path provided, try regex matching on file content
	if len(resp.Callees) == 0 && symbolPath != "" && project.RepoURL != nil {
		token := s.resolveGitHubToken(userID)
		content, _, err := s.fetchGitHubFileContent(*project.RepoURL, symbolPath, token)
		if err == nil {
			// Load all project symbol names
			allSymbols := s.getAllProjectSymbolNames(projectID)
			// Find calls in file content
			for _, sym := range allSymbols {
				if sym == name {
					continue
				}
				pattern := regexp.MustCompile(`\b` + regexp.QuoteMeta(sym) + `\s*\(`)
				if pattern.MatchString(content) {
					resp.Callees = append(resp.Callees, models.SymbolRef{
						Name:   sym,
						Source: "regex",
					})
				}
				if len(resp.Callees) >= 15 {
					break
				}
			}
		}
	}

	// Get related symbols via embedding similarity
	resp.Related = s.getRelatedSymbols(projectID, symbolID, symbolKind, 8)

	return resp, nil
}

func (s *ProjectService) searchGitHubCode(owner, repo, query, token string) []map[string]interface{} {
	var result struct {
		Items []struct {
			Name    string `json:"name"`
			Path    string `json:"path"`
			HTMLURL string `json:"html_url"`
		} `json:"items"`
	}

	apiURL := fmt.Sprintf("https://api.github.com/search/code?q=%s+in:file+repo:%s/%s&per_page=10",
		query, owner, repo)

	if err := s.githubGET(apiURL, &result, token); err != nil {
		return nil
	}

	out := make([]map[string]interface{}, 0, len(result.Items))
	for _, item := range result.Items {
		out = append(out, map[string]interface{}{
			"name": item.Name,
			"path": item.Path,
			"url":  item.HTMLURL,
		})
	}
	return out
}

func (s *ProjectService) getAllProjectSymbolNames(projectID uuid.UUID) []string {
	rows, err := s.db.Query(`
		SELECT name FROM (
			SELECT f.name FROM functions f
			JOIN files fl ON fl.id = f.file_id
			WHERE fl.project_id = $1
			UNION
			SELECT c.name FROM classes c
			JOIN files fl ON fl.id = c.file_id
			WHERE fl.project_id = $1
		) symbols
	`, projectID)
	if err != nil {
		return nil
	}
	defer rows.Close()

	var names []string
	for rows.Next() {
		var name string
		if rows.Scan(&name) == nil {
			names = append(names, name)
		}
	}
	return names
}

func (s *ProjectService) getRelatedSymbols(projectID, symbolID uuid.UUID, symbolKind string, limit int) []models.SymbolInfo {
	// Use pgvector cosine distance to find nearest neighbors
	rows, err := s.db.Query(`
		SELECT e2.content_id, e2.content_type, e.vector <=> e2.vector as distance
		FROM embeddings e
		JOIN embeddings e2 ON e2.content_id != e.content_id
		WHERE e.content_type = $1 AND e.content_id = $2
		  AND ((e2.content_type = 'function' AND e2.content_id IN (
				SELECT f.id FROM functions f JOIN files fl ON fl.id = f.file_id WHERE fl.project_id = $3
			)) OR (e2.content_type = 'class' AND e2.content_id IN (
				SELECT c.id FROM classes c JOIN files fl ON fl.id = c.file_id WHERE fl.project_id = $3
			)))
		ORDER BY distance
		LIMIT $4
	`, symbolKind, symbolID, projectID, limit)
	if err != nil {
		return nil
	}
	defer rows.Close()

	var ids []uuid.UUID
	for rows.Next() {
		var contentID uuid.UUID
		var contentType string
		var distance float64
		if rows.Scan(&contentID, &contentType, &distance) == nil {
			ids = append(ids, contentID)
		}
	}

	return s.loadSymbolDetails(projectID, ids)
}

// ----- GetDeadEnds -----

func (s *ProjectService) GetDeadEnds(userID, projectID uuid.UUID) (*models.DeadEndsResponse, error) {
	if _, err := s.GetProject(userID, projectID); err != nil {
		return nil, err
	}

	resp := &models.DeadEndsResponse{}

	// Files with zero symbols
	rows, err := s.db.Query(`
		SELECT fl.id, fl.path, COALESCE(fl.size_bytes, 0) as size_bytes, COALESCE(fl.language, 'unknown')
		FROM files fl
		WHERE fl.project_id = $1
		  AND NOT EXISTS (SELECT 1 FROM functions f WHERE f.file_id = fl.id)
		  AND NOT EXISTS (SELECT 1 FROM classes c WHERE c.file_id = fl.id)
		ORDER BY fl.path
		LIMIT 100
	`, projectID)
	if err != nil {
		return nil, fmt.Errorf("failed to query dead-end files: %w", err)
	}
	defer rows.Close()

	for rows.Next() {
		var fileID uuid.UUID
		var path, lang string
		var sizeBytes int
		if rows.Scan(&fileID, &path, &sizeBytes, &lang) != nil {
			continue
		}

		reason := "no symbols detected"
		if isVendorPath(path) {
			reason = "vendor/generated path"
		} else if sizeBytes < 200 {
			reason = "very small file"
		} else if sizeBytes > 100000 {
			reason = "large file - may be generated"
		}

		resp.Files = append(resp.Files, models.DeadEndFile{
			FileID:    fileID,
			Path:      path,
			SizeBytes: sizeBytes,
			Language:  lang,
			Reason:    reason,
		})
	}

	// Folders with many tiny files
	folderRows, err := s.db.Query(`
		SELECT
			CASE
				WHEN position('/' in path) = 0 THEN '(root)'
				ELSE split_part(path, '/', 1)
			END AS folder,
			COUNT(*) AS file_count,
			AVG(COALESCE(size_bytes, 0)) AS avg_size
		FROM files WHERE project_id = $1
		GROUP BY 1
		HAVING COUNT(*) > 10 AND AVG(COALESCE(size_bytes, 0)) < 1000
		ORDER BY file_count DESC
		LIMIT 10
	`, projectID)
	if err == nil {
		defer folderRows.Close()
		for folderRows.Next() {
			var folder string
			var fileCount int
			var avgSize float64
			if folderRows.Scan(&folder, &fileCount, &avgSize) == nil {
				resp.TinyFileFolders = append(resp.TinyFileFolders, models.TinyFileFolder{
					Folder:    folder,
					FileCount: fileCount,
					AvgSize:   int(avgSize),
				})
			}
		}
	}

	return resp, nil
}

// ----- GetChanges -----

func (s *ProjectService) GetChanges(userID, projectID uuid.UUID) (*models.ChangesResponse, error) {
	if _, err := s.GetProject(userID, projectID); err != nil {
		return nil, err
	}

	// Check for existing changelog
	var changelogJSON []byte
	var changelogAt time.Time
	err := s.db.QueryRow(`
		SELECT results, created_at FROM analyses
		WHERE project_id = $1 AND type = 'changelog'
		ORDER BY created_at DESC LIMIT 1
	`, projectID).Scan(&changelogJSON, &changelogAt)
	if err == nil && len(changelogJSON) > 0 {
		var cached models.ChangesResponse
		if json.Unmarshal(changelogJSON, &cached) == nil {
			cached.Cached = true
			cached.GeneratedAt = &changelogAt
			return &cached, nil
		}
	}

	// Load current symbols
	currentSymbols := s.loadCurrentSymbols(projectID)

	// Check for previous snapshot
	var snapshotJSON []byte
	err = s.db.QueryRow(`
		SELECT results FROM analyses
		WHERE project_id = $1 AND type = 'symbol_snapshot'
		ORDER BY created_at DESC LIMIT 1
	`, projectID).Scan(&snapshotJSON)

	if err == sql.ErrNoRows || len(snapshotJSON) == 0 {
		// No snapshot exists, create baseline
		s.saveSymbolSnapshot(projectID, currentSymbols)
		return &models.ChangesResponse{
			Message:  "Baseline snapshot saved. Re-analyze the project or run GetChanges again later to see a changelog.",
			Baseline: true,
		}, nil
	}

	// Parse previous snapshot
	var prevSnapshot map[string]bool
	if json.Unmarshal(snapshotJSON, &prevSnapshot) != nil {
		prevSnapshot = make(map[string]bool)
	}

	// Compute diff
	currentSet := make(map[string]bool)
	for _, sym := range currentSymbols {
		currentSet[sym] = true
	}

	var added, removed []string
	for sym := range currentSet {
		if !prevSnapshot[sym] {
			added = append(added, sym)
		}
	}
	for sym := range prevSnapshot {
		if !currentSet[sym] {
			removed = append(removed, sym)
		}
	}

	sort.Strings(added)
	sort.Strings(removed)

	resp := &models.ChangesResponse{
		Added:   added,
		Removed: removed,
		Cached:  false,
	}

	// Save new snapshot
	s.saveSymbolSnapshot(projectID, currentSymbols)

	// Store changelog
	respBytes, _ := json.Marshal(resp)
	_, _ = s.db.Exec(`
		INSERT INTO analyses (project_id, type, results)
		VALUES ($1, 'changelog', $2::jsonb)
	`, projectID, string(respBytes))

	return resp, nil
}

func (s *ProjectService) loadCurrentSymbols(projectID uuid.UUID) []string {
	rows, err := s.db.Query(`
		SELECT entity_type || ':' || name || ':' || path as symbol_key FROM (
			SELECT 'function' as entity_type, f.name, fl.path
			FROM functions f
			JOIN files fl ON fl.id = f.file_id
			WHERE fl.project_id = $1
			UNION ALL
			SELECT 'class' as entity_type, c.name, fl.path
			FROM classes c
			JOIN files fl ON fl.id = c.file_id
			WHERE fl.project_id = $1
		) symbols
	`, projectID)
	if err != nil {
		return nil
	}
	defer rows.Close()

	var symbols []string
	for rows.Next() {
		var key string
		if rows.Scan(&key) == nil {
			symbols = append(symbols, key)
		}
	}
	return symbols
}

func (s *ProjectService) saveSymbolSnapshot(projectID uuid.UUID, symbols []string) {
	snapshot := make(map[string]bool)
	for _, sym := range symbols {
		snapshot[sym] = true
	}
	snapshotBytes, _ := json.Marshal(snapshot)
	_, _ = s.db.Exec(`
		INSERT INTO analyses (project_id, type, results)
		VALUES ($1, 'symbol_snapshot', $2::jsonb)
	`, projectID, string(snapshotBytes))
}

// ----- Quiz -----

func (s *ProjectService) GenerateQuiz(userID, projectID uuid.UUID) (*models.QuizAttempt, error) {
	if _, err := s.GetProject(userID, projectID); err != nil {
		return nil, err
	}
	if !s.settings.HasAPIKey(userID) {
		return nil, fmt.Errorf("api key not configured — add OpenAI or Gemini key in Settings")
	}
	if s.aiClient == nil {
		return nil, fmt.Errorf("AI service not configured")
	}

	// Load top symbols for context
	rows, err := s.db.Query(`
		SELECT name, entity_type, path, signature FROM (
			SELECT f.name, 'function' AS entity_type, fl.path, f.signature
			FROM functions f
			JOIN files fl ON fl.id = f.file_id
			WHERE fl.project_id = $1
			UNION ALL
			SELECT c.name, 'class' AS entity_type, fl.path, NULL AS signature
			FROM classes c
			JOIN files fl ON fl.id = c.file_id
			WHERE fl.project_id = $1
		) s
		ORDER BY name LIMIT 20
	`, projectID)
	if err != nil {
		return nil, fmt.Errorf("failed to load symbols: %w", err)
	}
	defer rows.Close()

	var symbolContext strings.Builder
	for rows.Next() {
		var name, entityType, path string
		var signature sql.NullString
		if rows.Scan(&name, &entityType, &path, &signature) != nil {
			continue
		}
		sig := ""
		if signature.Valid {
			sig = " — " + signature.String
		}
		symbolContext.WriteString(fmt.Sprintf("- %s `%s` in `%s`%s\n", entityType, name, path, sig))
	}

	// Generate quiz via AI client
	question := fmt.Sprintf(`Based on this codebase structure, generate a quiz with exactly 5 multiple choice questions to test understanding of the code.

Symbols:
%s

Return ONLY valid JSON in this exact format (no markdown, no extra text):
{
  "questions": [
    {
      "question": "What does the X function do?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correct_index": 0,
      "explanation": "Brief explanation of the correct answer"
    }
  ]
}`, symbolContext.String())

	resp, err := s.aiClient.Ask(projectID.String(), question, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to generate quiz: %w", err)
	}

	answer, _ := resp["answer"].(string)
	if answer == "" {
		return nil, fmt.Errorf("AI returned empty response")
	}

	// Parse JSON from response (handle markdown code blocks)
	jsonStr := extractJSON(answer)
	var quizData map[string]interface{}
	if err := json.Unmarshal([]byte(jsonStr), &quizData); err != nil {
		return nil, fmt.Errorf("failed to parse quiz JSON: %w — raw: %s", err, answer[:min(200, len(answer))])
	}

	quizJSON, _ := json.Marshal(quizData)

	attempt := &models.QuizAttempt{
		ID:        uuid.New(),
		ProjectID: projectID,
		UserID:    userID,
		Quiz:      quizJSON,
	}

	err = s.db.QueryRow(`
		INSERT INTO quiz_attempts (id, project_id, user_id, quiz)
		VALUES ($1, $2, $3, $4)
		RETURNING created_at
	`, attempt.ID, attempt.ProjectID, attempt.UserID, attempt.Quiz).Scan(&attempt.CreatedAt)
	if err != nil {
		return nil, fmt.Errorf("failed to save quiz attempt: %w", err)
	}

	// Return quiz without answers so the client cannot peek
	safe := stripQuizAnswers(quizData)
	safeBytes, _ := json.Marshal(safe)
	attempt.Quiz = safeBytes
	return attempt, nil
}

func stripQuizAnswers(quiz map[string]interface{}) map[string]interface{} {
	out := map[string]interface{}{}
	qs, ok := quiz["questions"].([]interface{})
	if !ok {
		return quiz
	}
	safeQs := make([]interface{}, 0, len(qs))
	for _, q := range qs {
		qm, ok := q.(map[string]interface{})
		if !ok {
			continue
		}
		safeQs = append(safeQs, map[string]interface{}{
			"question": qm["question"],
			"options":  qm["options"],
		})
	}
	out["questions"] = safeQs
	return out
}

func extractJSON(text string) string {
	text = strings.TrimSpace(text)

	// Try to extract from markdown code block
	if strings.Contains(text, "```json") {
		start := strings.Index(text, "```json") + 7
		end := strings.Index(text[start:], "```")
		if end > 0 {
			return strings.TrimSpace(text[start : start+end])
		}
	}
	if strings.Contains(text, "```") {
		start := strings.Index(text, "```") + 3
		// Skip optional language tag
		if newline := strings.Index(text[start:], "\n"); newline >= 0 {
			start += newline + 1
		}
		end := strings.Index(text[start:], "```")
		if end > 0 {
			return strings.TrimSpace(text[start : start+end])
		}
	}

	// Try to find JSON object directly
	if braceStart := strings.Index(text, "{"); braceStart >= 0 {
		depth := 0
		for i := braceStart; i < len(text); i++ {
			if text[i] == '{' {
				depth++
			} else if text[i] == '}' {
				depth--
				if depth == 0 {
					return text[braceStart : i+1]
				}
			}
		}
	}

	return text
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}

func (s *ProjectService) SubmitQuiz(userID, projectID, attemptID uuid.UUID, req *models.SubmitQuizRequest) (*models.QuizResult, error) {
	// Verify ownership
	var ownerID uuid.UUID
	var quizJSON []byte
	err := s.db.QueryRow(`
		SELECT user_id, quiz FROM quiz_attempts
		WHERE id = $1 AND project_id = $2
	`, attemptID, projectID).Scan(&ownerID, &quizJSON)
	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("quiz attempt not found")
	}
	if err != nil {
		return nil, fmt.Errorf("failed to load quiz: %w", err)
	}
	if ownerID != userID {
		return nil, fmt.Errorf("not authorized to submit this quiz")
	}

	// Parse quiz
	var quiz struct {
		Questions []struct {
			Question     string   `json:"question"`
			Options      []string `json:"options"`
			CorrectIndex int      `json:"correct_index"`
			Explanation  string   `json:"explanation"`
		} `json:"questions"`
	}
	if err := json.Unmarshal(quizJSON, &quiz); err != nil {
		return nil, fmt.Errorf("invalid quiz data")
	}

	// Grade
	correct := 0
	results := make([]models.QuestionResult, 0, len(quiz.Questions))
	for i, q := range quiz.Questions {
		userAnswer := -1
		if i < len(req.Answers) {
			userAnswer = req.Answers[i]
		}
		isCorrect := userAnswer == q.CorrectIndex
		if isCorrect {
			correct++
		}
		results = append(results, models.QuestionResult{
			Question:       q.Question,
			UserAnswer:     userAnswer,
			CorrectAnswer:  q.CorrectIndex,
			IsCorrect:      isCorrect,
			Explanation:    q.Explanation,
			CorrectOption:  safeIndex(q.Options, q.CorrectIndex),
			SelectedOption: safeIndex(q.Options, userAnswer),
		})
	}

	total := len(quiz.Questions)
	score := 0
	if total > 0 {
		score = correct * 100 / total
	}

	// Update quiz attempt
	answersJSON, _ := json.Marshal(req.Answers)
	_, _ = s.db.Exec(`
		UPDATE quiz_attempts
		SET answers = $1, score = $2
		WHERE id = $3
	`, answersJSON, score, attemptID)

	return &models.QuizResult{
		AttemptID: attemptID,
		Score:     score,
		Correct:   correct,
		Total:     total,
		Results:   results,
	}, nil
}

func safeIndex(slice []string, idx int) string {
	if idx >= 0 && idx < len(slice) {
		return slice[idx]
	}
	return ""
}

func (s *ProjectService) GetLatestQuiz(userID, projectID uuid.UUID) (*models.QuizAttempt, error) {
	if _, err := s.GetProject(userID, projectID); err != nil {
		return nil, err
	}

	attempt := &models.QuizAttempt{}
	var answersJSON sql.NullString
	var score sql.NullInt64

	err := s.db.QueryRow(`
		SELECT id, project_id, user_id, quiz, answers, score, created_at
		FROM quiz_attempts
		WHERE project_id = $1 AND user_id = $2
		ORDER BY created_at DESC
		LIMIT 1
	`, projectID, userID).Scan(&attempt.ID, &attempt.ProjectID, &attempt.UserID, &attempt.Quiz, &answersJSON, &score, &attempt.CreatedAt)
	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("no quiz attempts found")
	}
	if err != nil {
		return nil, fmt.Errorf("failed to load quiz: %w", err)
	}

	if answersJSON.Valid {
		attempt.Answers = []byte(answersJSON.String)
	}
	if score.Valid {
		s := int(score.Int64)
		attempt.Score = &s
	}

	return attempt, nil
}
