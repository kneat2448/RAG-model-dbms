from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from ..schemas import ProgressResponse
from ...db.models import Attempt, QuizSession, query_weak_chapters
from ...retrieval.vector_store import VectorStore
from .quiz import get_db

router = APIRouter()

# Singleton vector store for chapter listing
_vector_store = VectorStore()

@router.get("/chapters")
async def get_chapters():
    """Returns distinct chapters from the vector store."""
    try:
        results = _vector_store.collection.get(include=["metadatas"])
        chapters_set: dict[str, str] = {}
        for meta in results.get("metadatas", []):
            if meta and meta.get("chapter"):
                cid = meta["chapter"]
                if cid not in chapters_set:
                    chapters_set[cid] = cid
        chapter_list = [{"id": k, "title": v} for k, v in sorted(chapters_set.items())]
        return chapter_list
    except Exception:
        return []

@router.get("/{user_id}", response_model=ProgressResponse)
async def get_progress(user_id: str, db: Session = Depends(get_db)):
    """
    Returns aggregated progress for a user, including average scores per chapter
    and a list of overall weak chapters.
    """
    stats = (
        db.query(QuizSession.chapter_id, func.avg(Attempt.score), func.count(Attempt.id))
        .join(Attempt, Attempt.session_id == QuizSession.id)
        .filter(QuizSession.user_id == user_id)
        .group_by(QuizSession.chapter_id)
        .all()
    )

    chapter_scores = {chapter: float(score) for chapter, score, _ in stats}
    chapter_attempts = {chapter: int(cnt) for chapter, _, cnt in stats}

    weak_stats = query_weak_chapters(db)
    weak_chapters = [row[0] for row in weak_stats]

    return ProgressResponse(
        user_id=user_id,
        chapter_scores=chapter_scores,
        chapter_attempts=chapter_attempts,
        weak_chapters=weak_chapters
    )
