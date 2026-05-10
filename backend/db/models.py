from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Float, select, func
from sqlalchemy.orm import declarative_base, relationship
import datetime

Base = declarative_base()

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True)
    email = Column(String, unique=True, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    
    sessions = relationship("QuizSession", back_populates="user")

class QuizSession(Base):
    __tablename__ = "quiz_sessions"
    
    id = Column(Integer, primary_key=True)
    user_id = Column(String)
    chapter_id = Column(String)
    started_at = Column(DateTime, default=datetime.datetime.utcnow)
    
    attempts = relationship("Attempt", back_populates="session")

class Attempt(Base):
    __tablename__ = "attempts"
    
    id = Column(Integer, primary_key=True)
    session_id = Column(Integer, ForeignKey("quiz_sessions.id"))
    chunk_id = Column(String)
    question = Column(String)
    student_answer = Column(String)
    score = Column(Float)
    feedback = Column(String)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    
    session = relationship("QuizSession", back_populates="attempts")

def query_weak_chapters(db_session):
    """
    Queries for chapters where the average score is less than 60.
    SELECT chapter_id, AVG(score) FROM attempts 
    JOIN quiz_sessions ON attempts.session_id = quiz_sessions.id
    GROUP BY chapter_id HAVING AVG(score) < 60
    """
    stmt = (
        select(QuizSession.chapter_id, func.avg(Attempt.score).label("avg_score"))
        .join(Attempt, Attempt.session_id == QuizSession.id)
        .group_by(QuizSession.chapter_id)
        .having(func.avg(Attempt.score) < 60)
    )
    return db_session.execute(stmt).all()

import os

# Database engine setup (using PostgreSQL)
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5433/dbms_rag")
