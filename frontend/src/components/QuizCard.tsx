import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, XCircle, Send, Loader2 } from 'lucide-react';
import { useQuizStore } from '../store/quizStore';

interface QuizCardProps {
  question: {
    chunk_id: string;
    question: string;
  };
  sessionId: number;
}

const QuizCard: React.FC<QuizCardProps> = ({ question, sessionId }) => {
  const [answer, setAnswer] = useState('');
  const [result, setResult] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const setScore = useQuizStore((state) => state.setScore);

  const handleSubmit = async () => {
    if (!answer.trim()) return;

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/quiz/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionId,
          chunk_id: question.chunk_id,
          question: question.question,
          answer: answer,
        }),
      });

      const data = await response.json();
      setResult(data);
      setScore(question.chunk_id, data.score);
    } catch (error) {
      console.error('Failed to submit answer:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.div 
      layout
      className="glass p-6 rounded-xl mb-6 flex flex-col gap-4 border border-white/20 shadow-xl"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="flex items-start justify-between gap-4">
        <h3 className="text-lg font-medium leading-relaxed font-mono">
          <span className="text-primary opacity-50 mr-2">#</span>
          {question.question}
        </h3>
        {result && (
          <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm font-bold ${
            result.score >= 70 ? 'bg-success/20 text-success' : 'bg-error/20 text-error'
          }`}>
            {result.score >= 70 ? <CheckCircle size={16} /> : <XCircle size={16} />}
            {result.score}%
          </div>
        )}
      </div>

      {!result ? (
        <div className="flex flex-col gap-3">
          <textarea
            className="w-full bg-black/5 dark:bg-white/5 border border-white/10 rounded-lg p-3 font-mono text-sm min-h-[100px] focus:ring-2 focus:ring-primary outline-none transition-all"
            placeholder="Type your answer here..."
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            disabled={isSubmitting}
          />
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || !answer.trim()}
            className="self-end primary-btn flex items-center gap-2 disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Grading...
              </>
            ) : (
              <>
                <Send size={18} />
                Submit
              </>
            )}
          </button>
        </div>
      ) : (
        <motion.div 
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="flex flex-col gap-4 border-t border-white/10 pt-4"
        >
          <div className="flex flex-col gap-2">
            <span className="text-xs font-bold uppercase tracking-wider opacity-50">Feedback</span>
            <p className="text-sm italic opacity-80 leading-relaxed">{result.feedback}</p>
          </div>

          {result.missed_concepts && result.missed_concepts.length > 0 && (
            <div className="flex flex-col gap-2">
              <span className="text-xs font-bold uppercase tracking-wider opacity-50">Missed Concepts</span>
              <div className="flex flex-wrap gap-2">
                {result.missed_concepts.map((concept: string, idx: number) => (
                  <span 
                    key={idx}
                    className="px-2 py-1 bg-primary/10 text-primary text-[10px] uppercase font-bold rounded border border-primary/20"
                  >
                    {concept}
                  </span>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      )}
    </motion.div>
  );
};

export default QuizCard;
