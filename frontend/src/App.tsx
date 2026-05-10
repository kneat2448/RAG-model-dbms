
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BookOpen, MessageSquare, LayoutDashboard, BrainCircuit } from 'lucide-react';
import ChapterBrowser from './pages/ChapterBrowser';
import ChatView from './pages/ChatView';
import QuizMode from './pages/QuizMode';
import Dashboard from './pages/Dashboard';
import './App.css';

const queryClient = new QueryClient();

const Navigation = () => {
  const location = useLocation();
  const isActive = (path: string) => location.pathname === path ? 'active' : '';

  return (
    <nav className="sidebar glass-panel">
      <div className="brand">
        <h2>DBMS RAG</h2>
        <p>Study Guide UI</p>
      </div>
      <div className="nav-links">
        <Link to="/" className={`nav-link ${isActive('/')}`}>
          <BookOpen size={20} /> Chapters
        </Link>
        <Link to="/chat" className={`nav-link ${isActive('/chat')}`}>
          <MessageSquare size={20} /> Q&A Chat
        </Link>
        <Link to="/quiz" className={`nav-link ${isActive('/quiz')}`}>
          <BrainCircuit size={20} /> Quiz Mode
        </Link>
        <Link to="/dashboard" className={`nav-link ${isActive('/dashboard')}`}>
          <LayoutDashboard size={20} /> Progress
        </Link>
      </div>
    </nav>
  );
};

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <div className="app-container">
          <Navigation />
          <main className="main-content">
            <Routes>
              <Route path="/" element={<ChapterBrowser />} />
              <Route path="/chat" element={<ChatView />} />
              <Route path="/quiz" element={<QuizMode />} />
              <Route path="/dashboard" element={<Dashboard />} />
            </Routes>
          </main>
        </div>
      </Router>
    </QueryClientProvider>
  );
}

export default App;
