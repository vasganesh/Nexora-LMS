import React from 'react';
import { HelpCircle, Check, AlertCircle, Clock, MousePointer, Activity } from 'lucide-react';

interface AIExplanationProps {
  factors: string[];
  metrics?: {
    hesitationIndex?: number;
    errorStreak?: number;
    responseDelaySec?: number;
    optionSwitches?: number;
    accuracy?: number;
  };
}

export const AIExplanation: React.FC<AIExplanationProps> = ({ factors, metrics }) => {
  return (
    <div className="bg-slate-900/80 rounded-2xl p-5 border border-indigo-500/20 shadow-lg">
      <div className="flex items-center gap-2 mb-3">
        <HelpCircle className="w-4 h-4 text-indigo-400" />
        <h4 className="text-sm font-bold text-white tracking-tight">
          Explainable AI Telemetry Rationale
        </h4>
      </div>

      <p className="text-xs text-slate-400 mb-4">
        Nexora avoids black-box decisions. State transitions are derived transparently from multi-modal interaction and academic telemetry:
      </p>

      {/* Real feature indicators */}
      {metrics && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
          {typeof metrics.hesitationIndex === 'number' && (
            <div className="bg-slate-950/70 p-2.5 rounded-xl border border-slate-800">
              <span className="text-[10px] text-slate-500 block">Hesitation</span>
              <span className="text-sm font-bold text-white">
                {metrics.hesitationIndex.toFixed(2)}
              </span>
            </div>
          )}
          {typeof metrics.errorStreak === 'number' && (
            <div className="bg-slate-950/70 p-2.5 rounded-xl border border-slate-800">
              <span className="text-[10px] text-slate-500 block">Error Streak</span>
              <span className="text-sm font-bold text-white">
                {metrics.errorStreak}
              </span>
            </div>
          )}
          {typeof metrics.responseDelaySec === 'number' && (
            <div className="bg-slate-950/70 p-2.5 rounded-xl border border-slate-800">
              <span className="text-[10px] text-slate-500 block">Response Time</span>
              <span className="text-sm font-bold text-white">
                {metrics.responseDelaySec.toFixed(1)}s
              </span>
            </div>
          )}
          {typeof metrics.optionSwitches === 'number' && (
            <div className="bg-slate-950/70 p-2.5 rounded-xl border border-slate-800">
              <span className="text-[10px] text-slate-500 block">Option Switches</span>
              <span className="text-sm font-bold text-white">
                {metrics.optionSwitches}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Rationale factors list */}
      <ul className="space-y-2">
        {factors.map((factor, idx) => (
          <li key={idx} className="flex items-start gap-2.5 text-xs text-slate-300">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-1 flex-shrink-0" />
            <span>{factor}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};
