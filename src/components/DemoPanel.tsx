import React, { useState, useEffect, useRef } from "react";
import { useLmsStore } from "../store/index";
import { authAPI, academicAPI } from "../services/api";
import type { Profile } from "../store/types";
import {
  Zap,
  ChevronDown,
  ChevronUp,
  User,
  GraduationCap,
  Shield,
  Video,
  Award,
  Flame,
  Sun,
  Moon,
  ExternalLink,
  Brain,
  BookOpen,
  X,
} from "lucide-react";

export const DemoPanel: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const {
    setView,
    addNotification,
    isDarkMode,
    toggleDarkMode,
    boards,
    profile,
    setActiveCourseContext,
  } = useLmsStore();
  const [loadingRole, setLoadingRole] = useState<string | null>(null);

  // Dragging states for panel header
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const dragOffset = useRef({ x: 0, y: 0 });

  const handleHeaderMouseDown = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest("button") || target.closest("select") || target.closest("input")) {
      return;
    }
    isDragging.current = true;
    dragStart.current = { x: e.clientX, y: e.clientY };
    dragOffset.current = { x: position.x, y: position.y };
    e.preventDefault();
  };

  const handleHeaderTouchStart = (e: React.TouchEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest("button") || target.closest("select") || target.closest("input")) {
      return;
    }
    const touch = e.touches[0];
    isDragging.current = true;
    dragStart.current = { x: touch.clientX, y: touch.clientY };
    dragOffset.current = { x: position.x, y: position.y };
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging.current) return;
      const dx = e.clientX - dragStart.current.x;
      const dy = e.clientY - dragStart.current.y;
      setPosition({
        x: dragOffset.current.x + dx,
        y: dragOffset.current.y + dy,
      });
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isDragging.current) return;
      const touch = e.touches[0];
      const dx = touch.clientX - dragStart.current.x;
      const dy = touch.clientY - dragStart.current.y;
      setPosition({
        x: dragOffset.current.x + dx,
        y: dragOffset.current.y + dy,
      });
    };

    const handleMouseUp = () => {
      isDragging.current = false;
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    window.addEventListener("touchmove", handleTouchMove, { passive: false });
    window.addEventListener("touchend", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleMouseUp);
    };
  }, []);

  // Ensure course context is primed
  const ensureCourseContext = (targetBoards = boards) => {
    const activeBoard = targetBoards[0];
    const activeClass = activeBoard?.classes[0];
    const activeSubject = activeClass?.subjects[0];
    const activeChapter = activeSubject?.chapters[0];
    const activeTopic = activeChapter?.topics[0];

    if (activeSubject && activeChapter && activeTopic) {
      setActiveCourseContext(activeSubject.id, activeChapter.id, activeTopic.id);
    }
  };

  const handleSimulateRole = async (role: "student" | "teacher" | "admin") => {
    setLoadingRole(role);
    try {
      let email = "";
      let password = "password123";

      if (role === "student") {
        email = "student@nexoralearning.com";
      } else if (role === "teacher") {
        email = "teacher@nexoralearning.com";
      } else {
        email = "admin@nexoralearning.com";
      }

      let activeBoards = boards;
      try {
        activeBoards = await academicAPI.getFullStructure();
      } catch {
        // Keep existing boards
      }

      const activeBoard = activeBoards[0];
      const activeClass = activeBoard?.classes[0];
      const activeSubject = activeClass?.subjects[0];

      let loggedInUser: any = null;
      let token = "demo-simulated-token";

      // Attempt live API login
      try {
        const result = await authAPI.login(email, password);
        loggedInUser = result.user;
        token = result.token;
      } catch (apiErr) {
        console.warn(
          `[DemoPanel] API login unreachable or failed for ${role}, using resilient client simulation:`,
          apiErr
        );
      }

      // Build simulated profile if API didn't return one
      const simProfile: Profile = loggedInUser
        ? {
            ...loggedInUser,
            role,
            selectedBoardId: loggedInUser.selectedBoardId || activeBoard?.id || "tnsb",
            selectedClassId: loggedInUser.selectedClassId || activeClass?.id || "class-12",
            optedSubjectId: loggedInUser.optedSubjectId || activeSubject?.id || "maths-12-v1",
            subjectArea: role === "teacher" ? "Mathematics" : undefined,
          }
        : {
            id: `demo-${role}-${Date.now()}`,
            name:
              role === "student"
                ? "Aarav Patel (Demo Scholar)"
                : role === "teacher"
                ? "Dr. Rajesh Kumar (Demo Faculty)"
                : "Administrator (Demo Admin)",
            username: `demo.${role}`,
            password: "",
            email,
            role,
            selectedBoardId: activeBoard?.id || "tnsb",
            selectedClassId: activeClass?.id || "class-12",
            optedSubjectId: activeSubject?.id || "maths-12-v1",
            age: role === "student" ? "17" : "36",
            location: "Chennai, TN",
            xp: role === "student" ? 1850 : 4500,
            level: role === "student" ? 6 : 15,
            coins: role === "student" ? 420 : 980,
            streak: role === "student" ? 14 : 30,
            achievements: [
              {
                id: "ach-1",
                title: "Cognitive Mastery",
                description: "Completed Edge AI adaptive calibration",
                icon: "Award",
                unlockedAt: new Date().toISOString(),
              },
            ],
            certificates: [
              {
                id: "cert-1",
                title: "Class 12 Higher Secondary Foundation",
                grade: "A+",
                issuer: "Nexora Learning",
                date: "2026-03-01",
              },
            ],
            subjectArea: role === "teacher" ? "Mathematics" : undefined,
          };

      localStorage.setItem("auth_token", token);
      localStorage.setItem("lms_user_profile", JSON.stringify(simProfile));

      useLmsStore.setState({
        boards: activeBoards,
        profile: simProfile,
        auth: {
          isAuthenticated: true,
          user: simProfile,
          token,
          loading: false,
          error: null,
        },
      });

      ensureCourseContext(activeBoards);

      addNotification(
        "Simulation Active",
        `Switched session to simulated ${role.toUpperCase()} role successfully.`,
        "success"
      );

      // Navigate to corresponding home view
      if (role === "student") {
        setView("student-dash");
        window.location.hash = "#/student-dash";
      } else if (role === "teacher") {
        setView("teacher-dash");
        window.location.hash = "#/teacher-dash";
      } else {
        setView("admin-analytics");
        window.location.hash = "#/admin-analytics";
      }
    } catch (err: any) {
      console.error("[DemoPanel] Simulation error:", err);
      addNotification("Simulation Alert", `Failed to switch role: ${err.message}`, "alert");
    } finally {
      setLoadingRole(null);
    }
  };

  const simulateEvent = (event: "live" | "quiz" | "streak" | "scaffold") => {
    if (event === "live") {
      addNotification(
        "📺 Live Class Alert",
        "Dr. Ramesh Prasad has started a live session on Physics: Coulomb's Law. Room Code: physics-101.",
        "info"
      );
    } else if (event === "quiz") {
      addNotification(
        "💯 Quiz Graded",
        "Your recent attempt on 'Matrices Basics Assessment' was graded: 92% (Passed). XP +120 earned!",
        "success"
      );
    } else if (event === "streak") {
      addNotification(
        "🔥 Streak Warning",
        "Your 14-day study streak will expire in 2 hours. Complete a topic now to keep it active!",
        "alert"
      );
    } else if (event === "scaffold") {
      addNotification(
        "🧠 Edge AI Scaffold Deployed",
        "Level 2 Conceptual Breakdown auto-triggered: high hesitation detected on Quadratic Discriminants.",
        "info"
      );
    }
  };

  const jumpToScreen = (targetView: string) => {
    // If user is jumping to an authenticated page and is not yet authenticated, simulate student
    const isAuthPage = ![
      "landing",
      "login",
      "login-student",
      "login-educator",
      "signup",
      "get-credentials",
      "forgot-password",
      "reset-password",
    ].includes(targetView);

    if (isAuthPage && !useLmsStore.getState().auth.isAuthenticated) {
      handleSimulateRole("student");
    }

    ensureCourseContext();
    setView(targetView);
    window.location.hash = "#/" + targetView;
    setIsOpen(false);
  };

  return (
    <div
      style={{ transform: `translate(${position.x}px, ${position.y}px)` }}
      className="fixed bottom-6 right-6 z-[99999] font-sans text-left"
    >
      {/* Overlay Panel */}
      {isOpen && (
        <div className="bg-[#0b0f19]/95 border border-slate-700/80 shadow-2xl p-4 sm:p-5 w-80 max-h-[85vh] overflow-y-auto mb-3 rounded-2xl animate-fade-in-up backdrop-blur-xl text-slate-200">
          {/* Header with Drag Handle & Close */}
          <div
            onMouseDown={handleHeaderMouseDown}
            onTouchStart={handleHeaderTouchStart}
            className="flex items-center justify-between pb-3 border-b border-slate-800/80 mb-3 cursor-move select-none"
          >
            <div className="flex items-center gap-2">
              <div className="p-1 rounded-lg bg-indigo-500/20 text-indigo-400">
                <Zap className="w-4 h-4 fill-indigo-400" />
              </div>
              <div>
                <h3 className="text-xs font-black text-white uppercase tracking-wider font-mono flex items-center gap-1.5">
                  <span>Nexora Demo Controls</span>
                </h3>
                <span className="text-[10px] text-slate-400">Drag to move • Instant Simulation</span>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={toggleDarkMode}
                className="p-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded-lg text-slate-400 hover:text-white transition-colors"
                title="Toggle Dark Mode"
              >
                {isDarkMode ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded-lg text-slate-400 hover:text-white transition-colors"
                title="Close Demo Panel"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* 1. Simulate User Role */}
          <div className="space-y-2 mb-4">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
              1. Simulate User Role (1-Click Login)
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                disabled={loadingRole !== null}
                onClick={() => handleSimulateRole("student")}
                className="flex flex-col items-center justify-center p-2.5 bg-slate-900/80 hover:bg-slate-800 border border-slate-800 hover:border-blue-500/60 rounded-xl transition-all text-xs font-bold text-slate-200 hover:text-white shadow-sm active:scale-95 disabled:opacity-50"
              >
                <User className="w-4 h-4 mb-1 text-blue-400" />
                <span>Student</span>
              </button>
              <button
                disabled={loadingRole !== null}
                onClick={() => handleSimulateRole("teacher")}
                className="flex flex-col items-center justify-center p-2.5 bg-slate-900/80 hover:bg-slate-800 border border-slate-800 hover:border-emerald-500/60 rounded-xl transition-all text-xs font-bold text-slate-200 hover:text-white shadow-sm active:scale-95 disabled:opacity-50"
              >
                <GraduationCap className="w-4 h-4 mb-1 text-emerald-400" />
                <span>Teacher</span>
              </button>
              <button
                disabled={loadingRole !== null}
                onClick={() => handleSimulateRole("admin")}
                className="flex flex-col items-center justify-center p-2.5 bg-slate-900/80 hover:bg-slate-800 border border-slate-800 hover:border-rose-500/60 rounded-xl transition-all text-xs font-bold text-slate-200 hover:text-white shadow-sm active:scale-95 disabled:opacity-50"
              >
                <Shield className="w-4 h-4 mb-1 text-rose-400" />
                <span>Admin</span>
              </button>
            </div>
          </div>

          {/* 2. Jump Directly to Screen */}
          <div className="space-y-2 mb-4 border-t border-slate-800/80 pt-3">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
              2. Jump Directly To Feature Screen
            </label>

            {/* Flagship AI Features */}
            <div className="space-y-1">
              <span className="text-[9px] font-extrabold text-indigo-400 uppercase tracking-wider block mb-1">
                ⭐ Flagship AI & Video Tools
              </span>
              <button
                onClick={() => jumpToScreen("edge-ai-lab")}
                className="w-full flex items-center justify-between px-3 py-2 bg-indigo-950/40 hover:bg-indigo-900/60 border border-indigo-500/30 rounded-xl text-indigo-200 hover:text-white text-xs font-bold transition-all text-left shadow-sm"
              >
                <span className="flex items-center gap-1.5">
                  <Brain className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Cognitive Edge AI Framework</span>
                </span>
                <ExternalLink className="w-3 h-3 text-indigo-400" />
              </button>

              <button
                onClick={() => jumpToScreen("course-view")}
                className="w-full flex items-center justify-between px-3 py-2 bg-slate-900/80 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 rounded-xl text-slate-300 hover:text-white text-xs font-semibold transition-all text-left"
              >
                <span className="flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-sky-400" />
                  <span>Deep Learning Space (Anti-Skip Video)</span>
                </span>
                <ExternalLink className="w-3 h-3 text-slate-500" />
              </button>

              <button
                onClick={() => jumpToScreen("ai-tutor")}
                className="w-full flex items-center justify-between px-3 py-2 bg-slate-900/80 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 rounded-xl text-slate-300 hover:text-white text-xs font-semibold transition-all text-left"
              >
                <span className="flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                  <span>Interactive AI Tutor Chat</span>
                </span>
                <ExternalLink className="w-3 h-3 text-slate-500" />
              </button>
            </div>

            {/* Core Portals */}
            <div className="space-y-1 pt-2">
              <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">
                🏛️ Portals & Dashboards
              </span>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  onClick={() => jumpToScreen("student-dash")}
                  className="px-2.5 py-1.5 bg-slate-900/80 hover:bg-slate-800 border border-slate-800 rounded-lg text-slate-300 hover:text-white text-[11px] font-medium text-left truncate"
                >
                  Student Dashboard
                </button>
                <button
                  onClick={() => jumpToScreen("teacher-dash")}
                  className="px-2.5 py-1.5 bg-slate-900/80 hover:bg-slate-800 border border-slate-800 rounded-lg text-slate-300 hover:text-white text-[11px] font-medium text-left truncate"
                >
                  Teacher Dashboard
                </button>
                <button
                  onClick={() => jumpToScreen("admin-approvals")}
                  className="px-2.5 py-1.5 bg-slate-900/80 hover:bg-slate-800 border border-slate-800 rounded-lg text-slate-300 hover:text-white text-[11px] font-medium text-left truncate"
                >
                  Admin Approvals
                </button>
                <button
                  onClick={() => jumpToScreen("admin-analytics")}
                  className="px-2.5 py-1.5 bg-slate-900/80 hover:bg-slate-800 border border-slate-800 rounded-lg text-slate-300 hover:text-white text-[11px] font-medium text-left truncate"
                >
                  Admin Analytics
                </button>
              </div>
            </div>

            {/* Academic Activities */}
            <div className="space-y-1 pt-2">
              <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">
                📚 Academics & Quizzes
              </span>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  onClick={() => jumpToScreen("quiz-view")}
                  className="px-2.5 py-1.5 bg-slate-900/80 hover:bg-slate-800 border border-slate-800 rounded-lg text-slate-300 hover:text-white text-[11px] font-medium text-left truncate"
                >
                  Take Quiz
                </button>
                <button
                  onClick={() => jumpToScreen("notes-resources")}
                  className="px-2.5 py-1.5 bg-slate-900/80 hover:bg-slate-800 border border-slate-800 rounded-lg text-slate-300 hover:text-white text-[11px] font-medium text-left truncate"
                >
                  Notes & PDFs
                </button>
                <button
                  onClick={() => jumpToScreen("webrtc-live")}
                  className="px-2.5 py-1.5 bg-slate-900/80 hover:bg-slate-800 border border-slate-800 rounded-lg text-slate-300 hover:text-white text-[11px] font-medium text-left truncate"
                >
                  Live Classroom
                </button>
                <button
                  onClick={() => jumpToScreen("assignment-view")}
                  className="px-2.5 py-1.5 bg-slate-900/80 hover:bg-slate-800 border border-slate-800 rounded-lg text-slate-300 hover:text-white text-[11px] font-medium text-left truncate"
                >
                  Assignments
                </button>
              </div>
            </div>

            {/* Public & Auth Pages */}
            <div className="space-y-1 pt-2">
              <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">
                🚪 Public & Authentication
              </span>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  onClick={() => jumpToScreen("landing")}
                  className="px-2.5 py-1.5 bg-slate-900/60 hover:bg-slate-800 border border-slate-800/80 rounded-lg text-slate-400 hover:text-white text-[11px] font-medium text-left truncate"
                >
                  Landing Page
                </button>
                <button
                  onClick={() => jumpToScreen("login-student")}
                  className="px-2.5 py-1.5 bg-slate-900/60 hover:bg-slate-800 border border-slate-800/80 rounded-lg text-slate-400 hover:text-white text-[11px] font-medium text-left truncate"
                >
                  Student Login
                </button>
                <button
                  onClick={() => jumpToScreen("login-educator")}
                  className="px-2.5 py-1.5 bg-slate-900/60 hover:bg-slate-800 border border-slate-800/80 rounded-lg text-slate-400 hover:text-white text-[11px] font-medium text-left truncate"
                >
                  Educator Login
                </button>
                <button
                  onClick={() => jumpToScreen("get-credentials")}
                  className="px-2.5 py-1.5 bg-slate-900/60 hover:bg-slate-800 border border-slate-800/80 rounded-lg text-slate-400 hover:text-white text-[11px] font-medium text-left truncate"
                >
                  Register Student
                </button>
              </div>
            </div>
          </div>

          {/* 3. Simulate Academic Class */}
          <div className="space-y-2 mb-4 border-t border-slate-800/80 pt-3">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
              3. Simulate Academic Class
            </label>
            <select
              value={profile?.selectedClassId || ""}
              onChange={(e) => {
                const classId = e.target.value;
                if (!classId) return;

                const currentBoards = useLmsStore.getState().boards;
                const activeBoard =
                  currentBoards.find((b) => b.id === profile?.selectedBoardId) || currentBoards[0];
                const activeClass = activeBoard?.classes.find((c) => c.id === classId);
                const defaultSubjectId = activeClass?.subjects[0]?.id || "";

                const updatedProfile: Profile = profile
                  ? {
                      ...profile,
                      selectedClassId: classId,
                      optedSubjectId: defaultSubjectId,
                    }
                  : {
                      id: "demo-student-class",
                      name: "Aarav Patel (Demo Scholar)",
                      username: "aarav.patel",
                      password: "",
                      email: "student@nexoralearning.com",
                      role: "student",
                      selectedBoardId: activeBoard?.id || "tnsb",
                      selectedClassId: classId,
                      optedSubjectId: defaultSubjectId,
                      xp: 1850,
                      level: 6,
                      coins: 420,
                      streak: 14,
                      achievements: [],
                      certificates: [],
                    };

                useLmsStore.setState({
                  profile: updatedProfile,
                  activeSubjectId: defaultSubjectId,
                });

                ensureCourseContext(currentBoards);

                addNotification(
                  "Class Context Updated",
                  `Switched workspace view to ${activeClass?.title || "selected class"}.`,
                  "success"
                );
              }}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 transition-colors"
            >
              <option value="" disabled>
                Select Class Level
              </option>
              {boards
                .flatMap((b) => b.classes)
                .map((cls) => (
                  <option key={cls.id} value={cls.id}>
                    {cls.title}
                  </option>
                ))}
            </select>
          </div>

          {/* 4. Trigger Live Simulation Alerts */}
          <div className="space-y-2 border-t border-slate-800/80 pt-3">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
              4. Trigger Live Simulation Alerts
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                onClick={() => simulateEvent("scaffold")}
                className="flex items-center gap-1.5 p-2 bg-slate-900/80 hover:bg-slate-800 border border-slate-800 rounded-xl transition-all text-xs font-bold text-indigo-300 hover:text-white"
              >
                <Brain className="w-3.5 h-3.5 text-indigo-400" />
                <span>AI Scaffold</span>
              </button>
              <button
                onClick={() => simulateEvent("live")}
                className="flex items-center gap-1.5 p-2 bg-slate-900/80 hover:bg-slate-800 border border-slate-800 rounded-xl transition-all text-xs font-bold text-sky-300 hover:text-white"
              >
                <Video className="w-3.5 h-3.5 text-sky-400" />
                <span>Live Class</span>
              </button>
              <button
                onClick={() => simulateEvent("quiz")}
                className="flex items-center gap-1.5 p-2 bg-slate-900/80 hover:bg-slate-800 border border-slate-800 rounded-xl transition-all text-xs font-bold text-emerald-300 hover:text-white"
              >
                <Award className="w-3.5 h-3.5 text-emerald-400" />
                <span>Quiz Graded</span>
              </button>
              <button
                onClick={() => simulateEvent("streak")}
                className="flex items-center gap-1.5 p-2 bg-slate-900/80 hover:bg-slate-800 border border-slate-800 rounded-xl transition-all text-xs font-bold text-amber-300 hover:text-white"
              >
                <Flame className="w-3.5 h-3.5 text-amber-400" />
                <span>Streak Alert</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Toggle Button (100% reliable click, no drag hijacking) */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-violet-600 via-indigo-600 to-indigo-700 hover:from-violet-500 hover:to-indigo-600 text-white rounded-full shadow-2xl hover:shadow-indigo-500/30 active:scale-95 transition-all text-xs font-black uppercase tracking-wider border border-white/20 select-none group cursor-pointer"
      >
        <Zap className="w-4 h-4 fill-white group-hover:rotate-12 transition-transform" />
        <span>Demo Controls</span>
        {isOpen ? (
          <ChevronDown className="w-4 h-4 text-white/80" />
        ) : (
          <ChevronUp className="w-4 h-4 text-white/80" />
        )}
      </button>
    </div>
  );
};
