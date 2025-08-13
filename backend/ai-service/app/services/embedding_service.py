import logging
from typing import List, Dict, Any
import numpy as np

from app.core.config import settings
from app.core.database import database

logger = logging.getLogger(__name__)

class EmbeddingService:
    """Service for generating and managing code embeddings"""
    
    def __init__(self, model_manager):
        self.model_manager = model_manager
        self.embedding_model = model_manager.get_embedding_model()
    
    async def generate_embeddings(self, texts: List[str]) -> List[List[float]]:
        """Generate embeddings for a list of texts"""
        try:
            if not self.embedding_model:
                raise ValueError("Embedding model not loaded")
            
            # Generate embeddings using sentence transformer
            embeddings = self.embedding_model.encode(
                texts,
                batch_size=settings.BATCH_SIZE,
                convert_to_numpy=True,
                normalize_embeddings=True
            )
            
            # Convert to list of lists for JSON serialization
            return embeddings.tolist()
            
        except Exception as e:
            logger.error(f"Embedding generation failed: {e}")
            raise
    
    async def store_embeddings(self, content_type: str, content_id: str, embedding: List[float]):
        """Store embedding in database"""
        try:
            query = """
                INSERT INTO embeddings (content_type, content_id, vector)
                VALUES ($1, $2, $3)
                ON CONFLICT (content_type, content_id) 
                DO UPDATE SET vector = $3
            """
            
            await database.execute(query, content_type, content_id, embedding)
            
        except Exception as e:
            logger.error(f"Failed to store embedding: {e}")
            raise
    
    async def search_similar(self, query_embedding: List[float], 
                           content_type: str = None, 
                           limit: int = 10,
                           threshold: float = 0.7) -> List[Dict[str, Any]]:
        """Search for similar embeddings using cosine similarity"""
        try:
            # Build query with optional content type filter
            where_clause = ""
            params = [query_embedding, limit]
            
            if content_type:
                where_clause = "WHERE content_type = $3"
                params.append(content_type)
            
            query = f"""
                SELECT 
                    content_type,
                    content_id,
                    1 - (vector <=> $1) as similarity
                FROM embeddings
                {where_clause}
                ORDER BY vector <=> $1
                LIMIT $2
            """
            
            results = await database.fetch(query, *params)
            
            # Filter by threshold and format results
            similar_items = []
            for row in results:
                if row['similarity'] >= threshold:
                    similar_items.append({
                        'content_type': row['content_type'],
                        'content_id': row['content_id'],
                        'similarity': float(row['similarity'])
                    })
            
            return similar_items
            
        except Exception as e:
            logger.error(f"Similarity search failed: {e}")
            raise
    
    async def generate_and_store_embeddings(self, items: List[Dict[str, Any]]):
        """Generate embeddings for multiple items and store them"""
        try:
            # Extract texts for embedding generation
            texts = [item['text'] for item in items]
            
            # Generate embeddings
            embeddings = await self.generate_embeddings(texts)
            
            # Store each embedding
            for item, embedding in zip(items, embeddings):
                await self.store_embeddings(
                    content_type=item['content_type'],
                    content_id=item['content_id'],
                    embedding=embedding
                )
            
            logger.info(f"Generated and stored {len(embeddings)} embeddings")
            
        except Exception as e:
            logger.error(f"Failed to generate and store embeddings: {e}")
            raise
    
    def preprocess_code_for_embedding(self, code: str, language: str, 
                                    function_name: str = None) -> str:
        """Preprocess code snippet for better embedding quality"""
        try:
            # Remove comments and clean up code
            lines = code.strip().split('\n')
            cleaned_lines = []
            
            for line in lines:
                line = line.strip()
                # Skip empty lines and simple comments
                if line and not line.startswith('#') and not line.startswith('//'):
                    cleaned_lines.append(line)
            
            cleaned_code = '\n'.join(cleaned_lines)
            
            # Add context if function name is provided
            if function_name:
                cleaned_code = f"Function {function_name}: {cleaned_code}"
            
            # Add language context
            cleaned_code = f"{language} code: {cleaned_code}"
            
            return cleaned_code
            
        except Exception as e:
            logger.error(f"Code preprocessing failed: {e}")
            return code  # Return original if preprocessing fails
