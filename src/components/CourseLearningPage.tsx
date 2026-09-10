import { HelpCircle, Trophy, AlertCircle } from "lucide-react";
import { generateQuiz } from "../utils/quizGenerator";
import React, { useState, useRef, useEffect } from "react";
import { useLmsStore } from "../store/index";
import type { Topic, Chapter, Subject } from "../store/types";
import { getChapterContent, getSubjectType } from "../store/curriculumData";
import { quizAPI } from "../services/api";

const getTopicThumbnail = (subjectName: string = "", chapterName: string = "", topicName: string = ""): string => {
  const subj = subjectName.toLowerCase();
  const chap = chapterName.toLowerCase();
  const top = topicName.toLowerCase();

  // 1. Chemistry (Science)
  if (chap.includes("chemical") || chap.includes("matter") || chap.includes("reaction") || chap.includes("element") || chap.includes("separation") || subj.includes("chem")) {
    return "https://images.unsplash.com/photo-1532187640683-9450c537ee4d?auto=format&fit=crop&q=80&w=800";
  }
  
  // 2. Biology (Science)
  if (chap.includes("cell") || chap.includes("organism") || chap.includes("plant") || chap.includes("animal") || chap.includes("life") || chap.includes("bio") || subj.includes("bio")) {
    return "https://images.unsplash.com/photo-1530026405186-ed1ea0ac7a63?auto=format&fit=crop&q=80&w=800";
  }

  // 3. Physics (Science)
  if (chap.includes("motion") || chap.includes("force") || chap.includes("light") || chap.includes("electricity") || chap.includes("heat") || chap.includes("sound") || chap.includes("magnet") || chap.includes("measure") || subj.includes("phys")) {
    return "https://images.unsplash.com/photo-1507668077129-56e32842fceb?auto=format&fit=crop&q=80&w=800";
  }

  // 4. Geometry & Mensuration (Mathematics)
  if (chap.includes("geometry") || chap.includes("mensuration") || chap.includes("trig") || chap.includes("coordinate") || chap.includes("triangle") || chap.includes("circle") || top.includes("geometric") || top.includes("dimension")) {
    return "https://images.unsplash.com/photo-1509228468518-180dd4864904?auto=format&fit=crop&q=80&w=800";
  }

  // 5. Algebra & Numbers (Mathematics)
  if (chap.includes("algebra") || chap.includes("matrix") || chap.includes("determinant") || chap.includes("number") || chap.includes("equation") || chap.includes("polynomial")) {
    return "https://images.unsplash.com/photo-1635070041078-e363dbe005cb?auto=format&fit=crop&q=80&w=800";
  }

  // 6. Statistics & Probability (Mathematics)
  if (chap.includes("stat") || chap.includes("probab") || chap.includes("mean") || chap.includes("median") || chap.includes("mode") || chap.includes("data")) {
    return "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&q=80&w=800";
  }

  // 7. General Mathematics
  if (subj.includes("math")) {
    return "https://images.unsplash.com/photo-1509228468518-180dd4864904?auto=format&fit=crop&q=80&w=800";
  }

  // 8. Social Science
  if (subj.includes("social") || subj.includes("history") || subj.includes("geo") || subj.includes("civics")) {
    return "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&q=80&w=800";
  }

  // 9. English / Languages
  if (subj.includes("eng") || subj.includes("lang") || subj.includes("gram") || subj.includes("lit")) {
    return "https://images.unsplash.com/photo-1455390582262-044cdead277a?auto=format&fit=crop&q=80&w=800";
  }

  return "https://images.unsplash.com/photo-1635070041078-e363dbe005cb?auto=format&fit=crop&q=80&w=800";
};

const getSubjectColor = (title: string) => {
  const t = title.toLowerCase();
  if (t.includes("math")) return "bg-blue-600";
  if (t.includes("science") && !t.includes("social"))
    return "bg-purple-600";
  if (t.includes("social")) return "bg-orange-600";
  if (t.includes("english")) return "bg-rose-600";
  if (t.includes("tamil")) return "bg-emerald-600";
  return "bg-slate-600";
};
import {
  Play,
  Pause,
  BookOpen,
  FileText,
  Bookmark,
  CheckCircle,
  Plus,
  Trash2,
  ArrowRight,
  Star,
  Clock,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Printer,
  Download,
  Search,
  RotateCw,
  ExternalLink,
  Maximize2,
  Minimize2,
  Sun,
  Moon,
  Cpu,
  Zap,
  Sparkles,
  Layers,
  RotateCcw,
  AlertTriangle,
  Lock,
  ShieldAlert,
} from "lucide-react";
import { edgeAI, type ScaffoldedPackage, type EdgeTelemetrySummary } from "../services/edge";

