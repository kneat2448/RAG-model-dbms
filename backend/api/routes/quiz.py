import json
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from ..schemas import QuizRequest, QuizResponse, MCQ, SubmitAnswer
from ...generation.quiz_generator import QuizGenerator
from ...generation.llm_client import LLMClient
from ...generation.prompts import GRADE_PROMPT
from ...db.models import QuizSession, Attempt
from ..limiter import limiter
from fastapi import Request

router = APIRouter()
quiz_gen = QuizGenerator()
llm_client = LLMClient()

import os

# Database setup
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5433/dbms_rag")
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Dependency to get DB session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.post("/generate", response_model=QuizResponse)
@limiter.limit("10/minute")
async def generate_quiz(payload: QuizRequest, request: Request, db: Session = Depends(get_db)):
    """
    Generates n MCQ questions for a chapter and stores the session.
    """
    # 1. Generate quiz questions from chunks
    # Note: QuizGenerator.generate_quiz returns a list of MCQ dicts
    raw_questions = quiz_gen.generate_quiz(payload.chapter_id, n=payload.n)
    
    if not raw_questions:
        raise HTTPException(status_code=404, detail="No content found for this chapter to generate a quiz.")

    # 2. Create and store the QuizSession
    new_session = QuizSession(
        user_id=payload.user_id,
        chapter_id=payload.chapter_id
    )
    db.add(new_session)
    db.commit()
    db.refresh(new_session)

    # 3. Format response (strip correct_index for the client)
    formatted_questions = []
    for q in raw_questions:
        formatted_questions.append(MCQ(
            chunk_id=q.get("chunk_id", "unknown"),
            question=q.get("question", ""),
            options=q.get("options", [])
        ))

    return QuizResponse(
        session_id=new_session.id,
        questions=formatted_questions
    )

@router.post("/submit")
async def submit_answer(request: SubmitAnswer, db: Session = Depends(get_db)):
    """
    Grades a student's answer using the LLM and stores the attempt.
    """
    # 1. Fetch chunk content from VectorStore for grading context
    # Note: We use the chunk_id provided by the client
    chunk_results = quiz_gen.vector_store.collection.get(ids=[request.chunk_id])
    if not chunk_results["documents"]:
        raise HTTPException(status_code=404, detail="Source chunk not found for grading.")
    
    chunk_text = chunk_results["documents"][0]

    # 2. Call LLM to grade the answer
    # We use a blank reference answer as the model will use the chunk text to judge
    prompt = GRADE_PROMPT.format(
        chunk_text=chunk_text,
        reference_answer="Use the source material to determine correctness.",
        student_answer=request.answer
    )
    
    grade_response = llm_client.create_completion(prompt)
    
    try:
        # Extract and parse JSON
        clean_json = grade_response.strip()
        if "```json" in clean_json:
            clean_json = clean_json.split("```json")[1].split("```")[0].strip()
        elif "```" in clean_json:
            clean_json = clean_json.split("```")[1].strip()
            
        grade_data = json.loads(clean_json)
    except Exception as e:
        print(f"Grading parse error: {e}\nResponse: {grade_response}")
        # Fallback if LLM fails to return perfect JSON
        grade_data = {
            "score": 0,
            "feedback": "Error processing grade. Please try again.",
            "missed_concepts": []
        }

    # 3. Store the Attempt in DB
    new_attempt = Attempt(
        session_id=request.session_id,
        chunk_id=request.chunk_id,
        question=request.question,
        student_answer=request.answer,
        score=float(grade_data.get("score", 0)),
        feedback=grade_data.get("feedback", ""),
    )
    db.add(new_attempt)
    db.commit()

    return grade_data
