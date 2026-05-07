import { create } from 'zustand';

interface Question {
  chunk_id: string;
  question: string;
  options: string[];
}

interface QuizState {
  session: number | null;
  questions: Question[];
  answers: Record<string, string>;
  scores: Record<string, any>;
  setSession: (session: number | null) => void;
  setQuestions: (questions: Question[]) => void;
  submitAnswer: (questionId: string, answer: string) => void;
  setScore: (questionId: string, score: any) => void;
  resetQuiz: () => void;
}

export const useQuizStore = create<QuizState>((set) => ({
  session: null,
  questions: [],
  answers: {},
  scores: {},
  setSession: (session) => set({ session }),
  setQuestions: (questions) => set({ questions }),
  submitAnswer: (questionId, answer) => 
    set((state) => ({ 
      answers: { ...state.answers, [questionId]: answer } 
    })),
  setScore: (questionId, score) =>
    set((state) => ({
      scores: { ...state.scores, [questionId]: score }
    })),
  resetQuiz: () => set({ session: null, questions: [], answers: {}, scores: {} }),
}));
