import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Award, AlertTriangle, TrendingUp, CheckCircle2 } from 'lucide-react';

interface ProgressResponse {
  user_id: string;
  chapter_scores: Record<string, number>;
  chapter_attempts: Record<string, number>;
  weak_chapters: string[];
}

interface ChapterProgress {
  chapter_id: string;
  avg_score: number;
  total_attempts: number;
}

const ProgressPage: React.FC = () => {
  const { data: raw, isLoading } = useQuery<ProgressResponse>({
    queryKey: ['progress', 'user_123'],
    queryFn: async () => {
      const res = await fetch('/api/progress/user_123');
      return res.json();
    },
  });

  // Transform backend dict format into array for rendering
  const progress: ChapterProgress[] = raw
    ? Object.entries(raw.chapter_scores).map(([chapter_id, avg_score]) => ({
        chapter_id,
        avg_score,
        total_attempts: raw.chapter_attempts?.[chapter_id] ?? 0,
      }))
    : [];

  if (isLoading) {
    return (
      <div className="h-96 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary rounded-full border-t-transparent animate-spin" />
      </div>
    );
  }

  const overallAvg = progress.length
    ? progress.reduce((acc, curr) => acc + curr.avg_score, 0) / progress.length
    : 0;

  const weakChapters = progress.filter(p => p.avg_score < 60);

  return (
    <div className="max-w-4xl mx-auto space-y-12 animate-in">
      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass p-6 rounded-2xl border border-white/10 flex flex-col gap-2">
          <div className="p-3 bg-primary/10 text-primary rounded-xl w-fit">
            <Award size={24} />
          </div>
          <p className="text-3xl font-bold font-[family-name:var(--font-mono)] mt-2">{overallAvg.toFixed(1)}%</p>
          <p className="text-xs uppercase tracking-widest opacity-50 font-[family-name:var(--font-mono)]">Overall Proficiency</p>
        </div>

        <div className="glass p-6 rounded-2xl border border-white/10 flex flex-col gap-2">
          <div className="p-3 bg-success/10 text-success rounded-xl w-fit">
            <TrendingUp size={24} />
          </div>
          <p className="text-3xl font-bold font-[family-name:var(--font-mono)] mt-2">{progress.length}</p>
          <p className="text-xs uppercase tracking-widest opacity-50 font-[family-name:var(--font-mono)]">Chapters Explored</p>
        </div>

        <div className="glass p-6 rounded-2xl border border-white/10 flex flex-col gap-2">
          <div className="p-3 bg-error/10 text-error rounded-xl w-fit">
            <AlertTriangle size={24} />
          </div>
          <p className="text-3xl font-bold font-[family-name:var(--font-mono)] mt-2">{weakChapters.length}</p>
          <p className="text-xs uppercase tracking-widest opacity-50 font-[family-name:var(--font-mono)]">Weak Areas Found</p>
        </div>
      </div>

      {/* Chapter Breakdown */}
      <div className="space-y-6">
        <h3 className="text-xl font-bold font-[family-name:var(--font-mono)] uppercase tracking-wider flex items-center gap-3">
          <CheckCircle2 size={24} className="text-primary" />
          Chapter Mastery
        </h3>

        <div className="grid gap-6">
          {progress.map((p) => (
            <div key={p.chapter_id} className="glass p-6 rounded-2xl border border-white/10 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-lg font-bold">Chapter {p.chapter_id}</h4>
                  <p className="text-xs opacity-50 font-[family-name:var(--font-mono)] uppercase">{p.total_attempts} Attempts recorded</p>
                </div>
                <span className={`text-xl font-bold font-[family-name:var(--font-mono)] ${p.avg_score < 60 ? 'text-error' : 'text-success'}`}>
                  {p.avg_score.toFixed(0)}%
                </span>
              </div>

              <div className="relative h-4 bg-white/5 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-1000 ease-out ${p.avg_score < 60 ? 'bg-error' : 'bg-success'}`}
                  style={{ width: `${p.avg_score}%` }}
                />
                {p.avg_score < 60 && (
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent to-white/10 animate-pulse" />
                )}
              </div>

              {p.avg_score < 60 && (
                <div className="flex items-center gap-2 text-error text-[10px] font-[family-name:var(--font-mono)] uppercase tracking-widest font-bold bg-error/10 px-3 py-1.5 rounded w-fit border border-error/20">
                  <AlertTriangle size={12} />
                  Requires Review
                </div>
              )}
            </div>
          ))}

          {progress.length === 0 && (
            <div className="text-center py-24 glass rounded-2xl border border-dashed border-white/10">
              <p className="opacity-30 font-[family-name:var(--font-mono)] uppercase tracking-widest">No activity data found yet.</p>
              <p className="text-xs opacity-20 mt-2">Start a quiz to track your progress!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProgressPage;
