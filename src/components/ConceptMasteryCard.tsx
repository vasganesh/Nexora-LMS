import React from 'react';
import { Target, Flame, CheckCircle2, BookOpen } from 'lucide-react';

export interface ConceptMasteryItem {
  id: string;
  topicId: string;
  masteryScore: number; // 0.0 to 1.0
  attempts: number;
  streak: number;
  status: string; // 'MASTERED' | 'IN_PROGRESS' | 'STRUGGLING'
  topic?: {
    name: string;
  };
}

interface ConceptMasteryCardProps {
  masteries: ConceptMasteryItem[];
  title?: string;
}

export const ConceptMasteryCard: React.FC<ConceptMasteryCardProps> = ({
  masteries,
  title = 'Concept-Level Mastery & Retention'
}) => {
  if (!masteries || masteries.length === 0) {
    return (
      <div className="bg-slate-900/60 rounded-2xl p-6 border border-slate-800 text-center">
        <p className="text-sm text-slate-400">
          No concept mastery data yet. Take topic quizzes to map fine-grained concept mastery.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-slate-900/70 backdrop-blur-md rounded-2xl p-6 border border-slate-800 shadow-xl">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
            <Target className="w-5 h-5 text-indigo-400" />
            {title}
          </h3>
          <p className="text-xs text-slate-400">
            Targeted concept mastery tracked independently from broad subject grades
          </p>
        </div>
        <span className="text-xs font-mono text-slate-400">
          {masteries.length} Concepts Tracked
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {masteries.map((item) => {
          const scorePct = Math.round(item.masteryScore * 100);
          const isMastered = item.status === 'MASTERED' || scorePct >= 85;
          const isStruggling = item.status === 'STRUGGLING' || (scorePct < 50 && item.attempts >= 2);

          const badgeColor = isMastered
            ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30'
            : isStruggling
            ? 'text-amber-400 bg-amber-500/10 border-amber-500/30'
            : 'text-sky-400 bg-sky-500/10 border-sky-500/30';

          const statusLabel = isMastered ? 'Mastered' : isStruggling ? 'Needs Practice' : 'In Progress';

          return (
            <div
              key={item.id}
              className="bg-slate-900/80 rounded-xl p-4 border border-slate-800 hover:border-slate-700 transition-all"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-indigo-400" />
                  <span className="text-sm font-semibold text-white">
                    {item.topic?.name || 'Topic Concept'}
                  </span>
                </div>
                <span className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${badgeColor}`}>
                  {statusLabel}
                </span>
              </div>

              {/* Progress bar */}
              <div className="mt-3">
                <div className="flex justify-between text-xs text-slate-400 mb-1">
                  <span>Mastery Level</span>
                  <span className="font-bold text-white">{scorePct}%</span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      isMastered ? 'bg-emerald-500' : isStruggling ? 'bg-amber-500' : 'bg-sky-500'
                    }`}
                    style={{ width: `${scorePct}%` }}
                  />
                </div>
              </div>

              {/* Stats footer */}
              <div className="flex items-center justify-between text-xs text-slate-400 mt-3 pt-2 border-t border-slate-800/80">
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-slate-500" />
                  {item.attempts} {item.attempts === 1 ? 'attempt' : 'attempts'}
                </span>
                {item.streak > 0 && (
                  <span className="flex items-center gap-1 text-amber-400 font-semibold">
                    <Flame className="w-3.5 h-3.5 fill-amber-400" />
                    {item.streak} correct streak
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
