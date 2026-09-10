import React from 'react';
import { TrendingUp, Activity, CheckCircle2, Zap } from 'lucide-react';

interface LearningTrendProps {
  recentAccuracy: number; // 0 to 1
  errorStreak: number;
  averageHesitation: number; // 0 to 1
  totalInteractions: number;
  stateCounts?: {
    MASTERING?: number;
    PROGRESSING?: number;
    STRUGGLING?: number;
    RECOVERING?: number;
    FORGETTING?: number;
  };
}

export const LearningTrend: React.FC<LearningTrendProps> = ({
  recentAccuracy,
  errorStreak,
  averageHesitation,
  totalInteractions,
  stateCounts
}) => {
  const accuracyPct = Math.round(recentAccuracy * 100);
  const isHealthy = accuracyPct >= 70 && errorStreak === 0;

  return (
    <div className="bg-slate-900/70 backdrop-blur-md rounded-2xl p-6 border border-slate-800 shadow-xl">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-indigo-400" />
            Learning Trajectory & Trend
          </h3>
          <p className="text-xs text-slate-400">
            Dynamic longitudinal progress and cognitive performance trend
          </p>
        </div>
        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${
          isHealthy
            ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30'
            : 'text-amber-400 bg-amber-500/10 border-amber-500/30'
        }`}>
          {isHealthy ? 'Accelerating' : 'Fluctuating'}
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        <div className="bg-slate-900/80 p-3.5 rounded-xl border border-slate-800">
          <span className="text-xs text-slate-400 block mb-1">Recent Accuracy</span>
          <span className="text-2xl font-black text-white">{accuracyPct}%</span>
          <div className="w-full bg-slate-800 rounded-full h-1 mt-2 overflow-hidden">
            <div
              className={`h-full rounded-full ${accuracyPct >= 75 ? 'bg-emerald-500' : 'bg-amber-500'}`}
              style={{ width: `${accuracyPct}%` }}
            />
          </div>
        </div>

        <div className="bg-slate-900/80 p-3.5 rounded-xl border border-slate-800">
          <span className="text-xs text-slate-400 block mb-1">Avg Hesitation</span>
          <span className="text-2xl font-black text-white">{averageHesitation.toFixed(2)}</span>
          <div className="w-full bg-slate-800 rounded-full h-1 mt-2 overflow-hidden">
            <div
              className={`h-full rounded-full ${averageHesitation <= 0.35 ? 'bg-sky-500' : 'bg-amber-500'}`}
              style={{ width: `${Math.min(100, averageHesitation * 100)}%` }}
            />
          </div>
        </div>

        <div className="bg-slate-900/80 p-3.5 rounded-xl border border-slate-800">
          <span className="text-xs text-slate-400 block mb-1">Error Streak</span>
          <span className={`text-2xl font-black ${errorStreak > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
            {errorStreak}
          </span>
          <span className="text-[10px] text-slate-500 block mt-1">
            {errorStreak === 0 ? 'Optimal' : 'Active difficulty'}
          </span>
        </div>

        <div className="bg-slate-900/80 p-3.5 rounded-xl border border-slate-800">
          <span className="text-xs text-slate-400 block mb-1">Total Signals</span>
          <span className="text-2xl font-black text-white">{totalInteractions}</span>
          <span className="text-[10px] text-slate-500 block mt-1">Telemetry checkpoints</span>
        </div>
      </div>

      {stateCounts && (
        <div>
          <span className="text-xs font-semibold text-slate-400 block mb-2">
            Cognitive State Distribution
          </span>
          <div className="flex flex-wrap gap-2">
            <span className="px-2.5 py-1 rounded-lg text-xs bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
              Mastering: {stateCounts.MASTERING || 0}
            </span>
            <span className="px-2.5 py-1 rounded-lg text-xs bg-sky-500/10 text-sky-300 border border-sky-500/20">
              Progressing: {stateCounts.PROGRESSING || 0}
            </span>
            <span className="px-2.5 py-1 rounded-lg text-xs bg-amber-500/10 text-amber-300 border border-amber-500/20">
              Struggling: {stateCounts.STRUGGLING || 0}
            </span>
            <span className="px-2.5 py-1 rounded-lg text-xs bg-violet-500/10 text-violet-300 border border-violet-500/20">
              Recovering: {stateCounts.RECOVERING || 0}
            </span>
            <span className="px-2.5 py-1 rounded-lg text-xs bg-rose-500/10 text-rose-300 border border-rose-500/20">
              Retention Decay: {stateCounts.FORGETTING || 0}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
