
import { useQuery } from '@tanstack/react-query';
import { useStore } from '../store/useStore';
import { Target, TrendingUp, AlertTriangle } from 'lucide-react';
import './Dashboard.css';

interface ProgressResponse {
  user_id: string;
  chapter_scores: Record<string, number>;
  chapter_attempts: Record<string, number>;
  weak_chapters: string[];
}

export default function Dashboard() {
  const { userId } = useStore();

  const { data: progress, isLoading, error } = useQuery<ProgressResponse>({
    queryKey: ['dashboard', userId],
    queryFn: async () => {
      const res = await fetch(`http://127.0.0.1:8000/api/progress/${userId}`);
      if (!res.ok) throw new Error('Failed to fetch progress');
      return res.json();
    }
  });

  if (isLoading) return <div className="loading-state">Loading your performance data...</div>;
  if (error) return <div className="error-state">Failed to load progress dashboard.</div>;

  const chapters = Object.keys(progress?.chapter_scores || {});
  const totalAttempts = Object.values(progress?.chapter_attempts || {}).reduce((a, b) => a + b, 0);

  return (
    <div className="dashboard-container">
      <div className="page-header">
        <h1>Performance Dashboard</h1>
        <p>Track your study progress and identify weak areas across all chapters.</p>
      </div>

      <div className="stats-grid">
        <div className="stat-card glass-panel">
          <div className="stat-icon">
            <Target size={24} className="text-accent" />
          </div>
          <div className="stat-content">
            <p className="stat-label">Total Attempts</p>
            <h3 className="stat-value">{totalAttempts}</h3>
          </div>
        </div>

        <div className="stat-card glass-panel">
          <div className="stat-icon">
            <TrendingUp size={24} className="text-success" />
          </div>
          <div className="stat-content">
            <p className="stat-label">Chapters Studied</p>
            <h3 className="stat-value">{chapters.length}</h3>
          </div>
        </div>

        <div className="stat-card glass-panel">
          <div className="stat-icon">
            <AlertTriangle size={24} className="text-danger" />
          </div>
          <div className="stat-content">
            <p className="stat-label">Weak Areas</p>
            <h3 className="stat-value">{progress?.weak_chapters?.length || 0}</h3>
          </div>
        </div>
      </div>

      <div className="charts-container">
        <div className="chart-panel glass-panel">
          <h2>Chapter Breakdown</h2>
          
          {chapters.length === 0 ? (
            <p className="text-muted">No quiz data available yet. Go take a quiz!</p>
          ) : (
            <div className="progress-bars">
              {chapters.map(chap => {
                const score = progress!.chapter_scores[chap];
                const isWeak = progress!.weak_chapters.includes(chap);
                
                return (
                  <div key={chap} className="progress-item">
                    <div className="progress-header">
                      <span>{chap} <span className="text-muted text-sm">({progress!.chapter_attempts[chap]} attempts)</span></span>
                      <span className={isWeak ? 'text-danger font-bold' : 'text-success font-bold'}>
                        {score.toFixed(1)}%
                      </span>
                    </div>
                    <div className="progress-track">
                      <div 
                        className={`progress-fill ${isWeak ? 'bg-danger' : 'bg-success'}`}
                        style={{ width: `${Math.max(0, Math.min(100, score))}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
