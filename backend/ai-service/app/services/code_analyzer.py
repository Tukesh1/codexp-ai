import os
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
                "analysis_summary": {}
            }
            
            # Get all code files
            code_files = self._get_code_files(repo_path, languages)
            result["files_analyzed"] = len(code_files)
            
            functions_count = 0
            classes_count = 0
            
            for file_path in code_files:
                try:
                    # Analyze individual file
                    file_analysis = await self._analyze_file(file_path, project_id)
                    functions_count += len(file_analysis.get("functions", []))
                    classes_count += len(file_analysis.get("classes", []))
                    
                except Exception as e:
                    logger.error(f"Failed to analyze file {file_path}: {e}")
                    continue
            
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
    
    async def _analyze_file(self, file_path: str, project_id: str) -> Dict[str, Any]:
        """Analyze a single code file"""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # Detect language from file extension
            language = self._detect_file_language(file_path)
            
            # Extract functions and classes (simplified)
            functions = self._extract_functions(content, language)
            classes = self._extract_classes(content, language)
            
            # Store file information in database
            await self._store_file_analysis(
                project_id=project_id,
                file_path=file_path,
                language=language,
                content=content,
                functions=functions,
                classes=classes
            )
            
            return {
                "file_path": file_path,
                "language": language,
                "functions": functions,
                "classes": classes,
                "size_bytes": len(content.encode('utf-8'))
            }
            
        except Exception as e:
            logger.error(f"File analysis failed for {file_path}: {e}")
            raise
    
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
            # Store file record
            file_query = """
                INSERT INTO files (project_id, path, language, size_bytes, last_analyzed)
                VALUES ($1, $2, $3, $4, NOW())
                ON CONFLICT (project_id, path) 
                DO UPDATE SET language = $3, size_bytes = $4, last_analyzed = NOW()
                RETURNING id
            """
            
            file_id = await database.fetchval(
                file_query, 
                project_id, 
                file_path, 
                language, 
                len(content.encode('utf-8'))
            )
            
            # Store functions
            for func in functions:
                func_query = """
                    INSERT INTO functions (file_id, name, signature, start_line)
                    VALUES ($1, $2, $3, $4)
                    ON CONFLICT DO NOTHING
                """
                await database.execute(
                    func_query,
                    file_id,
                    func["name"],
                    func["signature"],
                    func["start_line"]
                )
            
            # Store classes
            for cls in classes:
                class_query = """
                    INSERT INTO classes (file_id, name, start_line)
                    VALUES ($1, $2, $3)
                    ON CONFLICT DO NOTHING
                """
                await database.execute(
                    class_query,
                    file_id,
                    cls["name"],
                    cls["start_line"]
                )
            
        except Exception as e:
            logger.error(f"Failed to store file analysis: {e}")
            raise
    
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
