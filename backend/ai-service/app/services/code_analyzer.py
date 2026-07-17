import os
import re
import hashlib
import logging
from typing import Dict, List, Optional, Any
import tree_sitter
from tree_sitter import Language, Parser

from app.core.config import settings
from app.services.embedding_service import EmbeddingService
from app.core.database import database

logger = logging.getLogger(__name__)

class CodeAnalyzer:
    """Service for analyzing code structure and generating summaries"""
    
    def __init__(self, model_manager):
        self.model_manager = model_manager
        self.embedding_service = EmbeddingService(model_manager)
        self.parsers = {}
        self._setup_parsers()
    
    def _setup_parsers(self):
        """Initialize tree-sitter parsers for different languages"""
        try:
            # Note: In production, you'd need to build the language libraries
            # This is a simplified setup for demonstration
            language_configs = {
                'python': 'tree-sitter-python',
                'javascript': 'tree-sitter-javascript', 
                'typescript': 'tree-sitter-typescript',
                'go': 'tree-sitter-go',
                'cpp': 'tree-sitter-cpp'
            }
            
            for lang, lib_name in language_configs.items():
                try:
                    # In production, load actual compiled language libraries
                    parser = Parser()
                    # language = Language(lib_path, lang)
                    # parser.set_language(language)
                    self.parsers[lang] = parser
                    logger.info(f"Parser for {lang} initialized")
                except Exception as e:
                    logger.warning(f"Failed to load parser for {lang}: {e}")
                    
        except Exception as e:
            logger.error(f"Failed to setup parsers: {e}")
    
    async def analyze_repository(self, repo_path: str, project_id: str, languages: Optional[List[str]] = None) -> Dict[str, Any]:
        """Analyze a repository and extract code structures"""
        try:
            result = {
                "project_id": project_id,
                "repository_path": repo_path,
                "files_analyzed": 0,
                "functions_extracted": 0,
                "classes_extracted": 0,
                "references_extracted": 0,
                "analysis_summary": {}
            }
            
            # Get all code files
            code_files = self._get_code_files(repo_path, languages)
            result["files_analyzed"] = len(code_files)
            
            functions_count = 0
            classes_count = 0
            file_contents: Dict[str, str] = {}
            
            for file_path in code_files:
                try:
                    file_analysis = await self._analyze_file(file_path, project_id, repo_root=repo_path)
                    functions_count += len(file_analysis.get("functions", []))
                    classes_count += len(file_analysis.get("classes", []))
                    store_path = file_analysis.get("store_path")
                    content = file_analysis.get("content")
                    if store_path and content is not None:
                        file_contents[store_path] = content
                except Exception as e:
                    logger.error(f"Failed to analyze file {file_path}: {e}")
                    continue

            refs = await self._build_references(project_id, file_contents)
            result["references_extracted"] = refs
            result["functions_extracted"] = functions_count
            result["classes_extracted"] = classes_count
            result["analysis_summary"] = {
                "languages_detected": self._detect_languages(code_files),
                "avg_functions_per_file": functions_count / len(code_files) if code_files else 0,
                "avg_classes_per_file": classes_count / len(code_files) if code_files else 0
            }
            
            return result
            
        except Exception as e:
            logger.error(f"Repository analysis failed: {e}")
            raise
    
    async def _analyze_file(self, file_path: str, project_id: str, repo_root: str = None) -> Dict[str, Any]:
        """Analyze a single code file"""
        try:
            with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                content = f.read()
            
            # Detect language from file extension
            language = self._detect_file_language(file_path)

            # Prefer relative path for storage/display
            store_path = file_path
            if repo_root:
                try:
                    store_path = os.path.relpath(file_path, repo_root)
                except ValueError:
                    store_path = file_path
            
            # Extract functions and classes (simplified)
            functions = self._extract_functions(content, language)
            classes = self._extract_classes(content, language)
            self._estimate_end_lines(content, functions, classes)
            
            # Store file information in database
            await self._store_file_analysis(
                project_id=project_id,
                file_path=store_path,
                language=language,
                content=content,
                functions=functions,
                classes=classes
            )
            
            return {
                "file_path": file_path,
                "store_path": store_path,
                "content": content,
                "language": language,
                "functions": functions,
                "classes": classes,
                "size_bytes": len(content.encode('utf-8'))
            }
            
        except Exception as e:
            logger.error(f"File analysis failed for {file_path}: {e}")
            raise

    def _estimate_end_lines(self, content: str, functions: List[Dict], classes: List[Dict]):
        """Estimate end_line from the next definition start."""
        starts = sorted(
            [x["start_line"] for x in functions] + [x["start_line"] for x in classes]
        )
        total_lines = content.count("\n") + 1

        def next_after(line: int) -> int:
            for s in starts:
                if s > line:
                    return max(line, s - 1)
            return min(total_lines, line + 40)

        for item in functions + classes:
            item["end_line"] = next_after(item["start_line"])    
    def _get_code_files(self, repo_path: str, languages: Optional[List[str]] = None) -> List[str]:
        """Get list of code files in repository"""
        code_extensions = {
            '.py': 'python',
            '.js': 'javascript',
            '.ts': 'typescript',
            '.jsx': 'javascript',
            '.tsx': 'typescript',
            '.go': 'go',
            '.cpp': 'cpp',
            '.cc': 'cpp',
            '.cxx': 'cpp',
            '.c': 'c',
            '.h': 'c',
            '.hpp': 'cpp'
        }
        
        code_files = []
        for root, dirs, files in os.walk(repo_path):
            # Skip common non-code directories
            dirs[:] = [d for d in dirs if d not in {'.git', '__pycache__', 'node_modules', '.vscode', '.idea'}]
            
            for file in files:
                file_path = os.path.join(root, file)
                ext = os.path.splitext(file)[1].lower()
                
                if ext in code_extensions:
                    file_lang = code_extensions[ext]
                    if not languages or file_lang in languages:
                        code_files.append(file_path)
        
        return code_files
    
    def _detect_file_language(self, file_path: str) -> str:
        """Detect programming language from file extension"""
        ext = os.path.splitext(file_path)[1].lower()
        extension_map = {
            '.py': 'python',
            '.js': 'javascript', 
            '.ts': 'typescript',
            '.jsx': 'javascript',
            '.tsx': 'typescript',
            '.go': 'go',
            '.cpp': 'cpp',
            '.cc': 'cpp',
            '.cxx': 'cpp',
            '.c': 'c',
            '.h': 'c',
            '.hpp': 'cpp'
        }
        return extension_map.get(ext, 'unknown')
    
    def _detect_languages(self, file_paths: List[str]) -> Dict[str, int]:
        """Detect languages and their file counts"""
        languages = {}
        for path in file_paths:
            lang = self._detect_file_language(path)
            languages[lang] = languages.get(lang, 0) + 1
        return languages
    
    def _extract_functions(self, content: str, language: str) -> List[Dict[str, Any]]:
        """Extract function definitions from code (simplified)"""
        functions = []
        
        # This is a simplified regex-based extraction
        # In production, use tree-sitter for proper AST parsing
        if language == 'python':
            import re
            pattern = r'def\s+(\w+)\s*\([^)]*\):'
            matches = re.finditer(pattern, content)
            for match in matches:
                functions.append({
                    "name": match.group(1),
                    "start_line": content[:match.start()].count('\n') + 1,
                    "signature": match.group(0)
                })
        
        elif language in ['javascript', 'typescript']:
            import re
            pattern = r'function\s+(\w+)\s*\([^)]*\)'
            matches = re.finditer(pattern, content)
            for match in matches:
                functions.append({
                    "name": match.group(1),
                    "start_line": content[:match.start()].count('\n') + 1,
                    "signature": match.group(0)
                })
        
        return functions
    
    def _extract_classes(self, content: str, language: str) -> List[Dict[str, Any]]:
        """Extract class definitions from code (simplified)"""
        classes = []
        
        if language == 'python':
            import re
            pattern = r'class\s+(\w+)(?:\([^)]*\))?:'
            matches = re.finditer(pattern, content)
            for match in matches:
                classes.append({
                    "name": match.group(1),
                    "start_line": content[:match.start()].count('\n') + 1,
                    "signature": match.group(0)
                })
        
        elif language in ['javascript', 'typescript']:
            import re
            pattern = r'class\s+(\w+)(?:\s+extends\s+\w+)?'
            matches = re.finditer(pattern, content)
            for match in matches:
                classes.append({
                    "name": match.group(1),
                    "start_line": content[:match.start()].count('\n') + 1,
                    "signature": match.group(0)
                })
        
        return classes
    
    async def _store_file_analysis(self, project_id: str, file_path: str, language: str, 
                                 content: str, functions: List, classes: List):
        """Store file analysis results in database"""
        try:
            content_hash = hashlib.sha256(content.encode("utf-8")).hexdigest()
            # Store file record
            file_query = """
                INSERT INTO files (project_id, path, language, size_bytes, content_hash, last_analyzed)
                VALUES ($1, $2, $3, $4, $5, NOW())
                ON CONFLICT (project_id, path) 
                DO UPDATE SET language = $3, size_bytes = $4, content_hash = $5, last_analyzed = NOW()
                RETURNING id
            """
            
            file_id = await database.fetchval(
                file_query, 
                project_id, 
                file_path, 
                language, 
                len(content.encode('utf-8')),
                content_hash,
            )

            # Replace symbols for this file to keep re-analyze clean
            await database.execute("DELETE FROM functions WHERE file_id = $1", file_id)
            await database.execute("DELETE FROM classes WHERE file_id = $1", file_id)
            
            # Store functions
            for func in functions:
                func_query = """
                    INSERT INTO functions (file_id, name, signature, start_line, end_line)
                    VALUES ($1, $2, $3, $4, $5)
                """
                await database.execute(
                    func_query,
                    file_id,
                    func["name"],
                    func["signature"],
                    func["start_line"],
                    func.get("end_line"),
                )
            
            # Store classes
            for cls in classes:
                class_query = """
                    INSERT INTO classes (file_id, name, start_line, end_line)
                    VALUES ($1, $2, $3, $4)
                """
                await database.execute(
                    class_query,
                    file_id,
                    cls["name"],
                    cls["start_line"],
                    cls.get("end_line"),
                )
            
        except Exception as e:
            logger.error(f"Failed to store file analysis: {e}")
            raise

    async def _build_references(self, project_id: str, file_contents: Dict[str, str]) -> int:
        """Extract call/import references across analyzed files."""
        await database.execute(
            "DELETE FROM code_references WHERE project_id = $1", project_id
        )
        symbol_rows = await database.fetch(
            """
            SELECT name, kind, path, file_id FROM (
                SELECT f.name, 'function' AS kind, fl.path, fl.id AS file_id
                FROM functions f JOIN files fl ON fl.id = f.file_id
                WHERE fl.project_id = $1
                UNION ALL
                SELECT c.name, 'class', fl.path, fl.id
                FROM classes c JOIN files fl ON fl.id = c.file_id
                WHERE fl.project_id = $1
            ) s
            """,
            project_id,
        )
        by_name: Dict[str, List[Dict[str, Any]]] = {}
        for row in symbol_rows:
            by_name.setdefault(row["name"], []).append(dict(row))

        path_to_id = {}
        file_rows = await database.fetch(
            "SELECT id, path FROM files WHERE project_id = $1", project_id
        )
        for row in file_rows:
            path_to_id[row["path"]] = row["id"]

        # Skip very common identifiers
        skip = {
            "if", "for", "while", "switch", "return", "print", "len", "range",
            "map", "list", "dict", "set", "str", "int", "float", "bool", "type",
            "super", "self", "this", "new", "class", "def", "function", "import",
            "from", "require", "console", "log", "error", "warn", "info",
        }

        inserted = 0
        call_re = re.compile(r"\b([A-Za-z_][A-Za-z0-9_]{2,})\s*\(")
        import_re = re.compile(
            r"(?:from\s+([\w.]+)\s+import\s+([\w,\s*]+)|import\s+([\w.]+)|require\(\s*['\"]([^'\"]+)['\"]\s*\))"
        )

        for path, content in file_contents.items():
            from_file_id = path_to_id.get(path)
            # Calls
            for m in call_re.finditer(content):
                name = m.group(1)
                if name.lower() in skip or name not in by_name:
                    continue
                # Prefer a definition outside this file when possible
                targets = by_name[name]
                target = next((t for t in targets if t["path"] != path), targets[0])
                line = content[: m.start()].count("\n") + 1
                await database.execute(
                    """
                    INSERT INTO code_references
                    (project_id, from_file_id, from_path, from_line, to_name, to_kind, to_file_id, to_path)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                    """,
                    project_id,
                    from_file_id,
                    path,
                    line,
                    name,
                    "call",
                    target["file_id"],
                    target["path"],
                )
                inserted += 1
                if inserted >= 5000:
                    return inserted

            for m in import_re.finditer(content):
                line = content[: m.start()].count("\n") + 1
                imported = m.group(2) or m.group(3) or m.group(4) or m.group(1) or ""
                for part in re.split(r"[,\s]+", imported):
                    part = part.strip().split(".")[-1]
                    if not part or part == "*" or part.lower() in skip:
                        continue
                    kind = "import"
                    to_file_id = None
                    to_path = None
                    if part in by_name:
                        target = by_name[part][0]
                        to_file_id = target["file_id"]
                        to_path = target["path"]
                        kind = target["kind"]
                    await database.execute(
                        """
                        INSERT INTO code_references
                        (project_id, from_file_id, from_path, from_line, to_name, to_kind, to_file_id, to_path)
                        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                        """,
                        project_id,
                        from_file_id,
                        path,
                        line,
                        part,
                        kind,
                        to_file_id,
                        to_path,
                    )
                    inserted += 1
                    if inserted >= 5000:
                        return inserted
        return inserted

    async def summarize_code(self, code: str, language: str, context: Optional[str] = None) -> str:
        """Generate summary for code snippet"""
        try:
            # This is a placeholder implementation
            # In production, use the loaded summarization model
            
            # Prepare input for summarization
            prompt = f"Summarize this {language} code:\n{code}"
            if context:
                prompt = f"Context: {context}\n{prompt}"
            
            # For now, return a simple summary based on code structure
            lines = code.strip().split('\n')
            
            if language == 'python':
                if code.strip().startswith('def '):
                    return f"Python function with {len(lines)} lines of code"
                elif code.strip().startswith('class '):
                    return f"Python class definition with {len(lines)} lines"
                else:
                    return f"Python code block with {len(lines)} lines"
            
            return f"{language.title()} code snippet with {len(lines)} lines"
            
        except Exception as e:
            logger.error(f"Code summarization failed: {e}")
            raise
