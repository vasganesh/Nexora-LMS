import React, { useState } from 'react';
import { Lightbulb, FileText, CheckSquare, Layers, RefreshCw, UserCheck, ChevronDown, ChevronUp } from 'lucide-react';
import { InterventionPayload } from '../services/learnerIntelligenceService';

interface AdaptiveRecommendationProps {
  intervention: InterventionPayload;
  conceptName: string;
  onDismiss?: () => void;
}

const LEVEL_ICONS: Record<number, any> = {
  0: CheckSquare,
  1: Lightbulb,
  2: FileText,
  3: Layers,
  4: Layers,
  5: RefreshCw,
  6: UserCheck
};

export const AdaptiveRecommendation: React.FC<AdaptiveRecommendationProps> = ({
  intervention,
  conceptName,
  onDismiss
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(true);
  const IconComponent = LEVEL_ICONS[intervention.level] || Lightbulb;
  const payload = intervention.suggestedActionPayload;

  if (intervention.level === 0) {
    return null; // Level 0 is normal learning, no intrusive popup needed
  }

  return (
    <div className="bg-gradient-to-br from-indigo-950/80 to-slate-900/90 border border-indigo-500/40 rounded-2xl p-5 shadow-2xl backdrop-blur-md transition-all">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center flex-shrink-0">
            <IconComponent className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                Level {intervention.level}: {intervention.levelName}
              </span>
              <span className="text-xs text-slate-400">
                Minimum Intervention Scaffold
              </span>
            </div>
            <h4 className="text-sm font-bold text-white mt-1">
              Adaptive Support for {conceptName}
            </h4>
          </div>
        </div>

        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
        >
          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      <p className="text-xs text-slate-300 mt-3 leading-relaxed">
        {intervention.recommendation}
      </p>

      {/* Expandable Scaffold Details */}
      {isExpanded && payload && (
        <div className="mt-4 pt-3 border-t border-slate-800/80 space-y-3">
          {/* Level 1: Hint */}
          {payload.hintText && (
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 text-xs text-amber-200">
              <div className="font-semibold flex items-center gap-1.5 mb-1 text-amber-300">
                <Lightbulb className="w-3.5 h-3.5" />
                Strategic Hint
              </div>
              {payload.hintText}
            </div>
          )}

          {/* Level 2: Explanation */}
          {payload.explanationText && (
            <div className="bg-sky-500/10 border border-sky-500/20 rounded-xl p-3 text-xs text-sky-200">
              <div className="font-semibold flex items-center gap-1.5 mb-1 text-sky-300">
                <FileText className="w-3.5 h-3.5" />
                Conceptual Clarification
              </div>
              {payload.explanationText}
            </div>
          )}

          {/* Level 3: Worked Example */}
          {payload.workedExampleSteps && payload.workedExampleSteps.length > 0 && (
            <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-xl p-3 text-xs text-indigo-200 space-y-1.5">
              <div className="font-semibold flex items-center gap-1.5 mb-1 text-indigo-300">
                <Layers className="w-3.5 h-3.5" />
                Demonstrated Worked Solution
              </div>
              {payload.workedExampleSteps.map((step, idx) => (
                <div key={idx} className="flex items-start gap-2">
                  <span className="w-4 h-4 rounded-full bg-indigo-500/30 text-indigo-300 flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5">
                    {idx + 1}
                  </span>
                  <span>{step}</span>
                </div>
              ))}
            </div>
          )}

          {/* Level 5: Concept Revision */}
          {payload.revisionTopic && (
            <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-3 text-xs text-rose-200">
              <div className="font-semibold flex items-center gap-1.5 mb-1 text-rose-300">
                <RefreshCw className="w-3.5 h-3.5" />
                Recommended Concept Refresher
              </div>
              Review prerequisite foundations in <span className="font-bold underline">{payload.revisionTopic}</span> before resuming assessment.
            </div>
          )}
        </div>
      )}

      {onDismiss && (
        <div className="mt-4 flex justify-end">
          <button
            onClick={onDismiss}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
          >
            Acknowledge & Continue
          </button>
        </div>
      )}
    </div>
  );
};