export const CourseLearningPage: React.FC = () => {
  const {
    boards,
    profile,
    activeSubjectId,
    activeChapterId,
    activeTopicId,
    completeTopic,
    bookmarks,
    addBookmark,
    deleteBookmark,
    setActiveCourseContext,
    setView,
    setActiveQuiz,
  } = useLmsStore();

  const [activeTab, setActiveTab] = useState<
    "pdf" | "bookmarks" | "quiz" | "adaptive-ai"
  >("pdf");
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [maxWatchedTime, setMaxWatchedTime] = useState(0);
  const [skipWarning, setSkipWarning] = useState<string | null>(null);
  const warningTimeoutRef = useRef<number | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [videoDuration] = useState(1200); // 20 mins duration in seconds
  const [bookmarkText, setBookmarkText] = useState("");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [edgeTelemetry, setEdgeTelemetry] = useState<EdgeTelemetrySummary>(edgeAI.getTelemetrySummary());
  const [adaptivePackage, setAdaptivePackage] = useState<ScaffoldedPackage | null>(null);
  const [guidedAnswer, setGuidedAnswer] = useState<number | null>(null);
  const [guidedFeedback, setGuidedFeedback] = useState<string | null>(null);

  const showAntiSkipWarning = (
    msg = "Video skipping is disabled! You must watch the lecture sequentially to understand the concepts."
  ) => {
    setSkipWarning(msg);
    if (warningTimeoutRef.current) {
      window.clearTimeout(warningTimeoutRef.current);
    }
    warningTimeoutRef.current = window.setTimeout(() => {
      setSkipWarning(null);
    }, 3500);
  };

  useEffect(() => {
    const unsub = edgeAI.subscribe((sum) => setEdgeTelemetry(sum));
    return unsub;
  }, []);

  // Track reading time & scroll telemetry when on the page
  useEffect(() => {
    const startReadingTime = Date.now();
    const interval = setInterval(() => {
      const minutesSpent = (Date.now() - startReadingTime) / 60000;
      const scrollPercent = typeof window !== "undefined"
        ? Math.min(100, Math.round(((window.scrollY + window.innerHeight) / (document.body.scrollHeight || 1)) * 100))
        : 80;
      edgeAI.dataCollector.recordNotesReading(minutesSpent, scrollPercent);
    }, 15000);

    return () => clearInterval(interval);
  }, [activeTopicId]);

  const handleRequestAdaptiveHelp = (customLevel: number = 1) => {
    const conceptName = activeTopic?.title || "Topic Concept";
    const conceptId = activeTopic?.id || "concept-1";
    const subjectId = activeSubject?.id || "sub-1";

    setGuidedAnswer(null);
    setGuidedFeedback(null);

    const res = edgeAI.processLearnerSignal(
      {
        studentId: profile.id || "student",
        topicId: activeTopic?.id || "topic-1",
        conceptId,
        actionType: "note_read",
        responseTimeMs: 18000,
        hesitationScore: 0.5,
        timeSpentMs: 30000,
      },
      conceptName,
      subjectId,
      profile.name,
      customLevel
    );

    setAdaptivePackage(res.scaffoldedPackage);
    setActiveTab("adaptive-ai");
  };
  const playerContainerRef = useRef<HTMLDivElement>(null);

  const handleToggleFullscreen = () => {
    if (!playerContainerRef.current) return;
    if (!document.fullscreenElement) {
      playerContainerRef.current.requestFullscreen().catch((err) => {
        console.error("Error attempting to enable fullscreen:", err);
      });
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);



  const [expandedChapterId, setExpandedChapterId] = useState<string | null>(null);

  useEffect(() => {
    if (activeChapterId) {
      setExpandedChapterId(activeChapterId);
    }
  }, [activeChapterId]);

  const activeBoard =
    boards.find((b) => b.id === profile.selectedBoardId) || boards[0];
  const activeClass =
    activeBoard?.classes?.find((c) => c.id === profile.selectedClassId) ||
    activeBoard?.classes?.[0];

  if (!activeBoard || !activeClass) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-royal"></div>
      </div>
    );
  }

  const activeSubject =
    activeClass?.subjects.find((s) => s.id === activeSubjectId) ||
    activeClass?.subjects[0];
  const activeChapter =
    activeSubject?.chapters.find((c) => c.id === activeChapterId) ||
    activeSubject?.chapters[0];
  const activeTopic =
    activeChapter?.topics.find((t) => t.id === activeTopicId) ||
    activeChapter?.topics[0];



  const getTopicPdfInfo = (chapterTitle: string, topicPdfUrl?: string) => {
    const title = chapterTitle.toLowerCase();
    const chId = activeChapter?.id || "";
    const subId = activeSubject?.id || "";
    const clId = activeClass?.id || "";

    const isCl9 = clId === "class-9" || activeClass?.title === "Class 9";
    const isCl10 = clId === "class-10" || activeClass?.title === "Class 10";
    const isCl11 = clId === "class-11" || activeClass?.title === "Class 11";
    const isCl12 = clId === "class-12" || activeClass?.title === "Class 12";

    const sTitle = activeSubject?.title || "";

    // Class 9 Maths chapters
    if (isCl9 && (subId === "maths-9" || sTitle === "Mathematics")) {
      if (title.includes("set language")) {
        return { url: "/Unit_1_Set_Language_Notes.pdf", name: "Unit_1_Set_Language_Notes.pdf" };
      }
      if (title.includes("real numbers")) {
        return { url: "/Unit_2_Real_Numbers_Notes.pdf", name: "Unit_2_Real_Numbers_Notes.pdf" };
      }
      if (title.includes("algebra")) {
        return { url: "/Unit_3_Algebra_Notes.pdf", name: "Unit_3_Algebra_Notes.pdf" };
      }
      if (title.includes("coordinate geometry")) {
        return { url: "/Unit_5_Coordinate_Geometry_Notes.pdf", name: "Unit_5_Coordinate_Geometry_Notes.pdf" };
      }
      if (title.includes("geometry")) {
        return { url: "/Unit_4_Geometry_Notes.pdf", name: "Unit_4_Geometry_Notes.pdf" };
      }
      if (title.includes("trigonometry")) {
        return { url: "/Unit_6_Trigonometry_Notes.pdf", name: "Unit_6_Trigonometry_Notes.pdf" };
      }
      if (title.includes("mensuration")) {
        return { url: "/Unit_7_Mensuration_Notes.pdf", name: "Unit_7_Mensuration_Notes.pdf" };
      }
      if (title.includes("statistics")) {
        return { url: "/Unit_8_Statistics_Notes.pdf", name: "Unit_8_Statistics_Notes.pdf" };
      }
      if (title.includes("probability")) {
        return { url: "/Unit_9_Probability_Notes.pdf", name: "Unit_9_Probability_Notes.pdf" };
      }
    }

    // Class 9 Science topics
    if (isCl9 && (subId === "science-9" || sTitle === "Science")) {
      const tId = activeTopic?.id || "";
      const tTitle = (activeTopic?.title || "").toLowerCase();
      
      if (tId.includes("sci-ph-t1") || tTitle.includes("measurement")) {
        return { url: "/Science_Physics_Measurement_Notes.pdf", name: "Science_Physics_Measurement_Notes.pdf" };
      }
      if (tId.includes("sci-ph-t2") || tTitle.includes("motion")) {
        return { url: "/Science_Physics_Motion_Notes.pdf", name: "Science_Physics_Motion_Notes.pdf" };
      }
      if (tId.includes("sci-ph-t3") || tTitle.includes("force")) {
        return { url: "/Science_Physics_Force_Notes.pdf", name: "Science_Physics_Force_Notes.pdf" };
      }
      if (tId.includes("sci-ph-t4") || tTitle.includes("gravitation")) {
        return { url: "/Science_Physics_Gravitation_Notes.pdf", name: "Science_Physics_Gravitation_Notes.pdf" };
      }
      if (tId.includes("sci-ph-t5") || tTitle.includes("work")) {
        return { url: "/Science_Physics_Work_Power_Energy_Notes.pdf", name: "Science_Physics_Work_Power_Energy_Notes.pdf" };
      }
      if (tId.includes("sci-ph-t6") || tTitle.includes("sound")) {
        return { url: "/Science_Physics_Sound_Notes.pdf", name: "Science_Physics_Sound_Notes.pdf" };
      }

      if (tId.includes("sci-ch-t1") || tTitle.includes("matter")) {
        return { url: "/Science_Chemistry_Matter_Notes.pdf", name: "Science_Chemistry_Matter_Notes.pdf" };
      }
      if (tId.includes("sci-ch-t2") || tTitle.includes("atoms")) {
        return { url: "/Science_Chemistry_Atoms_Molecules_Notes.pdf", name: "Science_Chemistry_Atoms_Molecules_Notes.pdf" };
      }
      if (tId.includes("sci-ch-t3") || tTitle.includes("structure")) {
        return { url: "/Science_Chemistry_Structure_Atom_Notes.pdf", name: "Science_Chemistry_Structure_Atom_Notes.pdf" };
      }
      if (tId.includes("sci-ch-t4") || tTitle.includes("periodic")) {
        return { url: "/Science_Chemistry_Periodic_Classification_Notes.pdf", name: "Science_Chemistry_Periodic_Classification_Notes.pdf" };
      }
      if (tId.includes("sci-ch-t5") || tTitle.includes("bonding")) {
        return { url: "/Science_Chemistry_Chemical_Bonding_Notes.pdf", name: "Science_Chemistry_Chemical_Bonding_Notes.pdf" };
      }

      if (tId.includes("sci-bi-t1") || tTitle.includes("cell")) {
        return { url: "/Science_Biology_The_Cell_Notes.pdf", name: "Science_Biology_The_Cell_Notes.pdf" };
      }
      if (tId.includes("sci-bi-t2") || tTitle.includes("tissues")) {
        return { url: "/Science_Biology_Tissues_Notes.pdf", name: "Science_Biology_Tissues_Notes.pdf" };
      }
      if (tId.includes("sci-bi-t3") || tTitle.includes("diversity")) {
        return { url: "/Science_Biology_Diversity_Notes.pdf", name: "Science_Biology_Diversity_Notes.pdf" };
      }
      if (tId.includes("sci-bi-t4") || tTitle.includes("ill") || tTitle.includes("health")) {
        return { url: "/Science_Biology_Why_Do_We_Fall_Ill_Notes.pdf", name: "Science_Biology_Why_Do_We_Fall_Ill_Notes.pdf" };
      }
      if (tId.includes("sci-bi-t5") || tTitle.includes("natural")) {
        return { url: "/Science_Biology_Natural_Resources_Notes.pdf", name: "Science_Biology_Natural_Resources_Notes.pdf" };
      }

      if (title.includes("physics")) {
        return { url: "/Science_Ch1_Physics_Notes.pdf", name: "Science_Ch1_Physics_Notes.pdf" };
      }
      if (title.includes("chemistry")) {
        return { url: "/Science_Ch2_Chemistry_Notes.pdf", name: "Science_Ch2_Chemistry_Notes.pdf" };
      }
      if (title.includes("biology")) {
        return { url: "/Science_Ch3_Biology_Notes.pdf", name: "Science_Ch3_Biology_Notes.pdf" };
      }
    }

    // Class 10 Maths
    if (isCl10 && (subId === "maths-10" || sTitle === "Mathematics")) {
      let num = "";
      const idMatch = chId.match(/ch(\d+)/i);
      const titleMatch = chapterTitle.match(/(?:Chapter|Unit)\s+(\d+)/i);
      if (idMatch) num = idMatch[1];
      else if (titleMatch) num = titleMatch[1];
      if (num) {
        return { url: `/Class10_Maths_Ch${num}_Notes.pdf`, name: `Class10_Maths_Ch${num}_Notes.pdf` };
      }
    }

    // Class 10 Science
    if (isCl10 && (subId === "science-10" || sTitle === "Science")) {
      if (chId === "sci10-ch1" || title.includes("physics")) return { url: "/Class10_Science_Physics_Notes.pdf", name: "Class10_Science_Physics_Notes.pdf" };
      if (chId === "sci10-ch2" || title.includes("chemistry")) return { url: "/Class10_Science_Chemistry_Notes.pdf", name: "Class10_Science_Chemistry_Notes.pdf" };
      if (chId === "sci10-ch3" || title.includes("biology")) return { url: "/Class10_Science_Biology_Notes.pdf", name: "Class10_Science_Biology_Notes.pdf" };
      if (chId === "sci10-ch4" || title.includes("computer science") || title.includes("compsci")) return { url: "/Class10_Science_CompSci_Notes.pdf", name: "Class10_Science_CompSci_Notes.pdf" };
    }

    // Class 11 Maths
    if (isCl11 && (subId.startsWith("maths-11") || sTitle.startsWith("Mathematics"))) {
      const vol = (subId.includes("v1") || sTitle.includes("Volume 1")) ? "1" : "2";
      let num = "";
      const idMatch = chId.match(/ch(\d+)/i);
      const titleMatch = chapterTitle.match(/(?:Chapter|Unit)\s+(\d+)/i);
      if (idMatch) num = idMatch[1];
      else if (titleMatch) num = titleMatch[1];
      if (num) {
        return { url: `/Class11_Maths_Vol${vol}_Ch${num}_Notes.pdf`, name: `Class11_Maths_Vol${vol}_Ch${num}_Notes.pdf` };
      }
    }

    // Class 11 Physics
    if (isCl11 && (subId.startsWith("physics-11") || sTitle.startsWith("Physics"))) {
      const vol = (subId.includes("v1") || sTitle.includes("Volume 1")) ? "1" : "2";
      let num = "";
      const idMatch = chId.match(/ch(\d+)/i);
      const titleMatch = chapterTitle.match(/(?:Chapter|Unit)\s+(\d+)/i);
      if (idMatch) num = idMatch[1];
      else if (titleMatch) num = titleMatch[1];
      if (num) {
        return { url: `/Class11_Physics_Vol${vol}_Ch${num}_Notes.pdf`, name: `Class11_Physics_Vol${vol}_Ch${num}_Notes.pdf` };
      }
    }

    // Class 11 Chemistry
    if (isCl11 && (subId.startsWith("chemistry-11") || sTitle.startsWith("Chemistry"))) {
      const vol = (subId.includes("v1") || sTitle.includes("Volume 1")) ? "1" : "2";
      let num = "";
      const idMatch = chId.match(/ch(\d+)/i);
      const titleMatch = chapterTitle.match(/(?:Chapter|Unit)\s+(\d+)/i);
      if (idMatch) num = idMatch[1];
      else if (titleMatch) num = titleMatch[1];
      if (num) {
        return { url: `/Class11_Chemistry_Vol${vol}_Ch${num}_Notes.pdf`, name: `Class11_Chemistry_Vol${vol}_Ch${num}_Notes.pdf` };
      }
    }

    // Class 12 Maths
    if (isCl12 && (subId.startsWith("maths-12") || sTitle.startsWith("Mathematics"))) {
      const vol = (subId.includes("v1") || sTitle.includes("Volume 1")) ? "1" : "2";
      let num = "";
      const idMatch = chId.match(/ch(\d+)/i);
      const titleMatch = chapterTitle.match(/(?:Chapter|Unit)\s+(\d+)/i);
      if (idMatch) num = idMatch[1];
      else if (titleMatch) num = titleMatch[1];
      if (num) {
        return { url: `/Class12_Maths_Vol${vol}_Ch${num}_Notes.pdf`, name: `Class12_Maths_Vol${vol}_Ch${num}_Notes.pdf` };
      }
    }

    // Class 12 Physics
    if (isCl12 && (subId.startsWith("physics-12") || sTitle.startsWith("Physics"))) {
      const vol = (subId.includes("v1") || sTitle.includes("Volume 1")) ? "1" : "2";
      let num = "";
      const idMatch = chId.match(/ch(\d+)/i);
      const titleMatch = chapterTitle.match(/(?:Chapter|Unit)\s+(\d+)/i);
      if (idMatch) num = idMatch[1];
      else if (titleMatch) num = titleMatch[1];
      if (num) {
        return { url: `/Class12_Physics_Vol${vol}_Ch${num}_Notes.pdf`, name: `Class12_Physics_Vol${vol}_Ch${num}_Notes.pdf` };
      }
    }

    // Class 12 Chemistry
    if (isCl12 && (subId.startsWith("chemistry-12") || sTitle.startsWith("Chemistry"))) {
      const vol = (subId.includes("v1") || sTitle.includes("Volume 1")) ? "1" : "2";
      let num = "";
      const idMatch = chId.match(/ch(\d+)/i);
      const titleMatch = chapterTitle.match(/(?:Chapter|Unit)\s+(\d+)/i);
      if (idMatch) num = idMatch[1];
      else if (titleMatch) num = titleMatch[1];
      if (num) {
        return { url: `/Class12_Chemistry_Vol${vol}_Ch${num}_Notes.pdf`, name: `Class12_Chemistry_Vol${vol}_Ch${num}_Notes.pdf` };
      }
    }

    return {
      url: topicPdfUrl || "/adjoint_inverse_rank_notes.pdf",
      name: topicPdfUrl ? topicPdfUrl.substring(topicPdfUrl.lastIndexOf("/") + 1) : "adjoint_inverse_rank_notes.pdf"
    };
  };

  const [isLoadingQuiz, setIsLoadingQuiz] = useState(false);



  const handleStartQuiz = async () => {
    if (!activeTopic) return;
    setIsLoadingQuiz(true);
    try {
      const fetched = await quizAPI.getQuizzesByTopic(activeTopic.id);
      if (fetched && fetched.length > 0) {
        const quiz = fetched[0];
        const existingQuizzes = useLmsStore.getState().quizzes || [];
        const updatedQuizzes = [
          ...existingQuizzes.filter((q) => q.id !== quiz.id),
          quiz,
        ];
        useLmsStore.setState({ quizzes: updatedQuizzes });
        setActiveQuiz(quiz.id);
        setView("quiz-view");
      } else {
        // Fallback: seed/generate a quiz on frontend
        const fallbackQuiz = generateQuiz(
          activeSubject?.title || "Subject",
          activeChapter?.title || "Chapter",
          activeTopic?.title || "Topic",
        );
        const quizId = `quiz-gen-${activeTopic.id}`;
        const mappedFallbackQuiz = {
          id: quizId,
          title: `${activeTopic.title} Assessment`,
          subjectId: activeTopic.id,
          chapterId: activeTopic.id,
          durationMinutes: 10,
          questions: fallbackQuiz.map((q: any, i: number) => ({
            id: `q-${quizId}-${i}`,
            question: q.question,
            options: q.options,
            correctAnswerIndex: q.correctAnswerIndex,
            explanation: q.explanation || "Review the lesson material for a detailed explanation.",
          })),
        };
        const existingQuizzes = useLmsStore.getState().quizzes || [];
        const updatedQuizzes = [
          ...existingQuizzes.filter((q) => q.id !== mappedFallbackQuiz.id),
          mappedFallbackQuiz,
        ];
        useLmsStore.setState({ quizzes: updatedQuizzes });
        setActiveQuiz(mappedFallbackQuiz.id);
        setView("quiz-view");
      }
    } catch (err) {
      console.error("Failed to load quiz, using fallback generation", err);
      try {
        const fallbackQuiz = generateQuiz(
          activeSubject?.title || "Subject",
          activeChapter?.title || "Chapter",
          activeTopic?.title || "Topic",
        );
        const quizId = `quiz-gen-${activeTopic.id}`;
        const mappedFallbackQuiz = {
          id: quizId,
          title: `${activeTopic.title} Assessment`,
          subjectId: activeTopic.id,
          chapterId: activeTopic.id,
          durationMinutes: 10,
          questions: fallbackQuiz.map((q: any, i: number) => ({
            id: `q-${quizId}-${i}`,
            question: q.question,
            options: q.options,
            correctAnswerIndex: q.correctAnswerIndex,
            explanation: q.explanation || "Review the lesson material for a detailed explanation.",
          })),
        };
        const existingQuizzes = useLmsStore.getState().quizzes || [];
        const updatedQuizzes = [
          ...existingQuizzes.filter((q) => q.id !== mappedFallbackQuiz.id),
          mappedFallbackQuiz,
        ];
        useLmsStore.setState({ quizzes: updatedQuizzes });
        setActiveQuiz(mappedFallbackQuiz.id);
        setView("quiz-view");
      } catch (innerErr) {
        console.error("Fallback generation failed", innerErr);
        alert("Failed to load or generate quiz.");
      }
    } finally {
      setIsLoadingQuiz(false);
    }
  };

  const timerRef = useRef<number | null>(null);

  // Reset playback and furthest watched time when switching topics
  useEffect(() => {
    setCurrentTime(0);
    setMaxWatchedTime(0);
    setIsPlaying(false);
    setSkipWarning(null);
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.pause();
    }
  }, [activeTopic?.id]);

  // Playback Simulation & Telemetry
  useEffect(() => {
    if (isPlaying) {
      if (videoRef.current) {
        videoRef.current.play().catch(() => {});
      }
      timerRef.current = window.setInterval(() => {
        setCurrentTime((prev) => {
          const next = prev + 1;
          setMaxWatchedTime((currMax) => Math.max(currMax, next));

          if (next >= videoDuration) {
            setIsPlaying(false);
            if (timerRef.current) clearInterval(timerRef.current);

            // Auto-complete topic when video ends
            if (
              activeSubject &&
              activeChapter &&
              activeTopic &&
              !activeTopic.isCompleted
            ) {
              completeTopic(
                activeBoard.id,
                activeClass.id,
                activeSubject.id,
                activeChapter.id,
                activeTopic.id,
              );
              useLmsStore
                .getState()
                .addNotification(
                  "Topic Completed",
                  `You have successfully completed "${activeTopic.title}"!`,
                  "success",
                );
            }
            return videoDuration;
          }
          return next;
        });
      }, 1000);
    } else {
      if (videoRef.current) {
        videoRef.current.pause();
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [
    isPlaying,
    videoDuration,
    activeBoard.id,
    activeClass.id,
    activeSubject,
    activeChapter,
    activeTopic,
    completeTopic,
  ]);

  // Formatter for time display
  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainingSecs = secs % 60;
    return `${mins.toString().padStart(2, "0")}:${remainingSecs.toString().padStart(2, "0")}`;
  };

  // Anti-skip seek handler: Only allow seeking backwards, strictly block skipping ahead
  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const width = rect.width;
    const newPercent = Math.max(0, Math.min(1, clickX / width));
    const targetTime = Math.floor(newPercent * videoDuration);

    // ANTI-SKIP ENFORCEMENT:
    // Prevent skipping ahead past furthest watched position (+2s tolerance)
    if (targetTime > maxWatchedTime + 2) {
      showAntiSkipWarning("Video skipping is disabled! You cannot skip ahead in lecture videos.");
      return;
    }

    // Rewinding / re-watching earlier segments is permitted
    setCurrentTime(targetTime);
    if (videoRef.current) {
      videoRef.current.currentTime = targetTime;
    }
  };

  // Prevent keyboard fast-forwarding shortcuts
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowRight" || e.key === "l" || e.key === "L" || e.key === "PageDown") {
      e.preventDefault();
      showAntiSkipWarning("Fast-forwarding via keyboard shortcuts is disabled.");
    }
  };

  const handleVideoTimeUpdate = () => {
    if (!videoRef.current) return;
    const vTime = Math.floor(videoRef.current.currentTime);
    if (videoRef.current.currentTime > maxWatchedTime + 2) {
      videoRef.current.currentTime = maxWatchedTime;
      showAntiSkipWarning("Video skipping is disabled. Playback returned to current position.");
      return;
    }
    setCurrentTime(vTime);
    setMaxWatchedTime((currMax) => Math.max(currMax, vTime));
  };

  const handleVideoSeeking = () => {
    if (!videoRef.current) return;
    if (videoRef.current.currentTime > maxWatchedTime + 2) {
      videoRef.current.currentTime = maxWatchedTime;
      showAntiSkipWarning("Fast-forwarding is disabled for this course lecture.");
    }
  };

  const handleMarkAsCompleted = () => {
    if (activeSubject && activeChapter && activeTopic) {
      completeTopic(
        activeBoard.id,
        activeClass.id,
        activeSubject.id,
        activeChapter.id,
        activeTopic.id,
      );
      // Trigger notification
      useLmsStore
        .getState()
        .addNotification(
          "Topic Completed!",
          `You have successfully mastered "${activeTopic.title}" and gained 200 XP!`,
          "success",
        );
    }
  };

  const handleAddBookmarkSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookmarkText || !activeTopic || !activeChapter || !activeSubject)
      return;

    addBookmark(
      {
        topicId: activeTopic.id,
        topicTitle: activeTopic.title,
        chapterTitle: activeChapter.title,
        subjectTitle: activeSubject.title,
        note: bookmarkText,
      },
      formatTime(currentTime),
    );

    setBookmarkText("");
  };

  // Anti-skip bookmark jumping: Block jumping forward to unwatched bookmark positions
  const jumpToBookmarkTime = (timestamp: string) => {
    const parts = timestamp.split(":");
    let secs = 0;
    if (parts.length === 2) {
      secs = parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
    } else if (parts.length === 3) {
      secs = parseInt(parts[0], 10) * 3600 + parseInt(parts[1], 10) * 60 + parseInt(parts[2], 10);
    }

    if (secs > maxWatchedTime + 2) {
      showAntiSkipWarning("Skipping ahead to this bookmark is disabled. You can only jump to bookmarks in sections you've already watched.");
      return;
    }

    setCurrentTime(secs);
    if (videoRef.current) {
      videoRef.current.currentTime = secs;
    }
    setIsPlaying(true);
  };

  if (!activeSubject) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center p-6 bg-slate-900 rounded-2xl border border-white/5">
        <h3 className="text-lg font-bold text-white mb-2">
          No Courses Enrolled
        </h3>
        <p className="text-xs text-slate-400">
          Please choose boards/subjects in your profile wizard.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 font-sans">
      {/* Left Column: Player & Tabs */}
      <div className="lg:col-span-2 space-y-6">
        {/* Custom Mock Video Player with Anti-Skip Protection */}
        <div
          ref={playerContainerRef}
          tabIndex={0}
          onKeyDown={handleKeyDown}
          className="relative aspect-[16/9] w-full rounded-2xl bg-black border border-white/10 shadow-2xl overflow-hidden group video-glow-container outline-none"
          style={isFullscreen ? { aspectRatio: "auto", height: "100%", width: "100%" } : {}}
        >
          {/* Anti-Skip Protection Toast Alert */}
          {skipWarning && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-40 px-4 py-2 rounded-xl bg-rose-950/95 border border-rose-500/60 shadow-2xl backdrop-blur-md text-white flex items-center gap-2.5 animate-bounce transition-all pointer-events-none">
              <ShieldAlert className="w-4 h-4 text-rose-400 flex-shrink-0 animate-pulse" />
              <span className="text-xs font-bold tracking-wide">{skipWarning}</span>
            </div>
          )}

          {/* HTML5 Video or Simulated Stream */}
          {activeTopic?.videoUrl ? (
            <video
              ref={videoRef}
              src={activeTopic.videoUrl}
              className="w-full h-full object-contain bg-black"
              playsInline
              disablePictureInPicture
              controls={false}
              onTimeUpdate={handleVideoTimeUpdate}
              onSeeking={handleVideoSeeking}
              onEnded={() => {
                setIsPlaying(false);
                if (
                  activeSubject &&
                  activeChapter &&
                  activeTopic &&
                  !activeTopic.isCompleted
                ) {
                  completeTopic(
                    activeBoard.id,
                    activeClass.id,
                    activeSubject.id,
                    activeChapter.id,
                    activeTopic.id,
                  );
                  useLmsStore
                    .getState()
                    .addNotification(
                      "Topic Completed",
                      `You have successfully completed "${activeTopic.title}"!`,
                      "success",
                    );
                }
              }}
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <div
                className="absolute inset-0 bg-cover bg-center opacity-30 filter blur-[1px]"
                style={{
                  backgroundImage: `url('${getTopicThumbnail(activeSubject?.title, activeChapter?.title, activeTopic?.title)}')`,
                }}
              />

              {/* Pulsing play button overlay when paused */}
              {!isPlaying && (
                <button
                  type="button"
                  onClick={() => setIsPlaying(true)}
                  className="w-20 h-20 rounded-full bg-black/60 hover:bg-black/85 border border-white/20 flex items-center justify-center relative z-10 hover:scale-110 active:scale-95 transition-all shadow-2xl shadow-black/50 group cursor-pointer animate-pulse-slow"
                >
                  <Play className="w-8 h-8 text-white fill-white translate-x-0.5 transition-transform duration-300 group-hover:scale-110" />
                </button>
              )}

              {/* Context Watermark */}
              <div className="absolute top-4 left-4 text-[9px] text-white/20 select-none font-mono tracking-widest z-10">
                NEXORA LEARNING SECURE STREAM // ANTI-SKIP PROTECTION ACTIVE
              </div>
            </div>
          )}

          {/* Custom Player Controls HUD */}
          <div className="absolute bottom-0 left-0 right-0 p-4 bg-black/85 border-t border-white/10 flex flex-col gap-2 z-20">
            {/* Progress Bar (Anti-Skip Protected) */}
            <div
              onClick={handleSeek}
              className="w-full h-2 bg-white/20 hover:bg-white/25 rounded-full cursor-pointer relative overflow-hidden transition-all"
              title={`Watched: ${formatTime(maxWatchedTime)} of ${formatTime(videoDuration)} (Fast-forwarding locked)`}
            >
              {/* Unlocked / Watched Segment */}
              <div
                className="h-full bg-emerald-500/40 absolute top-0 left-0 transition-all duration-300"
                style={{ width: `${Math.min(100, (maxWatchedTime / videoDuration) * 100)}%` }}
              />
              {/* Current Playhead */}
              <div
                className="h-full bg-brand-royal absolute top-0 left-0 transition-all duration-150"
                style={{ width: `${Math.min(100, (currentTime / videoDuration) * 100)}%` }}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="p-1.5 rounded-lg hover:bg-white/10 text-white transition-colors"
                >
                  {isPlaying ? (
                    <Pause className="w-5 h-5 fill-current" />
                  ) : (
                    <Play className="w-5 h-5 fill-current" />
                  )}
                </button>

                <span className="text-xs font-semibold text-slate-300 font-mono">
                  {formatTime(currentTime)} / {formatTime(videoDuration)}
                </span>

                {/* Anti-Skip Protection Badge */}
                <span className="flex items-center gap-1.5 text-[10px] font-bold text-amber-300 bg-amber-500/20 px-2.5 py-0.5 rounded-full border border-amber-500/30 select-none">
                  <Lock className="w-3 h-3 text-amber-400" />
                  <span>Skipping Disabled</span>
                </span>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider bg-slate-950 px-2 py-0.5 rounded border border-white/5">
                  {activeTopic?.title || "Chapter Topic"}
                </span>

                <button
                  type="button"
                  onClick={handleToggleFullscreen}
                  className="p-1.5 rounded-lg hover:bg-white/10 text-white transition-colors"
                  title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
                >
                  {isFullscreen ? (
                    <Minimize2 className="w-4.5 h-4.5" />
                  ) : (
                    <Maximize2 className="w-4.5 h-4.5" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Video Description & Header Info */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 dark:border-white/5 pb-6 text-left">
          <div>
            <span className="text-xs text-brand-violet dark:text-brand-violet-light font-bold tracking-wider uppercase">
              {activeSubject.title} • {activeChapter?.title || "Chapter"}
            </span>
            <h2 className="text-xl font-extrabold text-slate-900 dark:text-white mt-1">
              {activeTopic?.title || "Introductory Topic"}
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleRequestAdaptiveHelp()}
              className="px-3.5 py-2 rounded-xl bg-brand-royal/10 hover:bg-brand-royal/20 text-brand-royal dark:text-brand-royal-light border border-brand-royal/20 text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm"
            >
              <Cpu className="w-3.5 h-3.5" />
              <span>Ask Edge AI Help</span>
            </button>
          </div>
        </div>

        {/* Lower Workspace Tabs (Content explanation, Bookmarks, PDFs, Edge AI) */}
        <div className="space-y-4">
          <div className="flex border-b border-slate-200 dark:border-white/5 gap-4 overflow-x-auto">
            {[
              { id: "pdf", label: "Notes & Worksheets", icon: FileText },
              { id: "adaptive-ai", label: "Edge AI Scaffolding", icon: Cpu },
              { id: "bookmarks", label: "Bookmarks", icon: Bookmark },
              { id: "quiz", label: "Topic Quiz", icon: HelpCircle },
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    if (tab.id === "adaptive-ai" && !adaptivePackage) {
                      handleRequestAdaptiveHelp();
                    } else {
                      setActiveTab(tab.id as any);
                    }
                  }}
                  className={`pb-3 text-xs font-semibold flex items-center gap-1.5 border-b-2 transition-all whitespace-nowrap ${
                    activeTab === tab.id
                      ? "border-brand-royal text-brand-royal dark:text-white font-bold"
                      : "border-transparent text-slate-550 hover:text-slate-900 dark:hover:text-slate-300"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          <div className="p-1">
            {/* Tab: PDF notes */}
            {activeTab === "pdf" && (
              <div className="space-y-4 font-sans text-left">
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Attached reference guide, printable hand-outs, and sample
                  numericals.
                </p>

                {/* Clean notes webpage view redirect card */}
                <div className="flex flex-col items-center justify-center p-12 border border-dashed border-slate-300 dark:border-white/10 rounded-2xl bg-slate-50 dark:bg-slate-900/10 space-y-4 my-4">
                  <div className="w-16 h-16 rounded-xl bg-brand-royal/10 dark:bg-brand-royal/20 flex items-center justify-center text-brand-royal dark:text-blue-400 border border-brand-royal/15 shadow-sm">
                    <FileText className="w-8 h-8" />
                  </div>
                  <div className="text-center space-y-1">
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                      {getTopicPdfInfo(activeChapter?.title || "", activeTopic?.pdfUrl).name}
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Standard syllabus study note handbook (PDF format, ~1.2 MB)
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      const pdfInfo = getTopicPdfInfo(activeChapter?.title || "", activeTopic?.pdfUrl);
                      window.open(pdfInfo.url, "_blank");
                    }}
                    className="premium-btn-primary px-6 py-2.5 text-xs font-bold flex items-center gap-2 rounded-xl shadow-md transition-all active:scale-95"
                  >
                    <ExternalLink className="w-4 h-4" />
                    <span>View Notes in Full Webpage</span>
                  </button>
                </div>
              </div>
            )}

            {/* Tab: Edge AI Scaffolding & Adaptive Support */}
            {activeTab === "adaptive-ai" && (
              <div className="space-y-6 font-sans text-left animate-in fade-in">
                {/* Header Card */}
                <div className="p-5 rounded-2xl bg-gradient-to-r from-brand-royal/10 via-brand-violet/10 to-transparent border border-brand-royal/20 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-brand-royal text-white shadow-md shadow-brand-royal/20">
                      <Cpu className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-extrabold text-slate-900 dark:text-white">
                        Edge AI Adaptive Learning Assistant
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Ultra-low latency (<span className="font-mono text-emerald-500 font-bold">{edgeTelemetry.avgLatencyMs}ms</span>) local on-device scaffolding
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold px-3 py-1 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-brand-royal">
                      State: {edgeTelemetry.activeLearnerState}
                    </span>
                  </div>
                </div>

                {/* Multi-Level Support Selector Bar */}
                <div className="space-y-2">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                    Choose Scaffolding Depth (Escalation Ladder)
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 text-xs">
                    {[
                      { level: 1, id: "btn-hint", label: "1. Hint", desc: "Cognitive Nudge", icon: "💡" },
                      { level: 2, id: "btn-breakdown", label: "2. Breakdown", desc: "Step-by-Step", icon: "📝" },
                      { level: 3, id: "btn-example", label: "3. Example", desc: "Worked Problem", icon: "🔍" },
                      { level: 4, id: "btn-practice", label: "4. Practice", desc: "Guided Check", icon: "🎯" },
                      { level: 5, id: "btn-revision", label: "5. Revision", desc: "Prerequisite Bridge", icon: "🔄" },
                    ].map((lvl) => (
                      <button
                        key={lvl.level}
                        id={lvl.id}
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleRequestAdaptiveHelp(lvl.level);
                        }}
                        className={`p-3 rounded-xl border text-left transition-all cursor-pointer select-none active:scale-95 ${
                          adaptivePackage?.level === lvl.level
                            ? "bg-brand-royal text-white border-brand-royal shadow-lg ring-2 ring-brand-royal/30 font-bold"
                            : "bg-slate-50 dark:bg-slate-900/70 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-brand-royal/50 hover:bg-slate-100 dark:hover:bg-slate-800"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm">{lvl.icon}</span>
                          <span className="text-[9px] uppercase font-bold opacity-75">Lvl {lvl.level}</span>
                        </div>
                        <span className="font-extrabold block text-xs">{lvl.label}</span>
                        <span className="text-[10px] opacity-80 block leading-tight mt-0.5">{lvl.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Active Scaffolded Card Content */}
                {adaptivePackage ? (
                  <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4 shadow-sm">
                    <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-amber-500" />
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                          {adaptivePackage.title}
                        </h4>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-brand-royal/10 text-brand-royal dark:text-brand-royal-light border border-brand-royal/20">
                        Level {adaptivePackage.level} ({adaptivePackage.type})
                      </span>
                    </div>

                    <div className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line bg-slate-50 dark:bg-slate-950/60 p-4 rounded-xl border border-slate-100 dark:border-slate-800/80 font-sans">
                      {adaptivePackage.content}
                    </div>

                    {/* Interactive Guided Practice Item if Level 4 */}
                    {adaptivePackage.interactiveItem && (
                      <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/20 space-y-3">
                        <span className="text-xs font-bold text-slate-900 dark:text-white block">
                          Micro-Question: {adaptivePackage.interactiveItem.question}
                        </span>
                        <div className="space-y-2">
                          {adaptivePackage.interactiveItem.options.map((opt: string, idx: number) => (
                            <button
                              key={idx}
                              onClick={() => {
                                setGuidedAnswer(idx);
                                const isCorrect = idx === adaptivePackage.interactiveItem.correctIndex;
                                setGuidedFeedback(
                                  isCorrect
                                    ? `Correct! ${adaptivePackage.interactiveItem.explanation}`
                                    : "Incorrect. Try re-reading the hint above."
                                );
                              }}
                              className={`w-full p-2.5 rounded-xl border text-xs text-left transition-all ${
                                guidedAnswer === idx
                                  ? idx === adaptivePackage.interactiveItem.correctIndex
                                    ? "bg-emerald-500/10 border-emerald-500 text-emerald-700 dark:text-emerald-300 font-bold"
                                    : "bg-rose-500/10 border-rose-500 text-rose-700 dark:text-rose-300"
                                  : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300"
                              }`}
                            >
                              {String.fromCharCode(65 + idx)}. {opt}
                            </button>
                          ))}
                        </div>
                        {guidedFeedback && (
                          <div className="p-3 rounded-lg bg-white dark:bg-slate-900 text-xs font-medium border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200">
                            {guidedFeedback}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Feedback loop closure buttons */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                      <p className="text-[11px] text-slate-400">
                        Your interaction updates your on-device cognitive state in real-time.
                      </p>
                      <button
                        onClick={() => {
                          edgeAI.recordInterventionFeedback(
                            adaptivePackage.decisionId,
                            "COMPLETED",
                            0.9,
                            adaptivePackage.conceptId
                          );
                          useLmsStore.getState().addNotification(
                            "Concept Mastered",
                            `Feedback recorded! Edge AI updated your knowledge state.`,
                            "success"
                          );
                          setActiveTab("pdf");
                        }}
                        className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1.5"
                      >
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span>I Understand This Concept</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="p-12 text-center border border-dashed border-slate-300 dark:border-slate-800 rounded-2xl space-y-3">
                    <Cpu className="w-10 h-10 text-brand-royal mx-auto opacity-70" />
                    <h5 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                      Edge AI Adaptive Model Ready
                    </h5>
                    <p className="text-xs text-slate-500 max-w-md mx-auto">
                      Click any scaffolding level above or "Ask Edge AI Help" to generate instant personalized guidance.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Tab: Quiz Center */}
            {activeTab === "quiz" && (
              <div className="space-y-4">
                <div className="flex flex-col items-center text-center space-y-6 py-8 px-4">
                  <div className="w-20 h-20 rounded-full bg-brand-royal flex items-center justify-center shadow-2xl relative overflow-hidden group">
                    <div className="absolute inset-0 bg-gradient-to-tr from-brand-royal to-brand-violet opacity-80 group-hover:scale-110 transition-transform duration-300" />
                    <HelpCircle className="w-10 h-10 text-white relative z-10" />
                  </div>
                  <div>
                    <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">
                      Topic Assessment
                    </h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                      {activeTopic?.title || "Current Topic"}
                    </p>
                  </div>
                  <div className="grid grid-cols-3 gap-4 w-full max-w-sm">
                    {[
                      [
                        "10",
                        "Questions",
                        "text-brand-royal dark:text-blue-300",
                      ],
                      [
                        "10",
                        "Minutes",
                        "text-emerald-600 dark:text-emerald-300",
                      ],
                      ["MCQ", "Format", "text-amber-600 dark:text-amber-300"],
                    ].map(([val, lbl, cls], i) => (
                      <div
                        key={i}
                        className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-3 border border-slate-200 dark:border-white/5 text-center"
                      >
                        <p className={"text-xl font-black " + cls}>{val}</p>
                        <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider mt-0.5">
                          {lbl}
                        </p>
                      </div>
                    ))}
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-900/40 rounded-xl p-4 border border-slate-200 dark:border-white/5 text-left w-full max-w-sm space-y-2">
                    <p className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                      Instructions
                    </p>
                    <ul className="text-xs text-slate-600 dark:text-slate-400 space-y-1.5">
                      <li>• 10 questions (4 Easy, 4 Medium, 2 Hard)</li>
                      <li>• Timer: 10 minutes — auto-submits on timeout</li>
                      <li>• Select one option per question</li>
                      <li>• Results with explanations shown after</li>
                    </ul>
                  </div>
                  <button
                    onClick={handleStartQuiz}
                    disabled={isLoadingQuiz}
                    className="premium-btn-primary px-8 py-3 text-sm font-bold flex items-center gap-2 rounded-xl shadow-lg hover:shadow-brand-royal/20 transition-all active:scale-95 disabled:opacity-50"
                  >
                    {isLoadingQuiz ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        <span>Loading Quiz...</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4 fill-current" /> Start Quiz
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Tab: Bookmarks */}
            {activeTab === "bookmarks" && (
              <div className="space-y-4">
                <form onSubmit={handleAddBookmarkSubmit} className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Enter short bookmark note..."
                    value={bookmarkText}
                    onChange={(e) => setBookmarkText(e.target.value)}
                    className="premium-input text-xs"
                    required
                  />
                  <button
                    type="submit"
                    className="premium-btn-primary px-4 py-2 text-xs flex items-center gap-1 flex-shrink-0"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Save Note</span>
                  </button>
                </form>

                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {bookmarks.filter((b) => b.topicId === activeTopic?.id)
                    .length === 0 ? (
                    <div className="py-8 text-center text-xs text-slate-500">
                      No bookmarks saved in this lecture.
                    </div>
                  ) : (
                    bookmarks
                      .filter((b) => b.topicId === activeTopic?.id)
                      .map((bm) => (
                        <div
                          key={bm.id}
                          className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-white/5 flex items-center justify-between hover:border-slate-300 dark:hover:border-white/10 transition-colors"
                        >
                          <div className="text-left">
                            <p className="text-xs font-medium text-slate-700 dark:text-slate-300 mt-1">
                              {bm.note}
                            </p>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => jumpToBookmarkTime(bm.timestamp)}
                              className="px-2.5 py-1 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/5 hover:border-brand-royal/30 text-[10px] font-semibold text-slate-700 dark:text-slate-300"
                            >
                              Jump
                            </button>
                            <button
                              onClick={() => deleteBookmark(bm.id)}
                              className="p-1 text-slate-500 hover:text-red-400"
                              title="Delete bookmark"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Right Column: Dynamic Course Navigation Sidebar */}
      <div className="space-y-6">
        {/* Subject Selection Tabs */}
        <div className="glass-card p-5 border-slate-200 dark:border-white/5 space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-150 dark:border-white/5 pb-3">
            <BookOpen className="w-4 h-4 text-brand-violet dark:text-brand-violet-light" />
            <h3 className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-widest">
              Select Subject
            </h3>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {(activeClass?.subjects || []).map((sub) => {
              const isActive = activeSubject?.id === sub.id;
              return (
                <button
                  key={sub.id}
                  onClick={() => {
                    const firstChapter = sub.chapters[0];
                    const firstTopic = firstChapter?.topics[0];
                    setActiveCourseContext(
                      sub.id,
                      firstChapter?.id || null,
                      firstTopic?.id || null,
                    );
                  }}
                  className={`py-2 px-3 rounded-none border text-center transition-all duration-300 font-bold text-xs flex items-center justify-center gap-2 ${
                    isActive
                      ? "border-brand-royal bg-brand-royal/10 text-brand-royal dark:text-blue-300 shadow-md"
                      : "border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-slate-900/40 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-900"
                  }`}
                >
                  <div
                    className={`w-2 h-2 rounded-full ${getSubjectColor(sub.title)}`}
                  />
                  <span>{sub.title}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Curriculums Navigation Card */}
        <div className="glass-card p-5 border-slate-200 dark:border-white/5 space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-150 dark:border-white/5 pb-3">
            <BookOpen className="w-4 h-4 text-brand-royal" />
            <h3 className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-widest">
              Course Curriculum
            </h3>
          </div>

          <div className="space-y-4 overflow-y-auto max-h-[500px] pr-1">
            {activeSubject.chapters.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-4">
                No content exists. Create chapters inside teacher dashboard.
              </p>
            ) : (
              activeSubject.chapters.map((chapter) => {
                const isChapterActive = activeChapterId === chapter.id;
                const isExpanded = expandedChapterId === chapter.id;
                const firstTopic = chapter.topics[0];
                return (
                  <div key={chapter.id} className="space-y-1">
                    {/* Clickable Chapter Header Row */}
                    <button
                      onClick={() => {
                        if (isExpanded) {
                          setExpandedChapterId(null);
                        } else {
                          setExpandedChapterId(chapter.id);
                        }
                      }}
                      className={`w-full py-2.5 px-3 rounded-none text-left text-xs transition-all border flex items-center justify-between gap-2 font-bold ${
                        isChapterActive
                          ? "border-brand-royal bg-brand-royal/10 text-brand-royal dark:text-blue-300"
                          : "border-transparent text-slate-700 dark:text-slate-300 hover:text-brand-royal hover:bg-brand-royal/5 dark:hover:bg-brand-royal/10"
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <BookOpen className="w-3.5 h-3.5 flex-shrink-0 opacity-70" />
                        <span className="truncate">{chapter.title}</span>
                      </div>
                      <ChevronRight className={`w-3.5 h-3.5 flex-shrink-0 transition-transform ${isExpanded ? "rotate-90 text-brand-royal" : "text-slate-400"}`} />
                    </button>

                    {/* Topics list - only shown when chapter is active */}
                    {isExpanded && (
                      <div className="space-y-0.5 ml-3 border-l border-brand-royal/20 pl-2">
                        {chapter.topics.map((topic) => {
                          const isTopicActive = activeTopic?.id === topic.id;
                          return (
                            <button
                              key={topic.id}
                              onClick={() =>
                                setActiveCourseContext(
                                  activeSubject.id,
                                  chapter.id,
                                  topic.id,
                                )
                              }
                              className={`w-full py-2 px-2.5 rounded-none text-left text-xs transition-all border flex items-center justify-between gap-2 ${
                                isTopicActive
                                  ? "border-brand-royal bg-brand-royal/10 text-brand-royal dark:text-blue-300 font-semibold"
                                  : "border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5"
                              }`}
                            >
                              <div className="flex items-center gap-2 truncate">
                                {topic.isCompleted ? (
                                  <CheckCircle className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                                ) : (
                                  <div className="w-3.5 h-3.5 rounded-full border border-slate-400 dark:border-slate-600 flex-shrink-0" />
                                )}
                                <span className="truncate">{topic.title}</span>
                              </div>
                              <span className="text-[10px] text-slate-500 dark:text-slate-500 font-mono font-medium flex-shrink-0">
                                {topic.duration}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
