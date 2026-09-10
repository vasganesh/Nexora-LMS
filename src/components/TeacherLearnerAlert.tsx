import React, { useState } from 'react';
import { AlertTriangle, Check, Edit2, ShieldAlert, X, Sparkles, UserCheck, CheckCircle2 } from 'lucide-react';

export interface TeacherAlertItem {
  id: string;
  studentId: string;
  topicId: string;
  aiRecommendation: string;
  aiConfidence: number;
  aiLevel: number;
  aiReason?: string;
  teacherAction?: 'APPROVE' | 'MODIFY' | 'OVERRIDE' | 'DISMISS' | null;
  teacherNotes?: string | null;
  finalAction?: string | null;
  status: 'PENDING' | 'RESOLVED' | 'DISMISSED';
  createdAt: string;
  student?: {
    id: string;
    user?: {
      name: string;
      email: string;
    };
  };
  topic?: {
    name: string;
    chapter?: {
      name: string;
      unit?: {
        name: string;
        subject?: {
          name: string;
        };
      };
    };
  };
}

interface TeacherLearnerAlertProps {
  alerts: TeacherAlertItem[];
  agreementStats?: {
    totalReviewed: number;
    approvedCount: number;
    agreementRate: number;
  };
  onAction: (alertId: string, action: 'APPROVE' | 'MODIFY' | 'OVERRIDE' | 'DISMISS', details?: { teacherNotes?: string; overrideAction?: string }) => Promise<void>;
}

