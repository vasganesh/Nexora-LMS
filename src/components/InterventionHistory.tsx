import React from 'react';
import { History, CheckCircle2, Clock, Award } from 'lucide-react';

export interface InterventionHistoryItem {
  id: string;
  detectedState: string;
  level: number;
  levelName: string;
  recommendation: string;
  reason?: string;
  confidence: number;
  isExecuted: boolean;
  createdAt: string;
  topic?: {
    name: string;
  };
}

interface InterventionHistoryProps {
  history: InterventionHistoryItem[];
  title?: string;
}

export const InterventionHistory: React.FC<InterventionHistoryProps> = ({
  history,
  title = 'Adaptive Intervention History'
}) => {
  if (!history || history.length === 0) {
    return (
      <div className="bg-slate-900/60 rounded-2xl p-6 border border-slate-800 text-center">
        <p className="text-sm text-slate-400">
          No adaptive interventions triggered yet. The system automatically responds when difficulty or retention decay is detected.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-slate-900/70 backdrop-blur-md rounded-2xl p-6 border border-slate-800 shadow-xl">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
            <History className="w-5 h-5 text-indigo-400" />
            {title}
          </h3>
          <p className="text-xs text-slate-400">
            Log of personalized scaffolds deployed under the Minimum Intervention Principle
          </p>
        </div>
        <span className="text-xs font-mono text-slate-400">
          {history.length} Interventions
        </span>
      </div>

      <div className="divide-y divide-slate-800/80">
        {history.map((item) => {
          const confidencePct = Math.round(item.confidence <= 1.0 ? item.confidence * 100 : item.confidence);

          return (
            <div key={item.id} className="py-3.5 first:pt-0 last:pb-0">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                    L{item.level}: {item.levelName}
                  </span>
                  <span className="text-xs font-semibold text-white">
                    {item.topic?.name || 'Academic Concept'}
                  </span>
                  <span className="text-xs text-slate-500">&bull;</span>
                  <span className="text-xs text-amber-400 font-medium">
                    State: {item.detectedState}
                  </span>
                </div>

                <div className="flex items-center gap-3 text-xs text-slate-400">
                  <span>{confidencePct}% conf</span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3 text-slate-500" />
                    {new Date(item.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                  </span>
                </div>
              </div>

              <p className="text-xs text-slate-300">
                {item.recommendation}
              </p>

              {item.reason && (
                <p className="text-[11px] text-slate-500 mt-1 italic">
                  Trigger: {item.reason}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
