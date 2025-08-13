import os
import logging
from typing import Dict, Any, Optional
import torch
from transformers import AutoTokenizer, AutoModel, pipeline
from sentence_transformers import SentenceTransformer

from app.core.config import settings

logger = logging.getLogger(__name__)

class ModelManager:
    """Manages loading and caching of AI models"""
    
    def __init__(self):
        self.models: Dict[str, Any] = {}
        self.tokenizers: Dict[str, Any] = {}
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        logger.info(f"Using device: {self.device}")
    
    async def load_models(self):
        """Load all required models"""
        try:
            # Create model cache directory
            os.makedirs(settings.MODEL_CACHE_DIR, exist_ok=True)
            
            # Load embedding model
            await self._load_embedding_model()
            
            # Load code summarization model
            await self._load_summarization_model()
            
            # Load code generation model (for future use)
            # await self._load_generation_model()
            
            logger.info("All models loaded successfully")
            
        except Exception as e:
            logger.error(f"Failed to load models: {e}")
            raise
    
    async def _load_embedding_model(self):
        """Load sentence transformer model for embeddings"""
        try:
            model_name = settings.EMBEDDING_MODEL
            cache_dir = os.path.join(settings.MODEL_CACHE_DIR, "embeddings")
            
            logger.info(f"Loading embedding model: {model_name}")
            model = SentenceTransformer(model_name, cache_folder=cache_dir)
            
            self.models["embeddings"] = model
            logger.info("Embedding model loaded successfully")
            
        except Exception as e:
            logger.error(f"Failed to load embedding model: {e}")
            raise
    
    async def _load_summarization_model(self):
        """Load model for code summarization"""
        try:
            model_name = settings.SUMMARIZATION_MODEL
            cache_dir = os.path.join(settings.MODEL_CACHE_DIR, "summarization")
            
            logger.info(f"Loading summarization model: {model_name}")
            
            # Load tokenizer and model
            tokenizer = AutoTokenizer.from_pretrained(
                model_name, 
                cache_dir=cache_dir
            )
            model = AutoModel.from_pretrained(
                model_name,
                cache_dir=cache_dir
            )
            
            # Move model to device
            model.to(self.device)
            model.eval()
            
            self.tokenizers["summarization"] = tokenizer
            self.models["summarization"] = model
            
            logger.info("Summarization model loaded successfully")
            
        except Exception as e:
            logger.error(f"Failed to load summarization model: {e}")
            raise
    
    async def _load_generation_model(self):
        """Load model for code generation (future feature)"""
        try:
            model_name = settings.CODE_GENERATION_MODEL
            cache_dir = os.path.join(settings.MODEL_CACHE_DIR, "generation")
            
            logger.info(f"Loading generation model: {model_name}")
            
            # Create text generation pipeline
            generator = pipeline(
                "text2text-generation",
                model=model_name,
                tokenizer=model_name,
                device=0 if torch.cuda.is_available() else -1,
                model_kwargs={"cache_dir": cache_dir}
            )
            
            self.models["generation"] = generator
            logger.info("Generation model loaded successfully")
            
        except Exception as e:
            logger.error(f"Failed to load generation model: {e}")
            raise
    
    def get_embedding_model(self) -> SentenceTransformer:
        """Get the embedding model"""
        return self.models.get("embeddings")
    
    def get_summarization_model(self) -> tuple:
        """Get the summarization model and tokenizer"""
        model = self.models.get("summarization")
        tokenizer = self.tokenizers.get("summarization")
        return model, tokenizer
    
    def get_generation_model(self):
        """Get the generation model"""
        return self.models.get("generation")
    
    def is_loaded(self, model_name: str) -> bool:
        """Check if a model is loaded"""
        return model_name in self.models
