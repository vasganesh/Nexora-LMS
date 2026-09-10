import React from 'react';
import { ArrowRight, Clock, ShieldCheck } from 'lucide-react';

export interface TransitionItem {
  id: string;
  fromState: string;
  toState: string;
  confidence: number;
  reason: string;
  createdAt: string;
  topic?: {
    name: string;
  };
}

interface StateTransitionTimelineProps {
  transitions: TransitionItem[];
  title?: string;
}

const STATE_BADGES: Record<string, { label: string; text: string; bg: string }> = {
  MASTERING: { label: 'Mastering', text: 'text-emerald-400', bg: 'bg-emerald-500/20 border-emerald-500/30' },
  PROGRESSING: { label: 'Progressing', text: 'text-sky-400', bg: 'bg-sky-500/20 border-sky-500/30' },
  STRUGGLING: { label: 'Struggling', text: 'text-amber-400', bg: 'bg-amber-500/20 border-amber-500/30' },
  RECOVERING: { label: 'Recovering', text: 'text-violet-400', bg: 'bg-violet-500/20 border-violet-500/30' },
  FORGETTING: { label: 'Retention Decay', text: 'text-rose-400', bg: 'bg-rose-500/20 border-rose-500/30' }
};

export const StateTransitionTimeline: React.FC<StateTransitionTimelineProps> = ({
  transitions,
  title = 'Learning Journey & State Transitions'
}) => {
  if (!transitions || transitions.length === 0) {
    return (
      <div className="bg-slate-900/60 rounded-2xl p-6 border border-slate-800 text-center">
        <p className="text-sm text-slate-400">
          No state transitions recorded yet. Complete quizzes to begin continuous state tracking.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-slate-900/70 backdrop-blur-md rounded-2xl p-6 border border-slate-800 shadow-xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-bold text-white tracking-tight">{title}</h3>
          <p className="text-xs text-slate-400">
            Real-time cognitive transitions detected by Edge AI
          </p>
        </div>
        <span className="px-3 py-1 rounded-full text-xs font-mono bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
          {transitions.length} Transitions
        </span>
      </div>

      <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-800">
        {transitions.map((item) => {
          const fromBadge = STATE_BADGES[item.fromState] || {
            label: item.fromState,
            text: 'text-slate-300',
            bg: 'bg-slate-800 border-slate-700'
          };
          const toBadge = STATE_BADGES[item.toState] || {
            label: item.toState,
            text: 'text-slate-300',
            bg: 'bg-slate-800 border-slate-700'
          };
          const confidencePct = Math.round(item.confidence <= 1.0 ? item.confidence * 100 : item.confidence);

          return (
            <div key={item.id} className="relative group">
              {/* Timeline marker node */}
              <div className="absolute -left-[1.65rem] top-1.5 w-3.5 h-3.5 rounded-full bg-slate-950 border-2 border-indigo-500 group-hover:scale-125 transition-transform" />

              <div className="bg-slate-900/90 rounded-xl p-4 border border-slate-800/90 hover:border-slate-700 transition-colors">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span className={`px-2.5 py-0.5 rounded text-xs font-semibold border ${fromBadge.bg} ${fromBadge.text}`}>
                      {fromBadge.label}
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
                    <span className={`px-2.5 py-0.5 rounded text-xs font-semibold border ${toBadge.bg} ${toBadge.text}`}>
                      {toBadge.label}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-xs text-slate-400">
                    <span className="flex items-center gap-1 font-mono">
                      <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
                      {confidencePct}% conf
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-500" />
                      {new Date(item.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>

                {item.topic?.name && (
                  <div className="text-xs font-medium text-indigo-300 mb-1">
                    Concept: {item.topic.name}
                  </div>
                )}

                <p className="text-xs text-slate-300 leading-relaxed">
                  {item.reason}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
