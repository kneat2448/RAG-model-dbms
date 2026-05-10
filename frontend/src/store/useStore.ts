import { create } from 'zustand';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: any[];
}

interface AppState {
  userId: string;
  activeChapterId: string | null;
  activeChapterTitle: string | null;
  chatHistory: ChatMessage[];
  setUserId: (id: string) => void;
  setActiveChapter: (id: string | null, title: string | null) => void;
  addChatMessage: (msg: ChatMessage) => void;
  updateLastMessage: (content: string, sources?: any[]) => void;
  clearChat: () => void;
}

export const useStore = create<AppState>((set) => ({
  userId: 'student', // Hardcoded as requested
  activeChapterId: null,
  activeChapterTitle: null,
  chatHistory: [],
  setUserId: (id) => set({ userId: id }),
  setActiveChapter: (id, title) => set({ activeChapterId: id, activeChapterTitle: title, chatHistory: [] }),
  addChatMessage: (msg) => set((state) => ({ chatHistory: [...state.chatHistory, msg] })),
  updateLastMessage: (content, sources) => set((state) => {
    const history = [...state.chatHistory];
    if (history.length > 0 && history[history.length - 1].role === 'assistant') {
      history[history.length - 1] = {
        ...history[history.length - 1],
        content,
        sources: sources || history[history.length - 1].sources
      };
    }
    return { chatHistory: history };
  }),
  clearChat: () => set({ chatHistory: [] })
}));
