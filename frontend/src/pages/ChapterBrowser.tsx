
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { BookMarked, ArrowRight } from 'lucide-react';
import { useStore } from '../store/useStore';
import './ChapterBrowser.css';

interface Chapter {
  id: string;
  title: string;
}

export default function ChapterBrowser() {
  const navigate = useNavigate();
  const { setActiveChapter, activeChapterId } = useStore();

  const { data: chapters, isLoading, error } = useQuery<Chapter[]>({
    queryKey: ['chapters'],
    queryFn: async () => {
      const res = await fetch('http://127.0.0.1:8000/api/progress/chapters');
      if (!res.ok) throw new Error('Failed to fetch chapters');
      return res.json();
    }
  });

  const handleSelectChapter = (chapter: Chapter) => {
    setActiveChapter(chapter.id, chapter.title);
    navigate('/chat');
  };

  if (isLoading) return <div className="loading-state">Loading chapters...</div>;
  if (error) return <div className="error-state">Failed to load chapters. Is the API running?</div>;

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Chapter Browser</h1>
        <p>Select a chapter to focus your study session and quiz generation.</p>
      </div>

      <div className="chapters-grid">
        {chapters?.map((chapter) => (
          <div 
            key={chapter.id} 
            className={`chapter-card glass-panel ${activeChapterId === chapter.id ? 'active-card' : ''}`}
            onClick={() => handleSelectChapter(chapter)}
          >
            <div className="chapter-icon">
              <BookMarked size={24} />
            </div>
            <div className="chapter-content">
              <h3>{chapter.id}</h3>
              <p className="chapter-title">{chapter.title || 'Introduction'}</p>
            </div>
            <div className="chapter-action">
              <ArrowRight size={20} />
            </div>
          </div>
        ))}
        {(!chapters || chapters.length === 0) && (
          <div className="empty-state glass-panel">
            <p>No chapters found in the vector database.</p>
          </div>
        )}
      </div>
    </div>
  );
}
