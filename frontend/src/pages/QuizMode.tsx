import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useStore } from '../store/useStore';
import { Brain, CheckCircle, XCircle, AlertCircle, ArrowRight } from 'lucide-react';
import './QuizMode.css';

interface MCQ {
  chunk_id: string;
  question: string;
  options: string[];
}

interface QuizResponse {
  session_id: number;
  questions: MCQ[];
}

export default function QuizMode() {
  const { activeChapterId, userId } = useStore();
  const queryClient = useQueryClient();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answer, setAnswer] = useState('');
  const [feedback, setFeedback] = useState<any | null>(null);

  // Fetch Quiz Questions
  const { data: quizData, isLoading, error } = useQuery<QuizResponse>({
    queryKey: ['quiz', activeChapterId],
    queryFn: async () => {
      const res = await fetch('http://127.0.0.1:8000/api/quiz/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chapter_id: activeChapterId, user_id: userId, n: 3 })
      });
      if (!res.ok) throw new Error('Failed to generate quiz');
      return res.json();
    },
    enabled: !!activeChapterId,
    refetchOnWindowFocus: false,
  });

  // Submit Answer Mutation
  const submitMutation = useMutation({
    mutationFn: async (payload: { session_id: number, chunk_id: string, question: string, answer: string }) => {
      const res = await fetch('http://127.0.0.1:8000/api/quiz/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error('Failed to grade answer');
      return res.json();
    },
    onSuccess: () => {
      // Invalidate dashboard stats since a new attempt was recorded
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    }
  });

  if (!activeChapterId) {
    return (
      <div className="empty-state glass-panel" style={{ margin: 'auto', marginTop: '10vh' }}>
        <Brain size={48} className="text-muted mb-4" />
        <h2>Select a Chapter First</h2>
        <p>You need to select a chapter from the Browser to generate a quiz.</p>
      </div>
    );
  }

  if (isLoading) return <div className="loading-state">Generating specialized quiz...</div>;
  if (error || !quizData?.questions?.length) return <div className="error-state">Failed to load quiz.</div>;

  const currentQuestion = quizData.questions[currentIndex];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!answer.trim() || submitMutation.isPending) return;

    submitMutation.mutate({
      session_id: quizData.session_id,
      chunk_id: currentQuestion.chunk_id,
      question: currentQuestion.question,
      answer
    }, {
      onSuccess: (data) => setFeedback(data)
    });
  };

  const handleNext = () => {
    setAnswer('');
    setFeedback(null);
    if (currentIndex < quizData.questions.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      // Quiz complete
      setCurrentIndex(-1);
    }
  };

  if (currentIndex === -1) {
    return (
      <div className="empty-state glass-panel" style={{ margin: 'auto', marginTop: '10vh' }}>
        <CheckCircle size={48} className="text-success mb-4" />
        <h2>Quiz Complete!</h2>
        <p>You've answered all questions for this session.</p>
        <button className="btn btn-primary mt-4" onClick={() => window.location.reload()}>Try Another</button>
      </div>
    );
  }

  return (
    <div className="quiz-container">
      <div className="page-header">
        <h1>Quiz Mode</h1>
        <p>Chapter: {activeChapterId} | Question {currentIndex + 1} of {quizData.questions.length}</p>
      </div>

      <div className="quiz-card glass-panel">
        <h2 className="question-text">{currentQuestion.question}</h2>
        
        {/* We use free-form text even though it's technically MCQ prompt on backend to showcase LLM grading! */}
        {!feedback ? (
          <form onSubmit={handleSubmit}>
            <textarea
              className="input quiz-textarea"
              placeholder="Type your answer here..."
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              disabled={submitMutation.isPending}
            />
            <div className="quiz-actions">
              <button 
                type="submit" 
                className="btn btn-primary" 
                disabled={!answer.trim() || submitMutation.isPending}
              >
                {submitMutation.isPending ? 'Grading...' : 'Submit Answer'}
              </button>
            </div>
          </form>
        ) : (
          <div className="feedback-section animation-slide-up">
            <div className="score-badge">
              {feedback.score >= 80 ? <CheckCircle className="text-success" size={32} /> : 
               feedback.score >= 50 ? <AlertCircle className="text-warning" size={32} /> :
               <XCircle className="text-danger" size={32} />}
              <span className="score-value">{feedback.score}/100</span>
            </div>
            
            <div className="feedback-content">
              <h3>AI Feedback</h3>
              <p>{feedback.feedback}</p>
              
              {feedback.missed_concepts?.length > 0 && (
                <div className="missed-concepts">
                  <h4>Missed Concepts:</h4>
                  <ul>
                    {feedback.missed_concepts.map((c: string, i: number) => <li key={i}>{c}</li>)}
                  </ul>
                </div>
              )}
            </div>

            <div className="quiz-actions">
              <button className="btn btn-primary" onClick={handleNext}>
                Next Question <ArrowRight size={18} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
