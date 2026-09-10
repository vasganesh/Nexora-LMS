import React, { useState, useEffect } from "react";
import { edgeAI, type EdgeTelemetrySummary, type LearnerState } from "../services/edge";
import { useLmsStore } from "../store";
import {
  Cpu,
  Shield,
  Zap,
  HelpCircle,
  TrendingUp,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  Info,
  ChevronRight,
  Activity,
  X,
} from "lucide-react";

export const EdgeAIStatusWidget: React.FC = () => {
  const { setView } = useLmsStore();
  const [telemetry, setTelemetry] = useState<EdgeTelemetrySummary>(edgeAI.getTelemetrySummary());
  const [showExplainModal, setShowExplainModal] = useState(false);

  useEffect(() => {
    const unsubscribe = edgeAI.subscribe((summary) => {
      setTelemetry(summary);
    });
    return unsubscribe;
  }, []);

  const getStateColor = (state: LearnerState) => {
    switch (state) {
      case "MASTERING":
        return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30";
      case "PROGRESSING":
        return "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30";
      case "STRUGGLING":
        return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30";
      case "RECOVERING":
        return "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30";
      case "FORGETTING":
        return "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30";
      default:
        return "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/30";
    }
  };

  const activeDecision = edgeAI.getActiveDecision();
  const activePrediction = edgeAI.getActivePrediction();

  return (
    <>
      {/* Docked / Floating Edge AI Telemetry Pill */}
      <div className="flex items-center gap-2 text-xs font-sans">
        <button
          onClick={() => setShowExplainModal(true)}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border backdrop-blur-md transition-all shadow-sm hover:scale-[1.02] active:scale-[0.98] ${getStateColor(
            telemetry.activeLearnerState
          )}`}
          title="Click to view Edge AI Explainable Decision details"
        >
          <span className="relative flex h-2 w-2">
            <span
              className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                telemetry.activeLearnerState === "STRUGGLING"
                  ? "bg-amber-400"
                  : telemetry.activeLearnerState === "MASTERING"
                  ? "bg-emerald-400"
                  : "bg-blue-400"
              }`}
            ></span>
            <span
              className={`relative inline-flex rounded-full h-2 w-2 ${
                telemetry.activeLearnerState === "STRUGGLING"
                  ? "bg-amber-500"
                  : telemetry.activeLearnerState === "MASTERING"
                  ? "bg-emerald-500"
                  : "bg-blue-500"
              }`}
            ></span>
          </span>

          <div className="flex items-center gap-1.5">
            <Cpu className="w-3.5 h-3.5" />
            <span className="font-bold tracking-tight">
              Edge AI: {telemetry.activeLearnerState}
            </span>
          </div>

          <div className="hidden sm:flex items-center gap-1 pl-2 border-l border-current/20 text-[10px] font-mono">
            <Zap className="w-3 h-3 text-amber-500 dark:text-amber-400" />
            <span>{telemetry.avgLatencyMs}ms</span>
          </div>
        </button>

        {/* Quick Link to AI Lab Explorer */}
        <button
          onClick={() => setView("edge-ai-lab")}
          className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors text-[11px] font-medium"
        >
          <Activity className="w-3.5 h-3.5 text-brand-royal" />
          <span>Edge Lab</span>
        </button>
      </div>

      {/* Explainable AI Decision Modal */}
      {showExplainModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 max-w-lg w-full p-6 shadow-2xl space-y-4">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-brand-royal/10 text-brand-royal dark:text-brand-royal-light">
                  <Cpu className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold font-display text-slate-900 dark:text-white text-base">
                    Edge AI Explainable Adaptation
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Transparent on-device reasoning and telemetry
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowExplainModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Cognitive State Summary Card */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 dark:text-slate-400 font-medium">
                  Current Learner State:
                </span>
                <span
                  className={`font-bold px-2.5 py-0.5 rounded-full border text-[11px] ${getStateColor(
                    telemetry.activeLearnerState
                  )}`}
                >
                  {telemetry.activeLearnerState}
                </span>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 dark:text-slate-400 font-medium">
                  Model Confidence:
                </span>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {(telemetry.confidenceScore * 100).toFixed(0)}%
                </span>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 dark:text-slate-400 font-medium">
                  Adaptive Support Level:
                </span>
                <span className="font-bold text-brand-royal dark:text-brand-royal-light">
                  {telemetry.currentInterventionLevel === 0
                    ? "Level 0 (Standard Progression)"
                    : `Level ${telemetry.currentInterventionLevel} (${activeDecision?.interventionType || "Active"})`}
                </span>
              </div>
            </div>

            {/* Explainable Decision Reasoning */}
            <div className="space-y-1.5">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>Why did AI adapt?</span>
              </h4>
              <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed bg-amber-500/5 dark:bg-amber-500/10 border border-amber-500/20 p-3 rounded-xl">
                {activeDecision?.explainableEvidence ||
                  "AI is observing learning interactions (response times, quiz accuracy, hesitation indices) locally on your device to maintain an optimal flow state."}
              </p>
            </div>

            {/* Edge Hardware & Privacy Guarantees */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 mb-1">
                  <Zap className="w-3.5 h-3.5 text-emerald-500" />
                  <span className="font-semibold">Local Latency</span>
                </div>
                <div className="font-mono font-bold text-slate-900 dark:text-white text-sm">
                  {telemetry.avgLatencyMs} ms
                </div>
                <span className="text-[10px] text-slate-400">Zero cloud latency</span>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 mb-1">
                  <Shield className="w-3.5 h-3.5 text-blue-500" />
                  <span className="font-semibold">Privacy Shield</span>
                </div>
                <div className="font-mono font-bold text-slate-900 dark:text-white text-sm">
                  {(telemetry.privacyDataGuardedBytes / 1024).toFixed(1)} KB
                </div>
                <span className="text-[10px] text-slate-400">Raw telemetry kept local</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-between pt-2">
              <button
                onClick={() => {
                  setShowExplainModal(false);
                  setView("edge-ai-lab");
                }}
                className="text-xs text-brand-royal dark:text-brand-royal-light font-bold hover:underline flex items-center gap-1"
              >
                <span>Open Full Edge AI Lab</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={() => setShowExplainModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold hover:opacity-90 transition-opacity"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
