from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime

class ChatRequest(BaseModel):
    query: str
    chapter_id: Optional[str] = None

class QuizRequest(BaseModel):
    chapter_id: str
    n: int = 5
    user_id: str

class SubmitAnswer(BaseModel):
    session_id: int
    chunk_id: str
    question: str
    answer: str

class ProgressResponse(BaseModel):
    user_id: str
    chapter_scores: Dict[str, float]
    chapter_attempts: Dict[str, int] = {}
    weak_chapters: List[str]

class MCQ(BaseModel):
    chunk_id: str
    question: str
    options: List[str]
    # correct_index is hidden from the client

class QuizResponse(BaseModel):
    session_id: int
    questions: List[MCQ]
