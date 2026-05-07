import json
from fastapi import APIRouter
from sse_starlette.sse import EventSourceResponse
from ..schemas import ChatRequest
from ...retrieval.retriever import HybridRetriever
from ...generation.llm_client import LLMClient
from ...generation.prompts import QA_PROMPT

router = APIRouter()

# Initialize components (singleton-like for the module)
# In production, these would be managed by a dependency injection system
retriever = HybridRetriever()
llm_client = LLMClient()

@router.post("/stream")
async def chat_stream(request: ChatRequest):
    """
    Handles streaming chat requests using Hybrid Retrieval + LLM Generation.
    Returns an SSE stream of tokens and source metadata.
    """
    # 1. Retrieve & Rerank
    # retrieves top-5 chunks via hybrid + reranking
    results = retriever.retrieve(request.query, chapter_filter=request.chapter_id)
    
    # 2. Build context block and collect metadata
    context_parts = []
    sources = []
    for i, res in enumerate(results):
        context_parts.append(f"[{i+1}] (Page {res['metadata'].get('page_start')}): {res['content']}")
        sources.append({
            "id": i+1,
            "page": res['metadata'].get('page_start'),
            "chapter": res['metadata'].get('chapter'),
            "section": res['metadata'].get('section'),
            "content": res['content']
        })
    
    context_block = "\n\n".join(context_parts)
    
    # 3. Format Prompt
    prompt = QA_PROMPT.format(
        context_block=context_block,
        query=request.query
    )

    async def event_generator():
        # Step 1: Yield source metadata immediately
        yield {
            "event": "metadata",
            "data": json.dumps({"sources": sources})
        }
        
        # Step 2: Stream response tokens from LLM
        # Note: Gemini's stream is wrapped in LLMClient
        for token in llm_client.stream_completion(prompt):
            yield {
                "event": "token",
                "data": token
            }
            
        # Step 3: End of stream
        yield {
            "event": "end",
            "data": "[DONE]"
        }

    return EventSourceResponse(event_generator())