export const TeacherLearnerAlert: React.FC<TeacherLearnerAlertProps> = ({
  alerts,
  agreementStats,
  onAction
}) => {
  const [selectedAlertId, setSelectedAlertId] = useState<string | null>(null);
  const [overrideText, setOverrideText] = useState<string>('');
  const [actionType, setActionType] = useState<'MODIFY' | 'OVERRIDE' | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const pendingAlerts = alerts.filter(a => a.status === 'PENDING');
  const resolvedAlerts = alerts.filter(a => a.status !== 'PENDING');

  const handleSimpleAction = async (alertId: string, action: 'APPROVE' | 'DISMISS') => {
    try {
      setIsSubmitting(true);
      await onAction(alertId, action);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCustomActionSubmit = async (alertId: string) => {
    if (!actionType || !overrideText.trim()) return;
    try {
      setIsSubmitting(true);
      await onAction(alertId, actionType, { overrideAction: overrideText.trim() });
      setSelectedAlertId(null);
      setOverrideText('');
      setActionType(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Agreement Rate Header Banner */}
      <div className="bg-gradient-to-r from-indigo-950/80 via-slate-900/90 to-purple-950/80 rounded-2xl p-6 border border-indigo-500/30 shadow-xl backdrop-blur-md flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5 mb-1">
            <Sparkles className="w-4 h-4" />
            Human-In-The-Loop Intelligence
          </span>
          <h3 className="text-xl font-extrabold text-white tracking-tight">
            Teacher Intervention Oversight
          </h3>
          <p className="text-xs text-slate-300 mt-1 max-w-xl">
            Edge AI flags cognitive barriers and recommends progressive scaffolds. Teachers retain full authority to approve, customize, or override any action.
          </p>
        </div>

        {agreementStats && (
          <div className="bg-slate-900/80 rounded-xl p-4 border border-indigo-500/20 text-right">
            <span className="text-xs text-slate-400 block mb-1">Teacher-AI Agreement Rate</span>
            <div className="flex items-baseline gap-2 justify-end">
              <span className="text-2xl font-black text-indigo-300">
                {agreementStats.agreementRate}%
              </span>
              <span className="text-xs text-slate-500">
                ({agreementStats.approvedCount}/{agreementStats.totalReviewed} reviews)
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Alerts Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            Active Learner Alerts ({pendingAlerts.length})
          </h4>
        </div>

        {pendingAlerts.length === 0 ? (
          <div className="bg-slate-900/50 rounded-2xl p-8 border border-slate-800 text-center">
            <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
            <p className="text-sm font-medium text-white">All learners progressing stably</p>
            <p className="text-xs text-slate-400 mt-1">
              No students currently requiring urgent teacher intervention or scaffold approval.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {pendingAlerts.map((alert) => {
              const studentName = alert.student?.user?.name || 'Enrolled Student';
              const topicName = alert.topic?.name || 'Academic Concept';
              const subjectName = alert.topic?.chapter?.unit?.subject?.name || 'Course';
              const confidencePct = Math.round(alert.aiConfidence * 100);

              return (
                <div
                  key={alert.id}
                  className="bg-slate-900/90 rounded-2xl p-5 border border-slate-800 hover:border-indigo-500/40 transition-all shadow-lg"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-base font-bold text-white">{studentName}</span>
                        <span className="text-xs font-medium text-slate-400">({alert.student?.user?.email})</span>
                      </div>
                      <div className="text-xs text-indigo-400 font-medium mt-0.5">
                        {subjectName} &bull; {topicName}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/20">
                        Level {alert.aiLevel} Escalation
                      </span>
                      <span className="px-2.5 py-1 rounded-full text-xs font-mono bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                        {confidencePct}% Conf
                      </span>
                    </div>
                  </div>

                  {/* AI Recommendation & Reasons */}
                  <div className="bg-slate-950/60 rounded-xl p-3.5 border border-slate-800/80 mb-4 space-y-2">
                    <div className="text-xs text-slate-300">
                      <span className="font-semibold text-indigo-300">AI Recommendation:</span> {alert.aiRecommendation}
                    </div>
                    {alert.aiReason && (
                      <div className="text-xs text-slate-400">
                        <span className="font-semibold text-slate-300">Telemetry Basis:</span> {alert.aiReason}
                      </div>
                    )}
                  </div>

                  {/* Custom Action Drawer if selected */}
                  {selectedAlertId === alert.id && actionType && (
                    <div className="bg-slate-950 rounded-xl p-4 border border-indigo-500/40 mb-4 space-y-3">
                      <label className="block text-xs font-semibold text-white">
                        {actionType === 'MODIFY' ? 'Modify AI Recommendation:' : 'Custom Teacher Override Action:'}
                      </label>
                      <textarea
                        rows={2}
                        value={overrideText}
                        onChange={(e) => setOverrideText(e.target.value)}
                        placeholder="Enter specific educational instructions or custom scaffold..."
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                      />
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => {
                            setSelectedAlertId(null);
                            setActionType(null);
                          }}
                          className="px-3 py-1 rounded text-xs text-slate-400 hover:text-white"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => handleCustomActionSubmit(alert.id)}
                          disabled={isSubmitting || !overrideText.trim()}
                          className="px-3 py-1 rounded text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-50"
                        >
                          Save & Execute
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800/60">
                    <span className="text-[11px] text-slate-500">
                      Reported {new Date(alert.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleSimpleAction(alert.id, 'APPROVE')}
                        disabled={isSubmitting}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5 transition-colors disabled:opacity-50"
                      >
                        <Check className="w-3.5 h-3.5" />
                        Approve
                      </button>

                      <button
                        onClick={() => {
                          setSelectedAlertId(alert.id);
                          setActionType('MODIFY');
                          setOverrideText(alert.aiRecommendation);
                        }}
                        disabled={isSubmitting}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-sky-600/20 hover:bg-sky-600/30 text-sky-300 border border-sky-500/30 flex items-center gap-1.5 transition-colors disabled:opacity-50"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        Modify
                      </button>

                      <button
                        onClick={() => {
                          setSelectedAlertId(alert.id);
                          setActionType('OVERRIDE');
                          setOverrideText('');
                        }}
                        disabled={isSubmitting}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30 flex items-center gap-1.5 transition-colors disabled:opacity-50"
                      >
                        <ShieldAlert className="w-3.5 h-3.5" />
                        Override
                      </button>

                      <button
                        onClick={() => handleSimpleAction(alert.id, 'DISMISS')}
                        disabled={isSubmitting}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors disabled:opacity-50"
                      >
                        <X className="w-3.5 h-3.5" />
                        Dismiss
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Resolved Review History */}
      {resolvedAlerts.length > 0 && (
        <div className="mt-8">
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
            Recent Teacher Decision History ({resolvedAlerts.length})
          </h4>
          <div className="space-y-2">
            {resolvedAlerts.slice(0, 5).map((resolved) => (
              <div
                key={resolved.id}
                className="bg-slate-900/60 rounded-xl p-3 border border-slate-800 flex items-center justify-between text-xs"
              >
                <div>
                  <span className="font-semibold text-white">{resolved.student?.user?.name || 'Student'}</span>
                  <span className="text-slate-400"> &bull; {resolved.topic?.name}</span>
                  <p className="text-slate-300 mt-0.5">{resolved.finalAction || resolved.aiRecommendation}</p>
                </div>
                <span className="px-2.5 py-1 rounded text-[11px] font-semibold bg-slate-800 text-indigo-300 border border-slate-700">
                  {resolved.teacherAction || 'RESOLVED'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
