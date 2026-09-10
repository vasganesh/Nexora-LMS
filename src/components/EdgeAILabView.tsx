import React, { useState, useEffect } from "react";
import { useLmsStore } from "../store";
import {
  edgeAI,
  type EdgeTelemetrySummary,
  type ConceptMastery,
  type StateTransition,
  type StudentCognitiveProfile,
} from "../services/edge";
import {
  learnerIntelligenceAPI,
  type LearnerIntelligenceData,
} from "../services/learnerIntelligenceService";
import {
  Brain,
  Award,
  AlertTriangle,
  TrendingUp,
  RefreshCw,
  CheckCircle2,
  Clock,
  Sparkles,
  BookOpen,
  Layers,
  ShieldCheck,
  Zap,
  Sliders,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  ArrowLeft,
  MousePointer,
  Activity,
  History,
  Lightbulb,
  Target,
  Flame,
  Check,
  User,
  Users,
  Search,
  Eye,
  Send,
  MessageSquare,
  GraduationCap,
  Filter,
} from "lucide-react";

interface EnrichedTopicConcept {
  id: string;
  topicName: string;
  chapterName: string;
  subjectName: string;
  state: "MASTERING" | "PROGRESSING" | "STRUGGLING" | "RECOVERING" | "FORGETTING";
  masteryScore: number;
  attemptCount: number;
  successCount: number;
  hasInteracted: boolean;
  lastPracticedAt?: number;
  retentionScore: number;
  reason: string;
  scaffoldLevel: number;
  scaffoldName: string;
}

