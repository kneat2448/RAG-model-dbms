import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, NavLink } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MessageSquare, BookOpen, BarChart3, Sun, Moon } from 'lucide-react';
import ChatPage from './pages/ChatPage';
import QuizPage from './pages/QuizPage';
import ProgressPage from './pages/ProgressPage';

const queryClient = new QueryClient();

const App: React.FC = () => {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('theme') as 'light' | 'dark') || 'dark';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light');

  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <div className="min-h-screen flex flex-col font-sans">
          {/* Header */}
          <header className="sticky top-0 z-50 glass border-b border-white/10 px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center text-white font-mono font-bold text-xl">
                DB
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight">DBMS RAG</h1>
                <p className="text-[10px] uppercase tracking-[0.2em] opacity-50 font-mono">Knowledge Assistant</p>
              </div>
            </div>

            <nav className="hidden md:flex items-center gap-8 font-mono text-sm uppercase tracking-wider">
              <NavLink 
                to="/" 
                className={({isActive}) => `flex items-center gap-2 transition-colors ${isActive ? 'text-primary' : 'opacity-60 hover:opacity-100'}`}
              >
                <MessageSquare size={18} /> Chat
              </NavLink>
              <NavLink 
                to="/quiz" 
                className={({isActive}) => `flex items-center gap-2 transition-colors ${isActive ? 'text-primary' : 'opacity-60 hover:opacity-100'}`}
              >
                <BookOpen size={18} /> Quiz
              </NavLink>
              <NavLink 
                to="/progress" 
                className={({isActive}) => `flex items-center gap-2 transition-colors ${isActive ? 'text-primary' : 'opacity-60 hover:opacity-100'}`}
              >
                <BarChart3 size={18} /> Progress
              </NavLink>
            </nav>

            <button 
              onClick={toggleTheme}
              className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
            >
              {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
            </button>
          </header>

          {/* Main Content */}
          <main className="flex-1 container mx-auto px-4 py-8 max-w-5xl">
            <Routes>
              <Route path="/" element={<ChatPage />} />
              <Route path="/quiz" element={<QuizPage />} />
              <Route path="/progress" element={<ProgressPage />} />
            </Routes>
          </main>

          {/* Mobile Nav */}
          <nav className="md:hidden fixed bottom-0 left-0 right-0 glass border-t border-white/10 px-6 py-3 flex items-center justify-around z-50">
            <NavLink to="/" className={({isActive}) => isActive ? 'text-primary' : 'opacity-50'}><MessageSquare size={24} /></NavLink>
            <NavLink to="/quiz" className={({isActive}) => isActive ? 'text-primary' : 'opacity-50'}><BookOpen size={24} /></NavLink>
            <NavLink to="/progress" className={({isActive}) => isActive ? 'text-primary' : 'opacity-50'}><BarChart3 size={24} /></NavLink>
          </nav>
        </div>
      </Router>
    </QueryClientProvider>
  );
};

export default App;
