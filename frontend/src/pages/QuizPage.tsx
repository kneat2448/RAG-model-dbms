import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Book, Play, RotateCcw, ChevronRight, Loader2 } from 'lucide-react';
import { useQuizStore } from '../store/quizStore';
import QuizCard from '../components/QuizCard';

const QuizPage: React.FC = () => {
  const [selectedChapter, setSelectedChapter] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  
  const { session, questions, answers, setSession, setQuestions, resetQuiz } = useQuizStore();

  // Fetch chapters
  const { data: chapters } = useQuery<any[]>({
    queryKey: ['chapters'],
    queryFn: async () => {
      const res = await fetch('/api/progress/chapters');
      return res.json();
    },
  });

  const handleStartQuiz = async () => {
    if (!selectedChapter) return;
    
    setIsGenerating(true);
    try {
      const response = await fetch('/api/quiz/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: 'user_123', // Static for now
          chapter_id: selectedChapter,
          n: 3
        }),
      });
      
      const data = await response.json();
      setSession(data.session_id);
      setQuestions(data.questions);
    } catch (error) {
      console.error('Failed to generate quiz:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const answeredCount = Object.keys(answers).length;
  const progress = questions.length > 0 ? (answeredCount / questions.length) * 100 : 0;

  if (!session) {
    return (
      <div className="max-w-2xl mx-auto py-12 flex flex-col items-center gap-8 animate-in">
        <div className="text-center space-y-2">
          <h2 className="text-3xl font-bold font-mono tracking-tighter">KNOWLEDGE CHECK</h2>
          <p className="opacity-50 text-sm">Select a chapter to begin your evaluation</p>
        </div>

        <div className="w-full grid gap-4">
          {chapters?.map((chapter) => (
            <button
              key={chapter.id}
              onClick={() => setSelectedChapter(chapter.id)}
              className={`flex items-center justify-between p-5 rounded-2xl border transition-all ${
                selectedChapter === chapter.id 
                  ? 'bg-primary/10 border-primary ring-1 ring-primary' 
                  : 'glass border-white/10 hover:border-white/30'
              }`}
            >
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-xl ${selectedChapter === chapter.id ? 'bg-primary text-white' : 'bg-white/5'}`}>
                  <Book size={20} />
                </div>
                <div className="text-left">
                  <p className="font-bold text-lg">{chapter.title}</p>
                  <p className="text-xs opacity-50 uppercase tracking-widest font-mono">Chapter ID: {chapter.id}</p>
                </div>
              </div>
              <ChevronRight size={20} className={selectedChapter === chapter.id ? 'text-primary' : 'opacity-20'} />
            </button>
          ))}
        </div>

        <button
          onClick={handleStartQuiz}
          disabled={!selectedChapter || isGenerating}
          className="mt-4 w-full py-4 bg-primary text-white rounded-2xl font-bold uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-primary-hover transition-all disabled:opacity-50"
        >
          {isGenerating ? (
            <>
              <Loader2 size={24} className="animate-spin" />
              Generating Quiz...
            </>
          ) : (
            <>
              <Play size={24} fill="currentColor" />
              Start Quiz
            </>
          )}
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto py-6 animate-in">
      <div className="sticky top-[88px] z-40 mb-8 glass p-4 rounded-2xl border border-white/10 flex items-center gap-6">
        <div className="flex-1 bg-white/5 h-3 rounded-full overflow-hidden">
          <div 
            className="h-full bg-primary transition-all duration-500" 
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="flex items-center gap-4">
          <span className="font-mono text-sm font-bold">{answeredCount} / {questions.length}</span>
          <button 
            onClick={resetQuiz}
            className="p-2 hover:bg-white/10 rounded-full transition-colors text-error"
            title="Reset Quiz"
          >
            <RotateCcw size={18} />
          </button>
        </div>
      </div>

      <div className="space-y-6 pb-12">
        {questions.map((q) => (
          <QuizCard key={q.chunk_id} question={q} sessionId={session!} />
        ))}
      </div>
      
      {answeredCount === questions.length && questions.length > 0 && (
        <div className="text-center py-12 animate-in">
          <h3 className="text-2xl font-bold font-mono mb-2">QUIZ COMPLETE</h3>
          <p className="opacity-50 mb-8">Review your scores and head to the Progress page for insights.</p>
          <button 
            onClick={resetQuiz}
            className="px-8 py-3 bg-white/5 hover:bg-white/10 rounded-xl font-mono text-sm uppercase tracking-widest border border-white/10 transition-all"
          >
            Take Another Quiz
          </button>
        </div>
      )}
    </div>
  );
};

export default QuizPage;