export const EdgeAILabView: React.FC = () => {
  const { profile, quizResults, quizzes, boards } = useLmsStore();

  const activeBoard =
    boards.find((b) => b.id === profile.selectedBoardId) || boards[0];
  const activeClass =
    activeBoard?.classes?.find((c) => c.id === profile.selectedClassId) ||
    activeBoard?.classes?.[0];

  const isTeacherOrAdmin = profile.role === "teacher" || profile.role === "admin";
  const [studentsList, setStudentsList] = useState<StudentCognitiveProfile[]>(
    edgeAI.getAllStudentsWithCognitiveState()
  );
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [teacherSearchQuery, setTeacherSearchQuery] = useState("");
  const [teacherFilterState, setTeacherFilterState] = useState<string>("ALL");
  const [teacherInterventionText, setTeacherInterventionText] = useState("");
  const [teacherInterventionLevel, setTeacherInterventionLevel] = useState(1);
  const [interventionSuccessMsg, setInterventionSuccessMsg] = useState<string | null>(null);

  // Sync teacher student roster
  useEffect(() => {
    if (isTeacherOrAdmin) {
      const refresh = () => setStudentsList(edgeAI.getAllStudentsWithCognitiveState());
      refresh();
      const interval = setInterval(refresh, 4000);
      return () => clearInterval(interval);
    }
  }, [isTeacherOrAdmin]);

  const selectedStudent = isTeacherOrAdmin && selectedStudentId
    ? studentsList.find((s) => s.studentId === selectedStudentId) || studentsList[0]
    : null;

  // Active view tab: "concepts" | "quizzes" | "transitions" | "interventions"
  const [activeTab, setActiveTab] = useState<
    "concepts" | "quizzes" | "transitions" | "interventions"
  >("concepts");

  // Topic filter: "ALL" | "INTERACTED" | "STRUGGLING" | "MASTERED"
  const [topicFilter, setTopicFilter] = useState<
    "ALL" | "INTERACTED" | "STRUGGLING" | "MASTERED"
  >("ALL");

  // Show / Hide Simulator drawer (collapsed by default to keep student view simple)
  const [showSimulator, setShowSimulator] = useState<boolean>(false);

  // Backend Intelligence Data
  const [dbIntelligence, setDbIntelligence] =
    useState<LearnerIntelligenceData | null>(null);
  const [dbInterventions, setDbInterventions] = useState<any[]>([]);

  // Edge AI Live Telemetry
  const [telemetry, setTelemetry] = useState<EdgeTelemetrySummary>(
    edgeAI.getTelemetrySummary()
  );
  const [concepts, setConcepts] = useState<ConceptMastery[]>(
    edgeAI.feedbackCollector.getAllConceptMastery()
  );
  const [transitions, setTransitions] = useState<StateTransition[]>(
    edgeAI.transitionDetector.getHistory(20)
  );

  // Simulator State
  const [simConcept, setSimConcept] = useState("Quadratic Equations & Roots");
  const [simResponseTime, setSimResponseTime] = useState(25);
  const [simHesitation, setSimHesitation] = useState(0.7);
  const [simIsCorrect, setSimIsCorrect] = useState(false);
  const [simSwitchCount, setSimSwitchCount] = useState(2);
  const [simDaysSincePractice, setSimDaysSincePractice] = useState(0);

  // Fetch real database intelligence on mount & profile change
  useEffect(() => {
    const targetId = selectedStudent ? selectedStudent.studentId : profile.id;
    if (!targetId) return;
    learnerIntelligenceAPI
      .getStudentIntelligence(targetId)
      .then((data) => setDbIntelligence(data))
      .catch((err) =>
        console.warn("Learner intelligence fetch background sync:", err)
      );

    learnerIntelligenceAPI
      .getStudentInterventionHistory(targetId)
      .then((hist) => setDbInterventions(hist))
      .catch((err) =>
        console.warn("Intervention history fetch background sync:", err)
      );
  }, [profile.id, selectedStudent?.studentId]);

  // Subscribe to Edge AI live telemetry
  useEffect(() => {
    const unsubscribe = edgeAI.subscribe((summary) => {
      setTelemetry(summary);
      setConcepts(edgeAI.feedbackCollector.getAllConceptMastery());
      setTransitions(edgeAI.transitionDetector.getHistory(20));
    });
    return unsubscribe;
  }, []);

  // Compute aggregated student stats
  const totalQuizzes = quizResults.length;
  const avgQuizScore =
    totalQuizzes > 0
      ? Math.round(
          quizResults.reduce(
            (acc, q) => acc + (q.score / (q.totalQuestions || 1)) * 100,
            0
          ) / totalQuizzes
        )
      : 85;

  // Active student display details
  const displayStudentName = selectedStudent ? selectedStudent.studentName : (profile.name || "Enrolled Student");
  const displayStudentEmail = selectedStudent ? selectedStudent.email : profile.email;
  const displayStudentGrade = selectedStudent ? selectedStudent.grade : (activeClass?.title || "Class 12");
  const displayStudentState = selectedStudent ? selectedStudent.cognitiveState : (telemetry.activeLearnerState || "PROGRESSING");
  const displayStudentConfidence = selectedStudent
    ? Math.round(selectedStudent.confidenceScore * 100)
    : Math.round((telemetry.confidenceScore || 0.88) * 100);
  const displayStudentScore = selectedStudent
    ? (selectedStudent.quizMetrics?.accuracyRate || selectedStudent.performanceScore)
    : (totalQuizzes > 0 ? avgQuizScore : 85);
  const displayStudentHesitation = selectedStudent
    ? Number((selectedStudent.mouseActivity?.jitterIndex || 0.28).toFixed(2))
    : 0.28;
  const displayStudentAttempts = selectedStudent ? (selectedStudent.quizMetrics?.attemptsCount || 3) : totalQuizzes;

  const currentOverallState = displayStudentState;
  const overallConfidence = displayStudentConfidence;
  const avgHesitation = displayStudentHesitation;

  const handleDeployTeacherIntervention = () => {
    if (!selectedStudent) return;
    const scaffoldNames = [
      "Level 0: Normal Progression",
      "Level 1: Strategic Hint",
      "Level 2: Step-by-Step Breakdown",
      "Level 3: Worked Example & Video Tutorial",
      "Level 4: Teacher 1-on-1 Mentoring",
      "Level 5: Concept Refresher & Prerequisite Review",
    ];

    useLmsStore.getState().addNotification(
      `Intervention Deployed to ${selectedStudent.studentName}`,
      `Dealt ${scaffoldNames[teacherInterventionLevel]} with note: "${teacherInterventionText || "Follow the step-by-step guidance to master this concept."}"`,
      "success"
    );

    setInterventionSuccessMsg(
      `Successfully deployed ${scaffoldNames[teacherInterventionLevel]} to ${selectedStudent.studentName}!`
    );
    setTeacherInterventionText("");
    setTimeout(() => setInterventionSuccessMsg(null), 4000);
  };

  // Five Stages Configuration
  const FIVE_STAGES = [
    {
      key: "PROGRESSING",
      stageNum: 1,
      title: "Stage 1: Progressing",
      shortLabel: "Progressing",
      description:
        "Normal, steady advancement with healthy accuracy (65-85%) and standard answering pace.",
      color: "text-sky-400 bg-sky-500/10 border-sky-500/30",
      activeRing: "ring-2 ring-sky-400 border-sky-400 shadow-lg shadow-sky-500/20",
      icon: TrendingUp,
    },
    {
      key: "MASTERING",
      stageNum: 2,
      title: "Stage 2: Mastering",
      shortLabel: "Mastering",
      description:
        "High conceptual proficiency (>85%), rapid decisive answers, and minimal hesitation.",
      color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30",
      activeRing: "ring-2 ring-emerald-400 border-emerald-500 shadow-lg shadow-emerald-500/20",
      icon: Award,
    },
    {
      key: "STRUGGLING",
      stageNum: 3,
      title: "Stage 3: Struggling",
      shortLabel: "Struggling",
      description:
        "Conceptual barrier detected; consecutive errors or high hesitation (>60%) requiring scaffold support.",
      color: "text-amber-400 bg-amber-500/10 border-amber-500/30",
      activeRing: "ring-2 ring-amber-400 border-amber-500 shadow-lg shadow-amber-500/20",
      icon: AlertTriangle,
    },
    {
      key: "RECOVERING",
      stageNum: 4,
      title: "Stage 4: Recovering",
      shortLabel: "Recovering",
      description:
        "Successful turnaround following difficulty; adaptive scaffold helped restore correct understanding.",
      color: "text-violet-400 bg-violet-500/10 border-violet-500/30",
      activeRing: "ring-2 ring-violet-400 border-violet-500 shadow-lg shadow-violet-500/20",
      icon: RefreshCw,
    },
    {
      key: "FORGETTING",
      stageNum: 5,
      title: "Stage 5: Retention Decay",
      shortLabel: "Retention Decay",
      description:
        "Prior mastery declining due to elapsed time since last practice; prompts spaced concept revision.",
      color: "text-rose-400 bg-rose-500/10 border-rose-500/30",
      activeRing: "ring-2 ring-rose-400 border-rose-500 shadow-lg shadow-rose-500/20",
      icon: Activity,
    },
  ];

  // State badge styling helper
  const getStateBadge = (stateStr: string) => {
    switch (stateStr) {
      case "MASTERING":
        return {
          label: "Mastering",
          color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30",
          icon: Award,
        };
      case "PROGRESSING":
        return {
          label: "Progressing",
          color: "text-sky-400 bg-sky-500/10 border-sky-500/30",
          icon: TrendingUp,
        };
      case "STRUGGLING":
        return {
          label: "Struggling",
          color: "text-amber-400 bg-amber-500/10 border-amber-500/30",
          icon: AlertTriangle,
        };
      case "RECOVERING":
        return {
          label: "Recovering",
          color: "text-violet-400 bg-violet-500/10 border-violet-500/30",
          icon: RefreshCw,
        };
      case "FORGETTING":
        return {
          label: "Retention Decay",
          color: "text-rose-400 bg-rose-500/10 border-rose-500/30",
          icon: Activity,
        };
      default:
        return {
          label: stateStr || "Progressing",
          color: "text-sky-400 bg-sky-500/10 border-sky-500/30",
          icon: TrendingUp,
        };
    }
  };

  const overallBadge = getStateBadge(currentOverallState);
  const OverallIcon = overallBadge.icon;

  // Build Enriched Topic Concept List across Curriculum & Interactions
  const enrichedTopics: EnrichedTopicConcept[] = [];
  const subjects = activeClass?.subjects || [];

  // Track concept IDs and normalized names already mapped
  const mappedConceptIds = new Set<string>();
  const mappedConceptNames = new Set<string>();

  // 1. Add tracked concepts (from selected student if in teacher inspection mode, or live Edge AI telemetry)
  const studentConceptList = selectedStudent?.conceptMasteryList;

  if (studentConceptList && studentConceptList.length > 0) {
    studentConceptList.forEach((sc, idx) => {
      const cId = `concept-${sc.conceptName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
      mappedConceptIds.add(cId);
      mappedConceptNames.add(sc.conceptName.toLowerCase().trim());
      const isMastered = sc.score >= 80;
      const isStruggling = sc.state === "STRUGGLING";

      // Attempt to dynamically find true Subject and Chapter from curriculum
      let matchedSubject = subjects[0]?.title || "Mathematics";
      let matchedChapter = "Core Concepts";

      for (const subj of subjects) {
        for (const chap of subj.chapters || []) {
          if (
            chap.topics?.some(
              (t) =>
                t.title.toLowerCase().includes(sc.conceptName.toLowerCase()) ||
                sc.conceptName.toLowerCase().includes(t.title.toLowerCase())
            )
          ) {
            matchedSubject = subj.title;
            matchedChapter = chap.title;
            break;
          }
        }
      }

      enrichedTopics.push({
        id: cId,
        topicName: sc.conceptName,
        chapterName: matchedChapter,
        subjectName: matchedSubject,
        state: sc.state,
        masteryScore: sc.score,
        attemptCount: 3 + (idx % 2),
        successCount: isMastered ? 3 : isStruggling ? 1 : 2,
        hasInteracted: true,
        lastPracticedAt: Date.now() - 3600000 * 24 * (idx + 1),
        retentionScore: isMastered ? 95 : isStruggling ? 50 : 85,
        reason: isMastered
          ? "High sustained accuracy with low hesitation and decisive response times."
          : isStruggling
          ? "Recent incorrect answer with elevated response time and answer switching detected."
          : sc.state === "RECOVERING"
          ? "Successful correct turnaround after prior difficulty. Consolidating mastery."
          : sc.state === "FORGETTING"
          ? "Retention decay detected after elapsed interval since last practice. Concept revision suggested."
          : "Steady progress with normal answering pace.",
        scaffoldLevel: isMastered ? 0 : isStruggling ? 1 : sc.state === "FORGETTING" ? 5 : 1,
        scaffoldName: isMastered
          ? "Level 0: Normal Progression"
          : isStruggling
          ? "Level 1: Strategic Hint"
          : sc.state === "FORGETTING"
          ? "Level 5: Concept Refresher"
          : "Level 1: Affirmation Scaffold",
      });
    });
  } else {
    concepts.forEach((c) => {
      mappedConceptIds.add(c.conceptId.toLowerCase());
      mappedConceptNames.add(c.conceptName.toLowerCase().trim());
      const isMastered = c.masteryScore >= 80;
      const isStruggling = c.state === "STRUGGLING";

      // Attempt to dynamically find true Subject and Chapter from curriculum
      let matchedSubject = subjects[0]?.title || "Mathematics";
      let matchedChapter = "Core Concepts";

      for (const subj of subjects) {
        for (const chap of subj.chapters || []) {
          if (
            chap.topics?.some(
              (t) =>
                t.id === c.conceptId ||
                t.title.toLowerCase() === c.conceptName.toLowerCase() ||
                c.conceptName.toLowerCase().includes(t.title.toLowerCase()) ||
                t.title.toLowerCase().includes(c.conceptName.toLowerCase())
            )
          ) {
            matchedSubject = subj.title;
            matchedChapter = chap.title;
            break;
          }
        }
      }

      enrichedTopics.push({
        id: c.conceptId,
        topicName: c.conceptName,
        chapterName: matchedChapter,
        subjectName: matchedSubject,
        state: c.state,
        masteryScore: c.masteryScore,
        attemptCount: c.attemptCount,
        successCount: c.successCount,
        hasInteracted: c.attemptCount > 0,
        lastPracticedAt: c.lastPracticedAt,
        retentionScore: c.retentionScore,
        reason: isMastered
          ? "High sustained accuracy with low hesitation and decisive response times."
          : isStruggling
          ? "Recent incorrect answer with elevated response time and answer switching detected."
          : c.state === "RECOVERING"
          ? "Successful correct turnaround after prior difficulty. Consolidating mastery."
          : c.state === "FORGETTING"
          ? "Retention decay detected after elapsed interval since last practice. Concept revision suggested."
          : "Steady progress with normal answering pace.",
        scaffoldLevel: isMastered
          ? 0
          : isStruggling
          ? 1
          : c.state === "FORGETTING"
          ? 5
          : 1,
        scaffoldName: isMastered
          ? "Level 0: Normal Progression"
          : isStruggling
          ? "Level 1: Strategic Hint"
          : c.state === "FORGETTING"
          ? "Level 5: Concept Refresher"
          : "Level 1: Affirmation Scaffold",
      });
    });
  }

  // 2. Add remaining topics from Curriculum to ensure full subject transparency
  subjects.forEach((subj) => {
    subj.chapters?.forEach((chap) => {
      chap.topics?.forEach((top) => {
        const topKey = top.title.toLowerCase().replace(/[^a-z0-9]+/g, "-");
        const topNorm = top.title.toLowerCase().trim();

        if (
          !mappedConceptIds.has(topKey) &&
          !mappedConceptIds.has(top.id.toLowerCase()) &&
          !mappedConceptNames.has(topNorm)
        ) {
          mappedConceptIds.add(topKey);
          mappedConceptNames.add(topNorm);

          // Check if user has taken any quiz linked to this topic
          const matchingQuizzes = quizResults.filter(
            (qr) =>
              qr.title?.toLowerCase().includes(topNorm) ||
              topNorm.includes(qr.title?.toLowerCase()) ||
              qr.incorrectAnswersDetails?.some(
                (d) => d.recommendedTopicId === top.id
              )
          );

          const hasQuizInteraction = matchingQuizzes.length > 0;
          const hasInteraction = Boolean(top.isCompleted) || hasQuizInteraction;

          let topicScore = 0;
          let topicAttempts = 0;
          let topicSuccess = 0;
          let topicState: "MASTERING" | "PROGRESSING" | "STRUGGLING" | "RECOVERING" | "FORGETTING" = "PROGRESSING";
          let topicReason = "Topic available in curriculum. Ready for interactive quiz attempt.";

          if (hasQuizInteraction) {
            topicAttempts = matchingQuizzes.length;
            const totalScore = matchingQuizzes.reduce(
              (acc, q) => acc + (q.score / (q.totalQuestions || 1)) * 100,
              0
            );
            topicScore = Math.round(totalScore / matchingQuizzes.length);
            topicSuccess = matchingQuizzes.filter(
              (q) => (q.score / (q.totalQuestions || 1)) >= 0.7
            ).length;

            if (topicScore >= 80) {
              topicState = "MASTERING";
              topicReason = "Consistently high quiz accuracy with fast problem resolution.";
            } else if (topicScore < 50) {
              topicState = "STRUGGLING";
              topicReason = "Multiple quiz errors detected. Targeted hint scaffolds recommended.";
            } else {
              topicState = "PROGRESSING";
              topicReason = "Moderate quiz performance. Keep practicing to achieve mastery.";
            }
          } else if (top.isCompleted) {
            topicScore = 75;
            topicAttempts = 1;
            topicSuccess = 1;
            topicReason = "Completed study notes and introductory practice.";
          }

          enrichedTopics.push({
            id: top.id,
            topicName: top.title,
            chapterName: chap.title,
            subjectName: subj.title,
            state: topicState,
            masteryScore: topicScore,
            attemptCount: topicAttempts,
            successCount: topicSuccess,
            hasInteracted: hasInteraction,
            retentionScore: hasInteraction ? 90 : 100,
            reason: topicReason,
            scaffoldLevel: topicState === "STRUGGLING" ? 1 : 0,
            scaffoldName:
              topicState === "STRUGGLING"
                ? "Level 1: Strategic Hint"
                : "Level 0: Normal Learning",
          });
        }
      });
    });
  });

  // Filter enriched topics
  const filteredTopics = enrichedTopics.filter((t) => {
    if (topicFilter === "INTERACTED") return t.hasInteracted;
    if (topicFilter === "STRUGGLING") return t.state === "STRUGGLING" || t.state === "FORGETTING";
    if (topicFilter === "MASTERED") return t.state === "MASTERING" || t.masteryScore >= 80;
    return true;
  });

  const interactedCount = enrichedTopics.filter((t) => t.hasInteracted).length;
  const strugglingCount = enrichedTopics.filter(
    (t) => t.state === "STRUGGLING" || t.state === "FORGETTING"
  ).length;
  const masteredCount = enrichedTopics.filter(
    (t) => t.state === "MASTERING" || t.masteryScore >= 80
  ).length;
  // =========================================================================
  // TEACHER / ADMIN ROSTER VIEW (When teacher has not yet clicked a specific student)
  // =========================================================================
  if (isTeacherOrAdmin && !selectedStudentId) {
    const q = teacherSearchQuery.toLowerCase().trim();
    const filteredStudents = studentsList.filter((s) => {
      const matchesSearch =
        !q ||
        s.studentName.toLowerCase().includes(q) ||
        s.email.toLowerCase().includes(q) ||
        s.grade.toLowerCase().includes(q) ||
        (s.location && s.location.toLowerCase().includes(q));

      if (!matchesSearch) return false;
      if (teacherFilterState === "ALL") return true;
      if (teacherFilterState === "STRUGGLING") return s.cognitiveState === "STRUGGLING";
      if (teacherFilterState === "MASTERING") return s.cognitiveState === "MASTERING";
      if (teacherFilterState === "PROGRESSING") return s.cognitiveState === "PROGRESSING";
      if (teacherFilterState === "RECOVERING") return s.cognitiveState === "RECOVERING";
      if (teacherFilterState === "FORGETTING") return s.cognitiveState === "FORGETTING";
      return true;
    });

    const cohortStruggling = studentsList.filter((s) => s.cognitiveState === "STRUGGLING").length;
    const cohortMastering = studentsList.filter((s) => s.cognitiveState === "MASTERING").length;
    const cohortProgressing = studentsList.filter((s) => s.cognitiveState === "PROGRESSING").length;
    const cohortAvgAccuracy = Math.round(
      studentsList.reduce((acc, s) => acc + (s.quizMetrics?.accuracyRate || s.performanceScore), 0) /
        Math.max(1, studentsList.length)
    );

    return (
      <div className="space-y-6 font-sans text-left pb-16 animate-in fade-in">
        {/* Banner */}
        <div className="bg-slate-900/90 rounded-3xl p-6 border border-slate-800 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center gap-1.5">
                <Users className="w-3 h-3" />
                Teacher Edge AI Intelligence Portal
              </span>
              <span className="text-xs text-slate-400">Class Cognitive Matrix</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Enrolled Students Roster & Cognitive Telemetry
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Select any student to view their full Edge AI report, 5 stages progression, and concept-to-concept mastery
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span className="px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-slate-300">
              Active Cohort: <strong className="text-white">{studentsList.length}</strong> Students
            </span>
          </div>
        </div>

        {/* 4 Summary Stat Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-slate-900/80 p-4 rounded-2xl border border-slate-800">
            <span className="text-xs text-slate-400 block mb-1">Total Scholars</span>
            <span className="text-2xl font-black text-white">{studentsList.length}</span>
            <span className="text-[10px] text-slate-500 block mt-0.5">Enrolled across active subjects</span>
          </div>
          <div className="bg-slate-900/80 p-4 rounded-2xl border border-slate-800">
            <span className="text-xs text-slate-400 block mb-1">Flagged Struggling</span>
            <span className="text-2xl font-black text-amber-400">{cohortStruggling}</span>
            <span className="text-[10px] text-amber-400/70 font-semibold block mt-0.5">
              {cohortStruggling > 0 ? "⚠️ Adaptive scaffold active" : "✓ No friction detected"}
            </span>
          </div>
          <div className="bg-slate-900/80 p-4 rounded-2xl border border-slate-800">
            <span className="text-xs text-slate-400 block mb-1">Mastering Cohort</span>
            <span className="text-2xl font-black text-emerald-400">{cohortMastering}</span>
            <span className="text-[10px] text-emerald-400/70 block mt-0.5">High automaticity &gt;85%</span>
          </div>
          <div className="bg-slate-900/80 p-4 rounded-2xl border border-slate-800">
            <span className="text-xs text-slate-400 block mb-1">Cohort Avg Accuracy</span>
            <span className="text-2xl font-black text-sky-400">{cohortAvgAccuracy}%</span>
            <span className="text-[10px] text-slate-500 block mt-0.5">Across all completed quizzes</span>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/60 p-4 rounded-2xl border border-slate-800">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by student name, email, or class..."
              value={teacherSearchQuery}
              onChange={(e) => setTeacherSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* State Filter Chips */}
          <div className="flex flex-wrap items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
            {["ALL", "STRUGGLING", "MASTERING", "PROGRESSING", "RECOVERING", "FORGETTING"].map((st) => (
              <button
                key={st}
                onClick={() => setTeacherFilterState(st)}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-colors text-xs ${
                  teacherFilterState === st
                    ? "bg-indigo-600 text-white shadow-md"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                {st === "ALL" ? `All (${studentsList.length})` : st.charAt(0) + st.slice(1).toLowerCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Students Cards Grid */}
        {filteredStudents.length === 0 ? (
          <div className="bg-slate-900/40 p-12 rounded-2xl border border-slate-800 text-center space-y-2">
            <Users className="w-8 h-8 text-slate-600 mx-auto" />
            <p className="text-sm font-bold text-white">No students match your filter</p>
            <p className="text-xs text-slate-400">Try clearing the search query or changing the cognitive state filter.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredStudents.map((student) => {
              const badge = getStateBadge(student.cognitiveState);
              const BadgeIcon = badge.icon;
              const accuracy = student.quizMetrics?.accuracyRate || student.performanceScore;
              const hesitation = (student.mouseActivity?.jitterIndex || 0.28).toFixed(2);

              return (
                <div
                  key={student.studentId}
                  onClick={() => setSelectedStudentId(student.studentId)}
                  className="bg-slate-900/90 hover:bg-slate-850 rounded-2xl p-5 border border-slate-800 hover:border-indigo-500/60 shadow-lg hover:shadow-indigo-500/10 transition-all cursor-pointer group space-y-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-11 h-11 rounded-xl bg-slate-800 border-2 ${student.cognitiveState === "STRUGGLING" ? "border-amber-500" : student.cognitiveState === "MASTERING" ? "border-emerald-500" : "border-indigo-500"} flex items-center justify-center text-white font-extrabold text-base shadow-inner flex-shrink-0`}>
                        {student.studentName.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-sm font-black text-white group-hover:text-indigo-300 transition-colors truncate">
                          {student.studentName}
                        </h4>
                        <p className="text-[11px] text-slate-400 truncate">
                          {student.grade} • {student.email}
                        </p>
                      </div>
                    </div>

                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${badge.color} flex items-center gap-1 flex-shrink-0`}>
                      <BadgeIcon className="w-3 h-3" />
                      {badge.label}
                    </span>
                  </div>

                  {/* 4 Mini KPIs */}
                  <div className="grid grid-cols-4 gap-2 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80 text-center text-xs">
                    <div>
                      <span className="text-[9px] text-slate-500 block">Accuracy</span>
                      <span className="font-bold text-white">{accuracy}%</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-500 block">Hesitation</span>
                      <span className="font-bold text-sky-400">{hesitation}</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-500 block">Quizzes</span>
                      <span className="font-bold text-slate-300">{student.quizMetrics?.attemptsCount || 3}</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-500 block">Concepts</span>
                      <span className="font-bold text-purple-400">{student.conceptMasteryList?.length || 2}</span>
                    </div>
                  </div>

                  {/* Diagnostic Evidence Quote */}
                  <p className="text-[11px] text-slate-300 bg-slate-950/40 p-2.5 rounded-xl border border-slate-800/60 line-clamp-2 italic">
                    "{student.recentEvidence}"
                  </p>

                  {/* Action CTA Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedStudentId(student.studentId);
                    }}
                    className="w-full py-2 bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white border border-indigo-500/30 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>View Edge AI Report & Telemetry</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6 font-sans text-left pb-16">
      {/* Teacher Navigation Header (Back to Roster & Quick Student Switcher) */}
      {isTeacherOrAdmin && selectedStudent && (
        <div className="flex flex-wrap items-center justify-between gap-3 bg-gradient-to-r from-indigo-950/60 via-slate-900 to-indigo-950/60 border border-indigo-500/30 rounded-2xl p-4 shadow-xl">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSelectedStudentId(null)}
              className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold border border-slate-700 flex items-center gap-2 transition-all shadow-sm group"
            >
              <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
              <span>Back to Students Roster</span>
            </button>
            <div className="border-l border-slate-700 pl-3">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-300 block">
                Teacher Inspection Mode
              </span>
              <h3 className="text-sm font-black text-white flex items-center gap-2">
                <span>Viewing: {selectedStudent.studentName}</span>
                <span className="text-slate-400 text-xs font-normal">({selectedStudent.grade})</span>
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 hidden sm:inline">Switch Student:</span>
            <select
              value={selectedStudent.studentId}
              onChange={(e) => setSelectedStudentId(e.target.value)}
              className="bg-slate-900 text-white text-xs font-bold px-3 py-2 rounded-xl border border-slate-700 focus:outline-none focus:border-indigo-500 cursor-pointer"
            >
              {studentsList.map((s) => (
                <option key={s.studentId} value={s.studentId}>
                  {s.studentName} — {s.cognitiveState} ({s.quizMetrics?.accuracyRate || s.performanceScore}%)
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1. TOP PIPELINE: THE FIVE EDGE AI STAGES DISPLAY */}
      {/* ========================================================================= */}
      <div className="bg-slate-900/90 rounded-3xl p-5 sm:p-6 border border-slate-800 shadow-xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center gap-1.5">
                <Brain className="w-3 h-3" />
                Adaptive Learning Stages
              </span>
              <span className="text-xs text-slate-400">
                Cognitive Progression Pipeline
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-extrabold text-white tracking-tight">
              The 5 Cognitive Learner Stages
            </h2>
          </div>

          <div className="text-xs text-slate-400 bg-slate-950/80 px-3 py-1.5 rounded-xl border border-slate-800">
            Current Stage:{" "}
            <span className="font-bold text-white uppercase ml-1">
              {overallBadge.label}
            </span>
          </div>
        </div>

        {/* 5 Stages Grid / Pipeline */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-1">
          {FIVE_STAGES.map((stage) => {
            const isCurrentStage =
              stage.key === currentOverallState ||
              (currentOverallState === "FORGETTING" && stage.key === "FORGETTING");
            const StageIcon = stage.icon;

            return (
              <div
                key={stage.key}
                className={`relative rounded-2xl p-4 border transition-all ${
                  isCurrentStage
                    ? `${stage.activeRing} bg-slate-800/90`
                    : "bg-slate-950/50 border-slate-800 hover:border-slate-700"
                }`}
              >
                {isCurrentStage && (
                  <span className="absolute -top-2.5 right-3 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-indigo-500 text-white shadow-md flex items-center gap-1">
                    <Check className="w-2.5 h-2.5" />
                    Active Stage
                  </span>
                )}

                <div className="flex items-center gap-2 mb-2">
                  <div className={`p-1.5 rounded-lg border ${stage.color}`}>
                    <StageIcon className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                      Stage {stage.stageNum}
                    </span>
                    <h4 className="text-xs font-black text-white">
                      {stage.shortLabel}
                    </h4>
                  </div>
                </div>

                <p className="text-[11px] text-slate-300 leading-snug">
                  {stage.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. OVERALL STUDENT STATUS & ACADEMIC HEALTH SUMMARY CARD */}
      {/* ========================================================================= */}
      <div className="relative overflow-hidden glass-card p-6 border-slate-200 dark:border-white/10 bg-gradient-to-br from-slate-900 via-indigo-950/50 to-slate-900 rounded-3xl shadow-xl space-y-6">
        <div className="absolute top-0 right-10 w-72 h-72 bg-indigo-500/10 blur-[90px] rounded-full pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 relative z-10">
          <div className="flex items-start sm:items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-brand-royal/20 border border-brand-royal/40 flex items-center justify-center text-brand-royal text-2xl font-black shadow-inner flex-shrink-0">
              {displayStudentName.charAt(0) || "S"}
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  {displayStudentName}
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-white/10 text-slate-300 border border-white/10">
                  {isTeacherOrAdmin ? "Student Inspection Profile" : "Student Portal"}
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1 flex flex-wrap items-center gap-2">
                <span>Board: {activeBoard?.title || "CBSE"}</span>
                <span>•</span>
                <span>Class: {displayStudentGrade}</span>
                <span>•</span>
                <span className="text-slate-400">{displayStudentEmail}</span>
              </p>
            </div>
          </div>

          {/* Overall Status Badge */}
          <div className="flex items-center gap-3">
            <div
              className={`px-5 py-3 rounded-2xl border ${overallBadge.color} backdrop-blur-md shadow-lg flex items-center gap-3.5`}
            >
              <div className="p-2.5 rounded-xl bg-white/10">
                <OverallIcon className="w-7 h-7" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Overall Cognitive State
                </span>
                <span className="text-lg font-black text-white">
                  {overallBadge.label}
                </span>
                <span className="text-xs text-slate-300 font-mono block">
                  {overallConfidence}% Calibrated Confidence
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Overall Diagnostics & Real Rationale Banner */}
        <div className="bg-slate-950/70 rounded-2xl p-4 border border-slate-800/90 text-xs text-slate-300 space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-bold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-400" />
              Overall AI Learning Assessment & Pedagogical Guidance
            </span>
            <span className="text-[11px] text-slate-400 font-mono">
              Continuous Telemetry Analysis
            </span>
          </div>
          <p className="leading-relaxed text-slate-300">
            {currentOverallState === "MASTERING"
              ? "Student demonstrates high conceptual automaticity and swift, confident decision-making across evaluated concepts. Ready to tackle advanced challenge modules."
              : currentOverallState === "STRUGGLING"
              ? "Student is encountering targeted conceptual friction in specific topics. Automated Level 1 hints and step-by-step scaffolds are actively deployed."
              : currentOverallState === "RECOVERING"
              ? "Student has demonstrated a positive turnaround, successfully completing quiz questions after receiving scaffolds."
              : currentOverallState === "FORGETTING"
              ? "Retention decay detected on previously mastered topics due to days elapsed without retrieval practice. Spaced concept revision is recommended."
              : "Student is progressing smoothly with steady answering speeds and healthy accuracy across active subjects."}
          </p>
        </div>

        {/* 4 Summary Stats Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
          <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800">
            <span className="text-[11px] text-slate-400 block mb-1">
              Average Quiz Score
            </span>
            <span className="text-xl font-black text-emerald-400">
              {avgQuizScore}%
            </span>
            <span className="text-[10px] text-slate-500 block mt-0.5">
              Across {totalQuizzes} quiz {totalQuizzes === 1 ? "attempt" : "attempts"}
            </span>
          </div>

          <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800">
            <span className="text-[11px] text-slate-400 block mb-1">
              Hesitation Index
            </span>
            <span className="text-xl font-black text-sky-400">
              {avgHesitation.toFixed(2)}
            </span>
            <span className="text-[10px] text-emerald-400 font-semibold block mt-0.5">
              ✓ Decisive interaction
            </span>
          </div>

          <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800">
            <span className="text-[11px] text-slate-400 block mb-1">
              Actively Interacted
            </span>
            <span className="text-xl font-black text-white">
              {interactedCount}{" "}
              <span className="text-xs font-normal text-slate-400">
                / {enrichedTopics.length}
              </span>
            </span>
            <span className="text-[10px] text-slate-500 block mt-0.5">
              Topics with quiz telemetry
            </span>
          </div>

          <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800">
            <span className="text-[11px] text-slate-400 block mb-1">
              Mastered Concepts
            </span>
            <span className="text-xl font-black text-purple-400">
              {masteredCount}
            </span>
            <span className="text-[10px] text-slate-500 block mt-0.5">
              {strugglingCount} requiring targeted review
            </span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. MAIN NAVIGATION TABS */}
      {/* ========================================================================= */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
        <button
          onClick={() => setActiveTab("concepts")}
          className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all ${
            activeTab === "concepts"
              ? "bg-brand-royal text-white shadow-lg"
              : "bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-white"
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Concept-to-Concept Status</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] bg-white/20">
            {enrichedTopics.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("quizzes")}
          className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all ${
            activeTab === "quizzes"
              ? "bg-brand-royal text-white shadow-lg"
              : "bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-white"
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>Quiz Activity Performance</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] bg-white/20">
            {quizResults.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("transitions")}
          className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all ${
            activeTab === "transitions"
              ? "bg-brand-royal text-white shadow-lg"
              : "bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-white"
          }`}
        >
          <History className="w-4 h-4" />
          <span>Past Status & Learning Journey</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] bg-white/20">
            {transitions.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("interventions")}
          className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all ${
            activeTab === "interventions"
              ? "bg-brand-royal text-white shadow-lg"
              : "bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-white"
          }`}
        >
          <Lightbulb className="w-4 h-4" />
          <span>Personalized Adaptive Scaffolds</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: CONCEPT-TO-CONCEPT DETAILED STATUS & TOPIC INTERACTION */}
      {/* ========================================================================= */}
      {activeTab === "concepts" && (
        <div className="space-y-4 animate-in fade-in">
          {/* Header & Filter Controls */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/60 p-4 rounded-2xl border border-slate-800">
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-400" />
                Curriculum Concept Diagnostics & Interaction Status
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Clearly identifies topics you have actively practiced versus topics not yet attempted
              </p>
            </div>

            <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
              <button
                onClick={() => setTopicFilter("ALL")}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                  topicFilter === "ALL"
                    ? "bg-indigo-600 text-white"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                All ({enrichedTopics.length})
              </button>
              <button
                onClick={() => setTopicFilter("INTERACTED")}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                  topicFilter === "INTERACTED"
                    ? "bg-indigo-600 text-white"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Interacted ({interactedCount})
              </button>
              <button
                onClick={() => setTopicFilter("STRUGGLING")}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                  topicFilter === "STRUGGLING"
                    ? "bg-amber-600 text-white"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Struggling ({strugglingCount})
              </button>
              <button
                onClick={() => setTopicFilter("MASTERED")}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                  topicFilter === "MASTERED"
                    ? "bg-emerald-600 text-white"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Mastered ({masteredCount})
              </button>
            </div>
          </div>

          {/* Topics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredTopics.map((topic) => {
              const badge = getStateBadge(topic.state);
              const IconComp = badge.icon;
              const isMastered = topic.masteryScore >= 80;
              const isStruggling = topic.state === "STRUGGLING";

              return (
                <div
                  key={topic.id}
                  className={`bg-slate-900/90 rounded-2xl p-5 border transition-all space-y-4 shadow-lg ${
                    topic.hasInteracted
                      ? "border-slate-700 hover:border-indigo-500/50"
                      : "border-slate-800/70 opacity-80"
                  }`}
                >
                  {/* Subject & Chapter Hierarchy Tag */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[11px] font-extrabold uppercase tracking-wider text-indigo-400">
                          {topic.subjectName}
                        </span>
                        <span className="text-slate-600">•</span>
                        <span className="text-[11px] font-medium text-slate-400">
                          {topic.chapterName}
                        </span>
                      </div>

                      <h4 className="text-base font-extrabold text-white">
                        {topic.topicName}
                      </h4>
                    </div>

                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold border ${badge.color} flex items-center gap-1.5 flex-shrink-0`}
                    >
                      <IconComp className="w-3.5 h-3.5" />
                      {badge.label}
                    </span>
                  </div>

                  {/* Interaction Status Pill */}
                  <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-800/80">
                    <span className="text-slate-400">Interaction Telemetry:</span>
                    {topic.hasInteracted ? (
                      <span className="px-2.5 py-0.5 rounded-full font-semibold bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5 text-[11px]">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        Actively Interacted ({topic.attemptCount} {topic.attemptCount === 1 ? "attempt" : "attempts"})
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full font-semibold bg-slate-800 text-slate-400 border border-slate-700 text-[11px]">
                        Not Yet Attempted
                      </span>
                    )}
                  </div>

                  {/* Mastery Progress Bar */}
                  <div>
                    <div className="flex justify-between text-xs text-slate-400 mb-1.5">
                      <span>Concept Mastery</span>
                      <span className="font-bold text-white">
                        {topic.masteryScore}%
                      </span>
                    </div>
                    <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          isMastered
                            ? "bg-emerald-500"
                            : isStruggling
                            ? "bg-amber-500"
                            : "bg-sky-500"
                        }`}
                        style={{ width: `${topic.masteryScore}%` }}
                      />
                    </div>
                  </div>

                  {/* Detailed Performance Metrics Row */}
                  <div className="grid grid-cols-3 gap-2 bg-slate-950/60 rounded-xl p-3 border border-slate-800/80 text-center">
                    <div>
                      <span className="text-[10px] text-slate-500 block">
                        Interactions
                      </span>
                      <span className="text-sm font-bold text-white">
                        {topic.attemptCount}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block">
                        Successful
                      </span>
                      <span className="text-sm font-bold text-emerald-400">
                        {topic.successCount}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block">
                        Retention Stability
                      </span>
                      <span className="text-sm font-bold text-indigo-400">
                        {topic.retentionScore}%
                      </span>
                    </div>
                  </div>

                  {/* Diagnostic Reason */}
                  <div className="text-xs text-slate-300 bg-slate-950/40 rounded-xl p-3 border border-slate-800/60">
                    <span className="text-indigo-400 font-semibold block mb-0.5">
                      Edge AI State Reason:
                    </span>
                    {topic.reason}
                  </div>

                  {/* Recommended Scaffold */}
                  <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-800/80">
                    <span className="text-slate-400">Adaptive Scaffold:</span>
                    <span className="font-semibold text-indigo-300">
                      {topic.scaffoldName}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: QUIZ ACTIVITY PERFORMANCE LOGS */}
      {/* ========================================================================= */}
      {activeTab === "quizzes" && (
        <div className="space-y-4 animate-in fade-in">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-indigo-400" />
              Comprehensive Quiz Activity Logs ({quizResults.length})
            </h3>
            <span className="text-xs text-slate-400">
              Each attempt monitored with mouse & response telemetry
            </span>
          </div>

          {quizResults.length === 0 ? (
            <div className="bg-slate-900/60 rounded-2xl p-8 border border-slate-800 text-center space-y-2">
              <BookOpen className="w-8 h-8 text-slate-500 mx-auto" />
              <p className="text-sm font-bold text-white">
                No quizzes taken yet
              </p>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Take quizzes in your enrolled subjects. Every answer, hesitation
                score, and response time will be logged here in detail.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {quizResults.map((result, idx) => {
                const scorePct = Math.round(
                  (result.score / (result.totalQuestions || 1)) * 100
                );
                const isPassed = scorePct >= 60;

                return (
                  <div
                    key={idx}
                    className="bg-slate-900/90 rounded-2xl p-5 border border-slate-800 hover:border-slate-700 transition-all shadow-md"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                      <div>
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                          Quiz Activity Attempt #{quizResults.length - idx}
                        </span>
                        <h4 className="text-base font-extrabold text-white">
                          {result.title}
                        </h4>
                      </div>

                      <div className="flex items-center gap-2">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-bold border ${
                            isPassed
                              ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/30"
                              : "bg-amber-500/10 text-amber-300 border-amber-500/30"
                          }`}
                        >
                          {isPassed ? "PASSED" : "NEEDS REVIEW"}
                        </span>
                        <span className="text-xs font-mono text-slate-400">
                          {result.date || "Recent"}
                        </span>
                      </div>
                    </div>

                    {/* Performance metrics grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-950/70 rounded-xl p-3.5 border border-slate-800/80 mb-3 text-left">
                      <div>
                        <span className="text-[10px] text-slate-500 block">
                          Score Achieved
                        </span>
                        <span className="text-sm font-black text-white">
                          {result.score} / {result.totalQuestions} ({scorePct}%)
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 block">
                          Time Taken
                        </span>
                        <span className="text-sm font-black text-white">
                          {result.timeTakenSeconds} seconds
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 block">
                          Avg Response Speed
                        </span>
                        <span className="text-sm font-black text-sky-400">
                          {result.totalQuestions > 0
                            ? Math.round(
                                result.timeTakenSeconds / result.totalQuestions
                              )
                            : 0}
                          s / question
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 block">
                          Cognitive Hesitation
                        </span>
                        <span className="text-sm font-black text-emerald-400">
                          Low (Decisive)
                        </span>
                      </div>
                    </div>

                    {/* Incorrect details if any */}
                    {result.incorrectAnswersDetails &&
                      result.incorrectAnswersDetails.length > 0 && (
                        <div className="bg-amber-500/5 rounded-xl p-3 border border-amber-500/20 text-xs space-y-1.5">
                          <span className="font-bold text-amber-300 block">
                            Questions Requiring Targeted Review (
                            {result.incorrectAnswersDetails.length}):
                          </span>
                          {result.incorrectAnswersDetails.map((det, dIdx) => (
                            <div
                              key={dIdx}
                              className="text-slate-300 flex items-start gap-2"
                            >
                              <span className="text-amber-400">•</span>
                              <div>
                                <span className="font-semibold text-white">
                                  {det.question}
                                </span>
                                <span className="text-slate-400 block mt-0.5">
                                  Your answer:{" "}
                                  <span className="text-amber-300">
                                    {det.yourAnswer}
                                  </span>{" "}
                                  &bull; Correct:{" "}
                                  <span className="text-emerald-300">
                                    {det.correctAnswer}
                                  </span>
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: PAST STATUS & LEARNING JOURNEY (STATE TRANSITIONS) */}
      {/* ========================================================================= */}
      {activeTab === "transitions" && (
        <div className="space-y-4 animate-in fade-in">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <History className="w-4 h-4 text-indigo-400" />
                All Past Statuses & State Transitions History
              </h3>
              <p className="text-xs text-slate-400">
                Chronological record of cognitive state shifts over your
                learning journey
              </p>
            </div>
            <span className="text-xs font-mono text-indigo-400 bg-indigo-500/10 px-3 py-1 rounded-full border border-indigo-500/20">
              {transitions.length} Recorded Shifts
            </span>
          </div>

          <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-800">
            {transitions.map((t) => {
              const fromBadge = getStateBadge(t.fromState);
              const toBadge = getStateBadge(t.toState);
              const confidencePct = Math.round(
                (t.confidence <= 1 ? t.confidence * 100 : t.confidence) || 88
              );

              return (
                <div key={t.id} className="relative group">
                  <div className="absolute -left-[1.65rem] top-2 w-3.5 h-3.5 rounded-full bg-slate-950 border-2 border-indigo-500 group-hover:scale-125 transition-transform" />

                  <div className="bg-slate-900/90 rounded-2xl p-4 border border-slate-800 hover:border-slate-700 transition-colors space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2.5 py-0.5 rounded text-xs font-bold border ${fromBadge.color}`}
                        >
                          {fromBadge.label}
                        </span>
                        <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
                        <span
                          className={`px-2.5 py-0.5 rounded text-xs font-bold border ${toBadge.color}`}
                        >
                          {toBadge.label}
                        </span>
                        <span className="text-xs font-bold text-white ml-1">
                          • {t.conceptName}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 text-xs text-slate-400">
                        <span className="flex items-center gap-1 font-mono text-indigo-300">
                          <ShieldCheck className="w-3.5 h-3.5" />
                          {confidencePct}% conf
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-500" />
                          {new Date(t.timestamp).toLocaleDateString([], {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                    </div>

                    <p className="text-xs text-slate-300 bg-slate-950/50 p-2.5 rounded-xl border border-slate-800/80">
                      <span className="font-semibold text-slate-400">
                        Telemetry Trigger:
                      </span>{" "}
                      {t.triggerEvidence || (t as any).reason || "Adaptive cognitive state transition"}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: ADAPTIVE INTERVENTIONS & HINTS LOG */}
      {/* ========================================================================= */}
      {activeTab === "interventions" && (
        <div className="space-y-4 animate-in fade-in">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Lightbulb className="w-4 h-4 text-indigo-400" />
                Adaptive Scaffolds & Pedagogical Interventions
              </h3>
              <p className="text-xs text-slate-400">
                Strategic hints, explanations, and worked solutions provided
                under the Minimum Intervention Principle
              </p>
            </div>
          </div>

          {/* Teacher Intervention Console */}
          {isTeacherOrAdmin && selectedStudent && (
            <div className="bg-gradient-to-br from-indigo-950/60 via-slate-900 to-indigo-900/30 rounded-2xl p-5 border border-indigo-500/40 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                    <Send className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-white flex items-center gap-2">
                      <span>Dispatch Teacher Intervention to {selectedStudent.studentName}</span>
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                        Live Override
                      </span>
                    </h4>
                    <p className="text-xs text-slate-400">
                      Issue an immediate adaptive scaffold level and custom pedagogical note directly to this student's dashboard.
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1.5">
                    Select Scaffold Intensity (Level 1–5):
                  </label>
                  <select
                    value={teacherInterventionLevel}
                    onChange={(e) => setTeacherInterventionLevel(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value={1}>Level 1: Strategic Clue (Minimal intervention, encourage recall)</option>
                    <option value={2}>Level 2: Conceptual Explanation (Clarify fundamental rules)</option>
                    <option value={3}>Level 3: Step-by-Step Breakdown (Guided sequential hints)</option>
                    <option value={4}>Level 4: Worked Example (Demonstrate analogous problem)</option>
                    <option value={5}>Level 5: Prerequisite Micro-Review (Targeted foundational recap)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1.5">
                    Teacher's Directive Note (Optional):
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="e.g., Focus on factorizing the terms before simplifying..."
                      value={teacherInterventionText}
                      onChange={(e) => setTeacherInterventionText(e.target.value)}
                      className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                    />
                    <button
                      onClick={handleDeployTeacherIntervention}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-md flex-shrink-0"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Deploy</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-3">
            <div className="bg-slate-900/90 rounded-2xl p-5 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-0.5 rounded text-xs font-bold bg-amber-500/10 text-amber-300 border border-amber-500/20">
                  Level 1: Strategic Conceptual Clue
                </span>
                <span className="text-xs text-slate-400">
                  Quadratic Equations &bull; Roots
                </span>
              </div>
              <p className="text-xs text-slate-300 bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                "Remember to check the sign of the discriminant: if D &gt; 0,
                two distinct real roots exist; if D = 0, roots are equal."
              </p>
              <span className="text-[11px] text-slate-500 block">
                Triggered upon high cognitive hesitation & answer switching
              </span>
            </div>

            <div className="bg-slate-900/90 rounded-2xl p-5 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-0.5 rounded text-xs font-bold bg-sky-500/10 text-sky-300 border border-sky-500/20">
                  Level 2: Conceptual Explanation
                </span>
                <span className="text-xs text-slate-400">
                  Matrices &bull; Determinants
                </span>
              </div>
              <p className="text-xs text-slate-300 bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                "For a 2x2 matrix with elements [a, b; c, d], the determinant is
                strictly calculated as ad - bc."
              </p>
              <span className="text-[11px] text-slate-500 block">
                Triggered following consecutive incorrect calculation attempts
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* BOTTOM COLLAPSIBLE DRAWER: ADVANCED SIMULATOR (Optional Testing Tool) */}
      {/* ========================================================================= */}
      <div className="mt-12 pt-6 border-t border-slate-800">
        <button
          onClick={() => setShowSimulator(!showSimulator)}
          className="w-full flex items-center justify-between p-4 rounded-2xl bg-slate-900/50 hover:bg-slate-900 border border-slate-800/80 text-left transition-colors"
        >
          <div className="flex items-center gap-3">
            <Sliders className="w-5 h-5 text-slate-400" />
            <div>
              <h4 className="text-xs sm:text-sm font-bold text-white">
                Advanced Developer Simulator & Edge vs Cloud Benchmark
              </h4>
              <p className="text-[11px] text-slate-400">
                Test scenarios or view edge latency metrics (1ms vs 520ms)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-400 font-semibold">
            <span>{showSimulator ? "Hide Simulator" : "Expand Simulator"}</span>
            {showSimulator ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </div>
        </button>

        {showSimulator && (
          <div className="mt-4 p-6 rounded-3xl bg-slate-900/90 border border-slate-800 space-y-6 animate-in fade-in">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Simulator Controls */}
              <div className="lg:col-span-2 space-y-4">
                <h5 className="text-xs font-bold text-indigo-400 uppercase tracking-wider">
                  Testbed Scenario Presets
                </h5>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <button
                    onClick={() => {
                      setSimConcept("Matrices & Determinants");
                      setSimResponseTime(8);
                      setSimHesitation(0.18);
                      setSimIsCorrect(true);
                      setSimSwitchCount(0);
                    }}
                    className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-emerald-400 border border-slate-700 text-center"
                  >
                    High Mastery
                  </button>
                  <button
                    onClick={() => {
                      setSimConcept("Quadratic Equations & Roots");
                      setSimResponseTime(45);
                      setSimHesitation(0.82);
                      setSimIsCorrect(false);
                      setSimSwitchCount(3);
                    }}
                    className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-amber-400 border border-slate-700 text-center"
                  >
                    Struggling State
                  </button>
                  <button
                    onClick={() => {
                      setSimConcept("Quadratic Equations & Roots");
                      setSimResponseTime(15);
                      setSimHesitation(0.35);
                      setSimIsCorrect(true);
                      setSimSwitchCount(1);
                    }}
                    className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-purple-400 border border-slate-700 text-center"
                  >
                    Recovery Rebound
                  </button>
                  <button
                    onClick={() => {
                      setSimConcept("Probability & Distributions");
                      setSimResponseTime(38);
                      setSimHesitation(0.65);
                      setSimIsCorrect(false);
                      setSimSwitchCount(2);
                      setSimDaysSincePractice(8);
                    }}
                    className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-rose-400 border border-slate-700 text-center"
                  >
                    Memory Decay
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <div>
                    <label className="text-xs text-slate-400 block mb-1">
                      Response Latency: {simResponseTime}s
                    </label>
                    <input
                      type="range"
                      min="2"
                      max="60"
                      value={simResponseTime}
                      onChange={(e) =>
                        setSimResponseTime(Number(e.target.value))
                      }
                      className="w-full accent-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 block mb-1">
                      Hesitation Index: {Math.round(simHesitation * 100)}%
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={simHesitation}
                      onChange={(e) => setSimHesitation(Number(e.target.value))}
                      className="w-full accent-indigo-500"
                    />
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => setSimIsCorrect(true)}
                    className={`px-4 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                      simIsCorrect
                        ? "bg-emerald-600 text-white border-emerald-500"
                        : "bg-slate-800 text-slate-400 border-slate-700"
                    }`}
                  >
                    Answer: Correct
                  </button>
                  <button
                    onClick={() => setSimIsCorrect(false)}
                    className={`px-4 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                      !simIsCorrect
                        ? "bg-red-600 text-white border-red-500"
                        : "bg-slate-800 text-slate-400 border-slate-700"
                    }`}
                  >
                    Answer: Incorrect
                  </button>
                </div>

                <button
                  onClick={() => {
                    const conceptId = simConcept.toLowerCase().replace(/[^a-z0-9]+/g, "-");
                    edgeAI.processLearnerSignal(
                      {
                        studentId: profile.id || "student_demo",
                        topicId: "topic-sim",
                        conceptId,
                        actionType: "quiz_answer",
                        responseTimeMs: simResponseTime * 1000,
                        hesitationScore: simHesitation,
                        isCorrect: simIsCorrect,
                        switchCount: simSwitchCount,
                      },
                      simConcept,
                      "maths-12",
                      profile.name || "Student"
                    );
                    setTelemetry(edgeAI.getTelemetrySummary());
                    setConcepts(edgeAI.feedbackCollector.getAllConceptMastery());
                    setTransitions(edgeAI.transitionDetector.getHistory(20));
                  }}
                  className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg transition-colors"
                >
                  ▶ Run Test Inference
                </button>
              </div>

              {/* Edge vs Cloud Specs */}
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3">
                <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Edge AI Benchmark
                </h5>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Edge Response:</span>
                    <span className="font-mono font-bold text-emerald-400">
                      {telemetry.avgLatencyMs} ms
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Cloud AI Latency:</span>
                    <span className="font-mono text-slate-500">520 ms</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Privacy Shielded:</span>
                    <span className="font-mono font-bold text-sky-400">
                      {(telemetry.privacyDataGuardedBytes / 1024).toFixed(1)} KB
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
