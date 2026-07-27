import asyncio
import json
import logging
from backend.services.external.clients import AIClient
from backend.services.ai.prompts import PROMPTS
from backend.core.logging_config import system_logger

logger = logging.getLogger("system")

class AIService:
    @staticmethod
    def get_system_prompt(mode: str) -> str:
        return PROMPTS.get(mode, PROMPTS["general"])

    @classmethod
    def query_ai(cls, user_prompt: str, mode: str, context: str = None) -> dict:
        # Input length validations
        if not user_prompt or len(user_prompt.strip()) == 0:
            raise ValueError("Prompt cannot be empty.")
        if len(user_prompt) > 2000:
            raise ValueError("Prompt exceeds maximum length of 2000 characters.")
            
        system_prompt = cls.get_system_prompt(mode)
        
        # Build prompt with safe context boundaries
        combined = ""
        if context:
            safe_context = context[:3000]
            combined += f"[Injected Context:\n{safe_context}\n]\n\n"
        combined += f"[System Instruction: {system_prompt}]\n\nUser Message: {user_prompt}"
        
        system_logger.info(f"Dispatching AI request in mode '{mode}' (length: {len(user_prompt)})")
        
        # Query existing client
        res = AIClient.get_chat_response(combined)
        return {
            "response": res["data"]["response"],
            "provider": res["source"]
        }

    @classmethod
    async def stream_ai_response(cls, user_prompt: str, mode: str, context: str = None):
        if not user_prompt or len(user_prompt.strip()) == 0:
            yield f"data: {json.dumps({'error': 'Prompt cannot be empty.'})}\n\n"
            return
        if len(user_prompt) > 2000:
            yield f"data: {json.dumps({'error': 'Prompt exceeds maximum length of 2000 characters.'})}\n\n"
            return
            
        try:
            # Query AI service in a separate thread so as not to block FastAPI's main event loop
            loop = asyncio.get_running_loop()
            res = await loop.run_in_executor(None, cls.query_ai, user_prompt, mode, context)
            
            text = res["response"]
            
            # Stream response in chunks
            chunk_size = 12
            for i in range(0, len(text), chunk_size):
                chunk = text[i:i+chunk_size]
                yield f"data: {json.dumps({'chunk': chunk})}\n\n"
                await asyncio.sleep(0.015)
                
            yield "data: [DONE]\n\n"
        except Exception as e:
            system_logger.error(f"AI Streaming failed: {e}")
            yield f"data: {json.dumps({'error': 'AI Service failed to compute response.'})}\n\n"
