import React from 'react';
import { Brain, Sparkles, TrendingUp, AlertTriangle, RefreshCw, Award, Activity } from 'lucide-react';

export interface LearnerStateCardProps {
  state: 'PROGRESSING' | 'MASTERING' | 'STRUGGLING' | 'RECOVERING' | 'FORGETTING' | string;
  confidence: number;
  topicName: string;
  hierarchyPath?: string;
  reasons: string[];
  hesitationIndex?: number;
  recommendedAction?: string;
  interventionLevel?: number;
  lastUpdated?: string;
}

const STATE_CONFIG: Record<string, { label: string; color: string; bg: string; border: string; icon: any }> = {
  MASTERING: {
    label: 'Mastering',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/30',
    icon: Award
  },
  PROGRESSING: {
    label: 'Progressing',
    color: 'text-sky-400',
    bg: 'bg-sky-500/10',
    border: 'border-sky-500/30',
    icon: TrendingUp
  },
  STRUGGLING: {
    label: 'Struggling',
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/30',
    icon: AlertTriangle
  },
  RECOVERING: {
    label: 'Recovering',
    color: 'text-violet-400',
    bg: 'bg-violet-500/10',
    border: 'border-violet-500/30',
    icon: RefreshCw
  },
  FORGETTING: {
    label: 'Retention Decay',
    color: 'text-rose-400',
    bg: 'bg-rose-500/10',
    border: 'border-rose-500/30',
    icon: Activity
  }
};

export const LearnerStateCard: React.FC<LearnerStateCardProps> = ({
  state,
  confidence,
  topicName,
  hierarchyPath,
  reasons,
  hesitationIndex,
  recommendedAction,
  interventionLevel,
  lastUpdated
}) => {
  const config = STATE_CONFIG[state] || STATE_CONFIG.PROGRESSING;
  const IconComponent = config.icon;
  const confidencePct = Math.round(confidence <= 1.0 ? confidence * 100 : confidence);

  return (
    <div className={`rounded-2xl p-6 border ${config.border} ${config.bg} backdrop-blur-sm transition-all duration-300 shadow-lg relative overflow-hidden`}>
      {/* Background ambient glow */}
      <div className="absolute -top-12 -right-12 w-40 h-40 rounded-full bg-gradient-to-br from-indigo-500/10 to-transparent blur-2xl pointer-events-none" />

      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          {hierarchyPath && (
            <span className="text-xs font-medium text-slate-400 tracking-wide uppercase block mb-1">
              {hierarchyPath}
            </span>
          )}
          <h3 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
            {topicName}
          </h3>
        </div>

        <div className={`px-3 py-1.5 rounded-full border ${config.border} ${config.bg} flex items-center gap-1.5`}>
          <IconComponent className={`w-4 h-4 ${config.color}`} />
          <span className={`text-xs font-semibold uppercase tracking-wider ${config.color}`}>
            {config.label}
          </span>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <div className="bg-slate-900/60 rounded-xl p-3 border border-slate-800/80">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>Model Confidence</span>
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl font-black text-white">{confidencePct}%</span>
            <span className="text-xs text-slate-500">calibrated</span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-1.5 mt-2 overflow-hidden">
            <div
              className="bg-indigo-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${confidencePct}%` }}
            />
          </div>
        </div>

        {typeof hesitationIndex === 'number' && (
          <div className="bg-slate-900/60 rounded-xl p-3 border border-slate-800/80">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
              <span>Hesitation Index</span>
              <Brain className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl font-black text-white">{hesitationIndex.toFixed(2)}</span>
              <span className="text-xs text-slate-500">
                {hesitationIndex >= 0.6 ? 'High uncertainty' : hesitationIndex <= 0.3 ? 'Decisive' : 'Moderate'}
              </span>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-1.5 mt-2 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  hesitationIndex >= 0.6 ? 'bg-amber-500' : 'bg-sky-500'
                }`}
                style={{ width: `${Math.min(100, hesitationIndex * 100)}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Explainable AI Rationale */}
      {reasons && reasons.length > 0 && (
        <div className="mb-4 bg-slate-900/40 rounded-xl p-3.5 border border-slate-800/60">
          <span className="text-xs font-semibold text-slate-300 block mb-2 flex items-center gap-1.5">
            <Brain className="w-3.5 h-3.5 text-indigo-400" />
            Why did Edge AI detect this state?
          </span>
          <ul className="space-y-1.5">
            {reasons.slice(0, 3).map((reason, idx) => (
              <li key={idx} className="text-xs text-slate-300 flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-1 flex-shrink-0" />
                <span>{reason}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Recommended Action */}
      {recommendedAction && (
        <div className="mt-2 pt-3 border-t border-slate-800/80 flex items-center justify-between">
          <div className="text-xs">
            <span className="text-slate-400 block">Recommended Intervention:</span>
            <span className="font-semibold text-indigo-300">{recommendedAction}</span>
          </div>
          {typeof interventionLevel === 'number' && (
            <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              L{interventionLevel} Scaffold
            </span>
          )}
        </div>
      )}

      {lastUpdated && (
        <div className="mt-2 text-[10px] text-slate-500 text-right">
          Updated {new Date(lastUpdated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
      )}
    </div>
  );
};
