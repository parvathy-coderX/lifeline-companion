/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import {
  Task,
  Goal,
  Habit,
  DailyPlan,
  CalendarEvent,
  WorkMood,
  ProductivityInsights
} from "./types";
import {
  fetchFirebaseConfig,
  getFirebaseAuth,
  googleSignIn,
  logoutGoogle,
  getCachedAccessToken
} from "./lib/firebase";
import {
  fetchGoogleCalendarEvents,
  createGoogleCalendarEvent,
  LOCAL_FALLBACK_EVENTS
} from "./lib/calendar";
import {
  aiPrioritizeTasks,
  aiPlanDay,
  aiSummarizeNotes
} from "./lib/gemini";
import EisenhowerMatrix from "./components/EisenhowerMatrix";
import PomodoroTimer from "./components/PomodoroTimer";
import ProcrastinationBox from "./components/ProcrastinationBox";
import DecisionMaker from "./components/DecisionMaker";
import VoiceCommandBtn from "./components/VoiceCommandBtn";
import ScheduleTimeline from "./components/ScheduleTimeline";
import MeetingPrep from "./components/MeetingPrep";
import Confetti from "./components/Confetti";
import StressMeter from "./components/StressMeter";
import MiniCalendar from "./components/MiniCalendar";
import BrainDump from "./components/BrainDump";
import WeeklyReview from "./components/WeeklyReview";

import {
  Sparkles,
  LayoutDashboard,
  CalendarDays,
  Grid3X3,
  AlertCircle,
  TrendingUp,
  Brain,
  Plus,
  Compass,
  User,
  LogOut,
  Zap,
  CheckCircle,
  CircleCheck,
  Check,
  Award,
  BookOpen,
  ArrowRight,
  ShieldCheck,
  History,
  Timer,
  X
} from "lucide-react";

import { motion, AnimatePresence } from "motion/react";

// Default seed data for immediate high-quality visualization
const INITIAL_TASKS: Task[] = [
  {
    id: "task-1",
    title: "⚡ Chemistry Project Slides",
    description: "Compile slide deck for biochemistry group assignment and outline the molecule pathways.",
    dueDate: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString(), // 6 hours left
    importance: "high",
    urgency: "high",
    completed: false,
    duration: 120,
    matrixQuadrant: "urgent-important",
    progress: 30,
    steps: [
      { title: "Review pathway diagrams", description: "Collect biochem blueprints", durationMinutes: 30, completed: true },
      { title: "Draft slide templates", description: "Design main slide structure", durationMinutes: 40, completed: false },
      { title: "Write executive summaries", description: "Summarize molecule data", durationMinutes: 50, completed: false }
    ],
    tags: ["academic", "chemistry", "urgent"],
    stressReduction: 45,
    predictionAlert: {
      isAtRisk: true,
      reason: "You have 2 heavy slides incomplete with only 6 hours remaining.",
      suggestion: "Use Pomodoro focus block to break the ice right now."
    }
  },
  {
    id: "task-2",
    title: "💡 Pay Electric Bill",
    description: "Submit online utility transfer to avoid late fines.",
    dueDate: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString(), // 3 hours left
    importance: "high",
    urgency: "high",
    completed: false,
    duration: 10,
    matrixQuadrant: "urgent-important",
    progress: 0,
    tags: ["personal", "finance"],
    stressReduction: 15
  },
  {
    id: "task-3",
    title: "🚀 Align Competitor Focus Deck",
    description: "Identify market positioning for the private beta release.",
    dueDate: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(), // 2 days left
    importance: "high",
    urgency: "low",
    completed: false,
    duration: 90,
    matrixQuadrant: "not-urgent-important",
    progress: 50,
    tags: ["professional", "marketing"],
    stressReduction: 25
  },
  {
    id: "task-4",
    title: "🧹 Tidy Up Desk",
    description: "Clear clutter to prepare space for study.",
    dueDate: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
    importance: "low",
    urgency: "high",
    completed: true,
    duration: 15,
    matrixQuadrant: "urgent-not-important",
    progress: 100,
    tags: ["routine"]
  }
];

const INITIAL_HABITS: Habit[] = [
  { id: "habit-1", title: "🌅 Morning Meditation", streak: 5, completedDates: [] },
  { id: "habit-2", title: "💧 Hydrate (3L Water)", streak: 12, completedDates: [] },
  { id: "habit-3", title: "📚 Read 10 Pages", streak: 3, completedDates: [] }
];

const INITIAL_GOALS: Goal[] = [
  { id: "goal-1", title: "Complete College Biochemistry", targetDate: "2026-07-15", progress: 85, completed: false, category: "academic" },
  { id: "goal-2", title: "Beta Launch Project Lifeline", targetDate: "2026-06-30", progress: 60, completed: false, category: "professional" }
];

export default function App() {
  const [activeTab, setActiveTab] = useState<"dashboard" | "planner" | "matrix" | "defeater" | "focus" | "tools">("dashboard");
  
  // App states
  const [tasks, setTasks] = useState<Task[]>(INITIAL_TASKS);
  const [habits, setHabits] = useState<Habit[]>(INITIAL_HABITS);
  const [goals, setGoals] = useState<Goal[]>(INITIAL_GOALS);
  const [events, setEvents] = useState<CalendarEvent[]>(LOCAL_FALLBACK_EVENTS);
  const [currentMood, setCurrentMood] = useState<WorkMood>("neutral");
  const [dailyPlan, setDailyPlan] = useState<DailyPlan | null>(null);

  // Form states
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskImportance, setNewTaskImportance] = useState<"high" | "low">("high");
  const [newTaskUrgency, setNewTaskUrgency] = useState<"high" | "low">("high");
  const [newTaskHoursLeft, setNewTaskHoursLeft] = useState("12");
  
  // Selected task detail view
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [editingNotes, setEditingNotes] = useState("");
  const [notesSummaryLoading, setNotesSummaryLoading] = useState(false);

  // Firebase auth & OAuth states
  const [firebaseConfig, setFirebaseConfig] = useState<any>(null);
  const [firebaseAuth, setFirebaseAuth] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  const [googleToken, setGoogleToken] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // AI loading states
  const [prioritizing, setPrioritizing] = useState(false);
  const [planningDay, setPlanningDay] = useState(false);
  const [nextTaskSuggestion, setNextTaskSuggestion] = useState<{ title: string; motivation: string } | null>(null);

  // Celebration Confetti trigger
  const [triggerConfetti, setTriggerConfetti] = useState(false);

  // New features states
  const [showWeeklyReviewModal, setShowWeeklyReviewModal] = useState(false);
  const [showMobileAddModal, setShowMobileAddModal] = useState(false);
  const [mobileTaskTitle, setMobileTaskTitle] = useState("");
  const [mobileTaskDescription, setMobileTaskDescription] = useState("");
  const [mobileTaskHoursLeft, setMobileTaskHoursLeft] = useState("12");
  const [mobileTaskImportance, setMobileTaskImportance] = useState<"high" | "low">("low");
  const [mobileTaskUrgency, setMobileTaskUrgency] = useState<"high" | "low">("low");
  const [currentWeather, setCurrentWeather] = useState<"rainy" | "sunny" | "overcast" | "snowy">("rainy");
  const [dashboardInputTab, setDashboardInputTab] = useState<"quick" | "braindump">("quick");

  // Load configuration and cached token upon mount
  useEffect(() => {
    async function loadConfig() {
      const config = await fetchFirebaseConfig();
      if (config) {
        setFirebaseConfig(config);
        const authInstance = getFirebaseAuth(config);
        if (authInstance) {
          setFirebaseAuth(authInstance);
          
          // Re-establish session token if available
          const cachedToken = await getCachedAccessToken();
          if (cachedToken) {
            setGoogleToken(cachedToken);
          }
          
          authInstance.onAuthStateChanged(async (u) => {
            if (u) {
              setUser(u);
              const tok = await getCachedAccessToken();
              if (tok) {
                setGoogleToken(tok);
                try {
                  const googleEvents = await fetchGoogleCalendarEvents(tok);
                  if (googleEvents.length > 0) setEvents(googleEvents);
                } catch (err) {
                  console.warn("Failed to retrieve Google Calendar events:", err);
                }
              }
            } else {
              setUser(null);
              setGoogleToken(null);
            }
            setAuthLoading(false);
          });
        } else {
          setAuthLoading(false);
        }
      } else {
        setAuthLoading(false);
      }
    }
    loadConfig();
  }, []);

  // Compute Eisenhower matrix quadrant for any task
  const computeQuadrant = (urgency: "high" | "low", importance: "high" | "low"): Task["matrixQuadrant"] => {
    if (urgency === "high" && importance === "high") return "urgent-important";
    if (urgency === "low" && importance === "high") return "not-urgent-important";
    if (urgency === "high" && importance === "low") return "urgent-not-important";
    return "not-urgent-not-important";
  };

  // Quick Task Add Handler
  const handleAddTask = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newTaskTitle.trim()) return;

    const hours = parseFloat(newTaskHoursLeft) || 12;
    const dueDate = new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
    const quadrant = computeQuadrant(newTaskUrgency, newTaskImportance);

    const task: Task = {
      id: "task-" + Math.random().toString(36).substring(5),
      title: newTaskTitle,
      dueDate,
      importance: newTaskImportance,
      urgency: newTaskUrgency,
      completed: false,
      duration: hours > 2 ? 60 : 15,
      matrixQuadrant: quadrant,
      progress: 0,
      tags: [newTaskImportance === "high" ? "priority" : "general"],
      stressReduction: newTaskImportance === "high" ? 30 : 10
    };

    setTasks(prev => [task, ...prev]);
    setNewTaskTitle("");
    
    // Auto trigger AI recommendation refresh
    triggerAiPrioritization([task, ...tasks]);
  };

  // Mobile FAB Task Add Handler
  const handleMobileAddTask = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!mobileTaskTitle.trim()) return;

    const hours = parseFloat(mobileTaskHoursLeft) || 12;
    const dueDate = new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
    const quadrant = computeQuadrant(mobileTaskUrgency, mobileTaskImportance);

    const task: Task = {
      id: "task-" + Math.random().toString(36).substring(5),
      title: mobileTaskTitle,
      description: mobileTaskDescription,
      dueDate,
      importance: mobileTaskImportance,
      urgency: mobileTaskUrgency,
      completed: false,
      duration: hours > 2 ? 60 : 15,
      matrixQuadrant: quadrant,
      progress: 0,
      tags: [mobileTaskImportance === "high" ? "priority" : "general"],
      stressReduction: mobileTaskImportance === "high" ? 30 : 10
    };

    setTasks(prev => [task, ...prev]);
    setMobileTaskTitle("");
    setMobileTaskDescription("");
    setMobileTaskHoursLeft("12");
    setMobileTaskImportance("low");
    setMobileTaskUrgency("low");
    setShowMobileAddModal(false);
    
    // Auto trigger AI recommendation refresh
    triggerAiPrioritization([task, ...tasks]);
  };

  // Brain Dump Import Handler
  const handleImportBrainDump = (newTasks: any[]) => {
    const formattedTasks: Task[] = newTasks.map((t, idx) => {
      const q = computeQuadrant(t.urgency, t.importance);
      return {
        id: "task-dump-" + Math.random().toString(36).substring(5) + "-" + idx,
        title: t.title,
        description: t.description,
        dueDate: t.dueDate || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        importance: t.importance,
        urgency: t.urgency,
        completed: false,
        duration: t.duration || 30,
        matrixQuadrant: q,
        progress: 0,
        steps: [],
        tags: ["brain-dump"],
        stressReduction: t.importance === "high" ? 30 : 10
      };
    });

    const updatedTasks = [...formattedTasks, ...tasks];
    setTasks(updatedTasks);
    setTriggerConfetti(true);
    triggerAiPrioritization(updatedTasks);
  };

  // Parser callback from voice/natural command
  const handleParsedVoiceTask = (parsedData: any) => {
    const quadrant = computeQuadrant(parsedData.urgency, parsedData.importance);
    const task: Task = {
      id: "task-" + Math.random().toString(36).substring(5),
      title: parsedData.title,
      description: parsedData.description,
      dueDate: parsedData.dueDate,
      importance: parsedData.importance,
      urgency: parsedData.urgency,
      completed: false,
      duration: parsedData.duration || 45,
      matrixQuadrant: quadrant,
      progress: 0,
      tags: ["voice-added"],
      stressReduction: parsedData.importance === "high" ? 40 : 15
    };

    setTasks(prev => [task, ...prev]);
    triggerAiPrioritization([task, ...tasks]);
    alert(`Voice Command parsed successfully! Added task: "${task.title}"`);
  };

  // Run AI Eisenhower Quadrant Auto-Sorting & Suggested Task Motivation
  const triggerAiPrioritization = async (currentTasks: Task[]) => {
    const activeTasks = currentTasks.filter(t => !t.completed);
    if (activeTasks.length === 0) {
      setNextTaskSuggestion(null);
      return;
    }
    
    setPrioritizing(true);
    try {
      const result = await aiPrioritizeTasks(activeTasks);
      
      // Update tasks state with recommended stress value and quadrants from Gemini
      setTasks(prev => {
        return prev.map(t => {
          const aiPrioritized = result.prioritizedTasks.find(pt => pt.taskId === t.id);
          if (aiPrioritized) {
            return {
              ...t,
              matrixQuadrant: aiPrioritized.matrixQuadrant,
              stressReduction: aiPrioritized.estimatedStressReduction
            };
          }
          return t;
        });
      });

      // Find the suggested task
      const suggestedId = result.nextTaskSuggestion.taskId;
      const suggestedTask = currentTasks.find(t => t.id === suggestedId);
      if (suggestedTask) {
        setNextTaskSuggestion({
          title: suggestedTask.title,
          motivation: result.nextTaskSuggestion.motivation
        });
      }
    } catch (err) {
      console.error("AI Prioritize error:", err);
    } finally {
      setPrioritizing(false);
    }
  };

  // Daily dynamic plan compiler
  const handleGeneratePlan = async () => {
    setPlanningDay(true);
    try {
      const plan = await aiPlanDay(tasks, events, habits, currentMood);
      setDailyPlan({
        ...plan,
        generatedDate: new Date().toISOString().split("T")[0]
      });
    } catch (err) {
      console.error("Failed to generate plan:", err);
    } finally {
      setPlanningDay(false);
    }
  };

  // Auth Connect
  const handleConnectCalendar = async () => {
    if (!firebaseAuth) {
      alert("Firebase setup is running in the background. Please accept terms in the setup popup or try again shortly.");
      return;
    }

    try {
      const result = await googleSignIn(firebaseAuth);
      if (result) {
        setUser(result.user);
        setGoogleToken(result.accessToken);
        
        // Load calendar events
        const calendarEvents = await fetchGoogleCalendarEvents(result.accessToken);
        if (calendarEvents.length > 0) {
          setEvents(calendarEvents);
          alert("Calendar sync successful! Google Calendar events have been imported.");
        }
      }
    } catch (err: any) {
      console.error("Auth failed:", err);
      alert(`Sync failed: ${err.message}`);
    }
  };

  const handleDisconnectCalendar = async () => {
    if (window.confirm("Are you sure you want to disconnect Google Calendar?")) {
      await logoutGoogle(firebaseAuth);
      setUser(null);
      setGoogleToken(null);
      setEvents(LOCAL_FALLBACK_EVENTS);
    }
  };

  // Blocking focus time in calendar (real Google Event or mock)
  const handleBlockFocusTime = async (task: Task) => {
    const focusDuration = 60; // 1 hour focus
    const start = new Date(Date.now() + 15 * 60 * 1000); // start in 15 mins
    const end = new Date(start.getTime() + focusDuration * 60 * 1000);

    const newEvent = {
      title: `⚡ Focus Block: ${task.title}`,
      description: `Deep focus block generated by Project Lifeline for: "${task.description || ""}"`,
      start: start.toISOString(),
      end: end.toISOString(),
      location: "Focus Zone"
    };

    if (googleToken) {
      if (window.confirm(`Auto-schedule a focus block on your real Google Calendar for "${task.title}" starting soon?`)) {
        try {
          const created = await createGoogleCalendarEvent(googleToken, newEvent);
          setEvents(prev => [created, ...prev]);
          alert("Focus time successfully scheduled on your Google Calendar!");
        } catch (err: any) {
          alert(`Failed to add event: ${err.message}`);
        }
      }
    } else {
      // Local addition
      const mockEvent: CalendarEvent = {
        id: "local-focus-" + Math.random().toString(36).substring(5),
        ...newEvent,
        isSynced: false
      };
      setEvents(prev => [mockEvent, ...prev]);
      alert(`Calendar offline: Focus block saved locally for: ${start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`);
    }
  };

  // Toggle checklist complete
  const handleToggleTask = (id: string) => {
    setTasks(prev =>
      prev.map(t => {
        if (t.id === id) {
          const completed = !t.completed;
          const progress = completed ? 100 : 0;
          if (completed) {
            setTriggerConfetti(true);
          }
          return {
            ...t,
            completed,
            progress,
            steps: t.steps?.map(s => ({ ...s, completed }))
          };
        }
        return t;
      })
    );
  };

  const handleDeleteTask = (id: string) => {
    if (window.confirm("Are you sure you want to remove this task?")) {
      setTasks(prev => prev.filter(t => t.id !== id));
      if (selectedTask?.id === id) setSelectedTask(null);
    }
  };

  // Stepper substeps add (icebreaker integration)
  const handleAddSubsteps = (taskId: string, steps: { title: string; description: string; durationMinutes: number }[]) => {
    setTasks(prev =>
      prev.map(t => {
        if (t.id === taskId) {
          return {
            ...t,
            steps: steps.map(s => ({ ...s, completed: false })),
            progress: 0
          };
        }
        return t;
      })
    );
  };

  // Complete sub-step in task detailed view
  const handleToggleSubstep = (taskId: string, stepIdx: number) => {
    setTasks(prev =>
      prev.map(t => {
        if (t.id === taskId && t.steps) {
          const nextSteps = [...t.steps];
          nextSteps[stepIdx].completed = !nextSteps[stepIdx].completed;
          const completedCount = nextSteps.filter(s => s.completed).length;
          const progress = Math.round((completedCount / nextSteps.length) * 100);
          const completed = progress === 100;
          if (completed && !t.completed) {
            setTriggerConfetti(true);
          }
          return {
            ...t,
            steps: nextSteps,
            progress,
            completed
          };
        }
        return t;
      })
    );
  };

  // Save notes and run AI note summarization & tagging
  const handleSaveNotes = async () => {
    if (!selectedTask) return;
    setNotesSummaryLoading(true);

    try {
      const summaryResult = await aiSummarizeNotes(editingNotes);
      setTasks(prev =>
        prev.map(t => {
          if (t.id === selectedTask.id) {
            return {
              ...t,
              notes: editingNotes,
              aiNotesSummary: summaryResult.summary,
              tags: Array.from(new Set([...(t.tags || []), ...summaryResult.tags]))
            };
          }
          return t;
        })
      );
      alert("AI successfully summarized your notes and suggested auto-tags!");
    } catch (err: any) {
      console.error(err);
      alert("Notes saved locally, but AI analysis failed: " + err.message);
    } finally {
      setNotesSummaryLoading(false);
    }
  };

  // Sync selected task detailed state
  const activeDetailedTask = selectedTask ? tasks.find(t => t.id === selectedTask.id) : null;

  // Track habit completions
  const handleToggleHabit = (id: string) => {
    const todayStr = new Date().toISOString().split("T")[0];
    setHabits(prev =>
      prev.map(h => {
        if (h.id === id) {
          const isCompletedToday = h.completedDates.includes(todayStr);
          let nextCompleted = [...h.completedDates];
          let nextStreak = h.streak;

          if (isCompletedToday) {
            nextCompleted = nextCompleted.filter(d => d !== todayStr);
            nextStreak = Math.max(0, h.streak - 1);
          } else {
            nextCompleted.push(todayStr);
            nextStreak += 1;
          }

          return {
            ...h,
            streak: nextStreak,
            completedDates: nextCompleted
          };
        }
        return h;
      })
    );
  };

  const handleAddHabit = (title: string) => {
    if (!title.trim()) return;
    const h: Habit = {
      id: "habit-" + Math.random().toString(36).substring(5),
      title,
      streak: 0,
      completedDates: []
    };
    setHabits(prev => [...prev, h]);
  };

  const handleAddGoal = (title: string, category: Goal["category"]) => {
    if (!title.trim()) return;
    const g: Goal = {
      id: "goal-" + Math.random().toString(36).substring(5),
      title,
      targetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      progress: 0,
      completed: false,
      category
    };
    setGoals(prev => [...prev, g]);
  };

  // SUCCESS METRICS
  const tasksCompleted = tasks.filter(t => t.completed).length;
  const tasksTotal = tasks.length;
  const tasksMissed = tasks.filter(t => {
    const isPast = new Date(t.dueDate).getTime() < Date.now();
    return isPast && !t.completed;
  }).length;
  
  const timeSavedMinutes = tasksCompleted * 20; // estimate 20 minutes saved per AI prioritizer block
  const rawScore = tasksTotal > 0 ? (tasksCompleted / tasksTotal) * 100 : 80;
  const productivityScore = Math.min(100, Math.round(rawScore + (habits.reduce((acc, h) => acc + h.streak, 0) * 0.5)));
  const stressReductionIndex = Math.min(100, 35 + (tasksCompleted * 8));

  // Dynamic gradient background class based on productivity score (green for good, red for urgent, blue/indigo default)
  const backgroundGradientClass = 
    productivityScore >= 75
      ? "bg-gradient-to-br from-[#05050A] via-[#04150A] to-[#072d15]"
      : productivityScore >= 40
        ? "bg-gradient-to-br from-[#05050A] via-[#0C0C18] to-[#121225]"
        : "bg-gradient-to-br from-[#05050A] via-[#1F0707] to-[#3a0909]";

  // Points Reward system
  const totalEarnedPoints = (tasksCompleted * 100) + (habits.reduce((acc, h) => acc + h.streak * 20, 0));

  return (
    <div id="project-lifeline-root" className={`min-h-screen ${backgroundGradientClass} text-[#E0E0E6] flex flex-col font-sans transition-all duration-1000 selection:bg-indigo-500/30 selection:text-white`}>
      <Confetti trigger={triggerConfetti} onComplete={() => setTriggerConfetti(false)} />

      {/* Weekly Review Modal Overlay */}
      <AnimatePresence>
        {showWeeklyReviewModal && (
          <motion.div
            id="weekly-review-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="w-full max-w-xl bg-[#090912] border border-white/10 rounded-2xl overflow-hidden shadow-2xl shadow-black/80"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between p-4 border-b border-white/5 bg-[#0C0C18]">
                <span className="text-xs font-bold font-mono text-indigo-400 uppercase tracking-wide">
                  Weekly Performance Report Card
                </span>
                <button
                  id="close-weekly-review-modal"
                  onClick={() => setShowWeeklyReviewModal(false)}
                  className="text-slate-400 hover:text-white text-xs font-mono bg-white/5 hover:bg-white/10 px-2.5 py-1 rounded-lg border border-white/5 transition-all"
                >
                  Close
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-5 max-h-[80vh] overflow-y-auto custom-scrollbar">
                <WeeklyReview tasks={tasks} habits={habits} goals={goals} />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* 1. TOP HEADER NAVIGATION */}
      <header id="lifeline-header" className="sticky top-0 z-40 backdrop-blur-md bg-black/40 border-b border-white/5 px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          
          <div className="flex items-center space-x-2.5">
            <div className="h-9 w-9 rounded-xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Brain className="h-5 w-5 text-white animate-pulse" />
            </div>
            <div>
              <span className="font-extrabold text-base tracking-tight text-white block">Project Lifeline <span className="text-indigo-400 font-normal italic font-display">AI Companion</span></span>
              <span className="text-[10px] text-indigo-400 font-mono tracking-wider uppercase">The Last-Minute Life Saver</span>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {/* Google Calendar Connection Status Button */}
            {authLoading ? (
              <span className="text-xs text-slate-500 font-mono">Verifying...</span>
            ) : googleToken ? (
              <div className="flex items-center space-x-2">
                <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-1 rounded-full flex items-center">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 mr-1.5 animate-ping" />
                  Synced Calendar
                </span>
                <button
                  id="disconnect-calendar-btn"
                  onClick={handleDisconnectCalendar}
                  title="Disconnect Google Account"
                  className="text-slate-500 hover:text-red-400 p-1 rounded-lg transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <button
                id="connect-calendar-btn"
                onClick={handleConnectCalendar}
                className="bg-[#0C0C18] border border-white/5 hover:border-white/10 hover:bg-[#121225] text-slate-200 text-xs font-semibold py-1.5 px-3 rounded-lg transition-all flex items-center space-x-1.5"
              >
                <Plus className="h-3.5 w-3.5 text-indigo-400" />
                <span>Sync Google Calendar</span>
              </button>
            )}
            
            {/* Score pill */}
            <div className="flex items-center space-x-1.5 bg-[#0C0C18]/60 border border-white/5 px-2.5 py-1 rounded-lg font-mono text-xs">
              <Award className="h-4 w-4 text-amber-400" />
              <span className="text-amber-400 font-bold">{totalEarnedPoints} XP</span>
            </div>
          </div>

        </div>
      </header>

      {/* 2. MAIN HUB CONTENT AND BENTO GRID */}
      <main id="lifeline-main" className="flex-1 max-w-7xl w-full mx-auto p-4 space-y-6">
        
        {/* APP VIEWS ACCORDING TO CURRENT TAB */}
        <div id="lifeline-grid-container" className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* LEFT CHROME PANEL (Nav rail for desktop) */}
          <nav id="desktop-nav-rail" className="hidden lg:flex lg:col-span-2 flex-col space-y-1.5 bg-[#0C0C18] border border-white/5 p-3 rounded-2xl sticky top-20">
            <span className="text-[9px] font-mono uppercase tracking-wider text-white/40 px-3.5 mb-2 block">Command Center</span>
            
            <button
              id="tab-btn-dashboard"
              onClick={() => setActiveTab("dashboard")}
              className={`flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all hover:scale-[1.03] active:scale-[0.97] ${
                activeTab === "dashboard" ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/20" : "text-white/60 hover:text-white hover:bg-white/5"
              }`}
            >
              <LayoutDashboard className="h-4 w-4" />
              <span>Smart Hub</span>
            </button>

            <button
              id="tab-btn-planner"
              onClick={() => setActiveTab("planner")}
              className={`flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all hover:scale-[1.03] active:scale-[0.97] ${
                activeTab === "planner" ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/20" : "text-white/60 hover:text-white hover:bg-white/5"
              }`}
            >
              <CalendarDays className="h-4 w-4" />
              <span>Daily Planner</span>
            </button>

            <button
              id="tab-btn-matrix"
              onClick={() => setActiveTab("matrix")}
              className={`flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all hover:scale-[1.03] active:scale-[0.97] ${
                activeTab === "matrix" ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/20" : "text-white/60 hover:text-white hover:bg-white/5"
              }`}
            >
              <Grid3X3 className="h-4 w-4" />
              <span>Priority Matrix</span>
            </button>

            <button
              id="tab-btn-defeater"
              onClick={() => setActiveTab("defeater")}
              className={`flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all hover:scale-[1.03] active:scale-[0.97] ${
                activeTab === "defeater" ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/20" : "text-white/60 hover:text-white hover:bg-white/5"
              }`}
            >
              <Brain className="h-4 w-4" />
              <span>Procrastination</span>
            </button>

            <button
              id="tab-btn-focus"
              onClick={() => setActiveTab("focus")}
              className={`flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all hover:scale-[1.03] active:scale-[0.97] ${
                activeTab === "focus" ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/20" : "text-white/60 hover:text-white hover:bg-white/5"
              }`}
            >
              <Timer className="h-4 w-4" />
              <span>Deep Focus Mode</span>
            </button>

            <button
              id="tab-btn-tools"
              onClick={() => setActiveTab("tools")}
              className={`flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all hover:scale-[1.03] active:scale-[0.97] ${
                activeTab === "tools" ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/20" : "text-white/60 hover:text-white hover:bg-white/5"
              }`}
            >
              <Compass className="h-4 w-4" />
              <span>Rescue Utilities</span>
            </button>
          </nav>

          {/* MAIN GRID VIEWPORT */}
          <div id="main-grid-viewport" className="lg:col-span-10 grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* CENTRAL INTERACTIVE SECTION */}
            <div id="central-section" className="lg:col-span-8 space-y-6">
              
              <AnimatePresence mode="wait">
                {activeTab === "dashboard" && (
                  <motion.div
                    id="view-dashboard"
                    key="dashboard"
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -15 }}
                    className="space-y-6"
                  >
                    
                    {/* Dynamic AI Task Suggestion Hero banner */}
                    <div className="p-5 rounded-2xl bg-gradient-to-r from-indigo-950/20 to-[#0C0C18] border border-indigo-500/20 relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between shadow-xl">
                      <div className="absolute top-0 left-0 h-48 w-48 bg-indigo-500/5 blur-3xl pointer-events-none rounded-full" />
                      
                      <div className="space-y-1 max-w-lg">
                        <span className="text-[10px] font-mono text-indigo-400 uppercase tracking-widest font-bold flex items-center">
                          <Sparkles className="h-3 w-3 mr-1 text-indigo-400 animate-pulse fill-current" />
                          AI Lifeline Coordinator Suggestion
                        </span>
                        
                        {prioritizing ? (
                          <div className="h-12 flex items-center space-x-2 text-xs text-slate-400">
                            <span className="h-2 w-2 rounded-full bg-indigo-400 animate-ping" />
                            <span>Recalculating focus priority across life markers...</span>
                          </div>
                        ) : nextTaskSuggestion ? (
                          <>
                            <h2 className="text-base font-bold text-white tracking-tight font-display">{nextTaskSuggestion.title}</h2>
                            <p className="text-xs text-white/60 font-sans leading-relaxed">"{nextTaskSuggestion.motivation}"</p>
                          </>
                        ) : (
                          <>
                            <h2 className="text-base font-bold text-white tracking-tight">All clear! No pending crises.</h2>
                            <p className="text-xs text-white/40 font-sans">You have crossed off all high-urgency tasks. Time to schedule some downtime or work on long term goals.</p>
                          </>
                        )}
                      </div>

                      {nextTaskSuggestion && (
                        <button
                          id="suggest-hero-focus"
                          onClick={() => {
                            const matchingTask = tasks.find(t => t.title === nextTaskSuggestion.title);
                            if (matchingTask) handleBlockFocusTime(matchingTask);
                          }}
                          className="mt-4 md:mt-0 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs py-2 px-4 rounded-xl shadow-lg shadow-indigo-500/20 transition-all flex items-center space-x-1"
                        >
                          <span>Auto-Block Focus</span>
                          <ArrowRight className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>

                    {/* Critical Now Alert Section (<24 hrs left) */}
                    <div id="critical-now-section" className="space-y-3">
                      <div className="flex justify-between items-center text-xs text-red-400 font-mono tracking-wider uppercase font-semibold">
                        <span className="flex items-center space-x-1.5">
                          <AlertCircle className="h-4 w-4 animate-pulse" />
                          <span>Critical Now</span>
                        </span>
                        <span className="text-[10px] text-red-400 bg-red-500/10 px-2 py-0.5 rounded font-bold">Urgent Deadlines</span>
                      </div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {tasks.filter(t => !t.completed && (new Date(t.dueDate).getTime() - Date.now()) < 24 * 60 * 60 * 1000).map(task => {
                          const dueHours = Math.max(0, Math.round((new Date(task.dueDate).getTime() - Date.now()) / (1000 * 60 * 60)));
                          return (
                            <div
                              id={`critical-card-${task.id}`}
                              key={task.id}
                              onClick={() => setSelectedTask(task)}
                              className="p-4 rounded-xl border border-red-500/30 bg-[#121225] hover:bg-[#121225]/80 cursor-pointer transition-all hover:shadow-lg hover:shadow-red-950/20 flex flex-col justify-between group relative pulse-red-glow"
                            >
                              <div>
                                <div className="flex items-center justify-between">
                                  <span className="text-[10px] font-mono text-red-400 bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded">
                                    {dueHours === 0 ? "OVERDUE CRISIS" : `${dueHours} Hours Left`}
                                  </span>
                                  <span className="text-[10px] font-mono text-white/30">{task.duration} mins</span>
                                </div>
                                <h3 className="font-bold text-xs text-white mt-2 truncate">{task.title}</h3>
                                <p className="text-[11px] text-white/40 mt-1 line-clamp-2 leading-relaxed">{task.description || "No description provided."}</p>
                              </div>

                              {task.predictionAlert?.isAtRisk && (
                                <div className="mt-2.5 p-2 bg-amber-500/10 border border-amber-500/20 rounded-lg text-[10px] text-amber-300">
                                  ⚠️ <b>Prediction Alert:</b> {task.predictionAlert.reason}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Dual Mode Task Input Capture */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between border-b border-white/5 pb-2">
                        <span className="text-[10px] font-mono uppercase tracking-wider text-white/40">Task Entry Hub</span>
                        <div className="flex space-x-1 bg-[#05050A] p-0.5 rounded-lg border border-white/5">
                          <button
                            id="switch-quick-tab"
                            onClick={() => setDashboardInputTab("quick")}
                            className={`text-[9.5px] px-2.5 py-1 rounded font-bold transition-all cursor-pointer hover:scale-105 active:scale-95 ${
                              dashboardInputTab === "quick"
                                ? "bg-indigo-600 text-white shadow"
                                : "text-white/40 hover:text-white"
                            }`}
                          >
                            ⚡ Quick Launcher
                          </button>
                          <button
                            id="switch-braindump-tab"
                            onClick={() => setDashboardInputTab("braindump")}
                            className={`text-[9.5px] px-2.5 py-1 rounded font-bold transition-all cursor-pointer hover:scale-105 active:scale-95 ${
                              dashboardInputTab === "braindump"
                                ? "bg-indigo-600 text-white shadow"
                                : "text-white/40 hover:text-white"
                            }`}
                          >
                            🧠 AI Brain Dump
                          </button>
                        </div>
                      </div>

                      <AnimatePresence mode="wait">
                        {dashboardInputTab === "quick" ? (
                          <motion.div
                            key="quick-form"
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -5 }}
                            id="quick-capture-panel"
                            className="p-4 bg-[#0C0C18] rounded-2xl border border-white/5"
                          >
                             <form id="quick-task-form" onSubmit={handleAddTask} className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                              <div className="sm:col-span-6">
                                <input
                                  id="quick-task-title-input"
                                  type="text"
                                  required
                                  value={newTaskTitle}
                                  onChange={(e) => setNewTaskTitle(e.target.value)}
                                  placeholder="I need to complete slides, draft proposal, buy ticket..."
                                  className="w-full bg-[#05050A] border border-white/5 rounded-xl text-xs px-3.5 py-3 sm:py-2.5 min-h-[44px] sm:min-h-0 text-slate-200 focus:outline-none focus:border-indigo-500 placeholder-white/20"
                                />
                              </div>
                              <div className="sm:col-span-2">
                                <select
                                  id="quick-task-urgency-select"
                                  value={newTaskHoursLeft}
                                  onChange={(e) => setNewTaskHoursLeft(e.target.value)}
                                  className="w-full h-full bg-[#05050A] border border-white/5 rounded-xl text-xs px-2 py-3 sm:py-2.5 min-h-[44px] sm:min-h-0 text-slate-300 focus:outline-none"
                                >
                                  <option value="3">3 hours left</option>
                                  <option value="12">12 hours left</option>
                                  <option value="24">24 hours left</option>
                                  <option value="72">3 days left</option>
                                </select>
                              </div>
                              <div className="sm:col-span-2">
                                <select
                                  id="quick-task-importance-select"
                                  value={newTaskImportance}
                                  onChange={(e) => setNewTaskImportance(e.target.value as "high" | "low")}
                                  className="w-full h-full bg-[#05050A] border border-white/5 rounded-xl text-xs px-2 py-3 sm:py-2.5 min-h-[44px] sm:min-h-0 text-slate-300 focus:outline-none"
                                >
                                  <option value="high">🔥 High Imp</option>
                                  <option value="low">☕ Low Imp</option>
                                </select>
                              </div>
                              <button
                                id="quick-task-add-btn"
                                type="submit"
                                className="sm:col-span-2 bg-indigo-600 hover:bg-indigo-500 hover:scale-105 active:scale-95 text-white font-semibold text-xs py-3 sm:py-2 px-3 rounded-xl transition-all flex items-center justify-center space-x-1 shadow-lg shadow-indigo-500/20 h-full min-h-[44px] sm:min-h-0"
                              >
                                <Plus className="h-4 w-4" />
                                <span>Add</span>
                              </button>
                            </form>
                          </motion.div>
                        ) : (
                          <motion.div
                            key="braindump-form"
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -5 }}
                          >
                            <BrainDump onImportTasks={handleImportBrainDump} />
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* MINI DEADLINE CALENDAR & CLIMATE SUGGESTIONS */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                      <MiniCalendar tasks={tasks} events={events || LOCAL_FALLBACK_EVENTS} />
                      
                      {/* WEATHER-BASED SUGGESTIONS & WEEKLY REVIEW ACTION CARD */}
                      <div id="weather-suggestions-widget" className="p-4 bg-[#0C0C18] border border-white/5 rounded-2xl relative overflow-hidden shadow-xl flex flex-col justify-between">
                        <div className="absolute top-0 left-0 h-24 w-24 bg-blue-500/5 blur-2xl pointer-events-none rounded-full" />
                        <div>
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-[9px] font-mono uppercase tracking-wider text-white/40 block">
                              🌦️ Climate-Synced Coaching
                            </span>
                            <div className="flex space-x-1 bg-[#05050A] p-0.5 rounded-lg border border-white/5">
                              {(["rainy", "sunny", "overcast", "snowy"] as const).map((w) => (
                                <button
                                  key={w}
                                  onClick={() => setCurrentWeather(w)}
                                  className={`text-[10px] px-1.5 py-0.5 rounded transition-all capitalize ${
                                    currentWeather === w
                                      ? "bg-indigo-600 text-white font-bold"
                                      : "text-white/40 hover:text-white"
                                  }`}
                                >
                                  {w === "rainy" ? "🌧️" : w === "sunny" ? "☀️" : w === "overcast" ? "☁️" : "❄️"}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Dynamic Weather Coach Suggestion */}
                          {(() => {
                            const weatherObj = (() => {
                              switch (currentWeather) {
                                case "rainy":
                                  return {
                                    icon: "🌧️",
                                    theme: "Rainy Cave Mode",
                                    suggestion: "Rainy days are perfect for hyper-focused deep work! With zero outdoor distractions, cozy up with a warm brew and complete that difficult Biochemistry Project Slide deck. High-urgency tasks resolve 40% faster in Cave Mode.",
                                    color: "text-blue-400 bg-blue-500/5 border-blue-500/10"
                                  };
                                case "sunny":
                                  return {
                                    icon: "☀️",
                                    theme: "Sunny Energy Vibe",
                                    suggestion: "Clear skies and high energy! Tackle a brisk 25-minute Focus Sprint, then reward yourself with an active 5-minute walk under the sun. Vitamin D replenishes cognitive battery and prevents screen fatigue.",
                                    color: "text-amber-400 bg-amber-500/5 border-amber-500/10"
                                  };
                                case "overcast":
                                  return {
                                    icon: "☁️",
                                    theme: "Soft Gray Lighting",
                                    suggestion: "Soft ambient daylight minimizes screen glare. Excellent for editing drafts, planning out your Eisenhower Matrix, or writing. Turn on 'Steady Pink' focus noise synthesis to lock in.",
                                    color: "text-slate-400 bg-slate-500/5 border-slate-500/10"
                                  };
                                case "snowy":
                                  return {
                                    icon: "❄️",
                                    theme: "Deep Winter Retreat",
                                    suggestion: "Chilly outside means complete insulation. Set your room temperature comfort high, close all browser tabs except Project Lifeline, and knock out your 3 lowest effort tasks to build easy momentum.",
                                    color: "text-teal-400 bg-teal-500/5 border-teal-500/10"
                                  };
                              }
                            })();
                            return (
                              <div className={`p-3 rounded-xl border ${weatherObj.color} transition-all`}>
                                <div className="flex items-center space-x-2 mb-1.5">
                                  <span className="text-xl">{weatherObj.icon}</span>
                                  <span className="text-xs font-bold font-mono uppercase tracking-wide">{weatherObj.theme}</span>
                                </div>
                                <p className="text-[11px] leading-relaxed font-sans">{weatherObj.suggestion}</p>
                              </div>
                            );
                          })()}
                        </div>

                        <div className="mt-4 pt-3 border-t border-white/5">
                          <button
                            id="trigger-weekly-review-modal-btn"
                            onClick={() => setShowWeeklyReviewModal(true)}
                            className="w-full bg-[#05050A] hover:bg-white/5 border border-white/5 text-slate-200 font-bold text-xs py-2 px-4 rounded-xl transition-all flex items-center justify-center space-x-1.5"
                          >
                            <Award className="h-4 w-4 text-indigo-400" />
                            <span>View AI Weekly Performance Report</span>
                          </button>
                        </div>
                      </div>
                    </div>

                  </motion.div>
                )}

                {activeTab === "planner" && (
                  <motion.div
                    id="view-planner"
                    key="planner"
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -15 }}
                  >
                    <ScheduleTimeline
                      plan={dailyPlan}
                      onGeneratePlan={handleGeneratePlan}
                      generating={planningDay}
                    />
                  </motion.div>
                )}

                 {activeTab === "matrix" && (
                  <motion.div
                    id="view-matrix"
                    key="matrix"
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -15 }}
                    className="space-y-4"
                  >
                    <div className="flex items-center justify-between pb-2 border-b border-white/5">
                      <div>
                        <h2 className="text-sm font-bold text-white tracking-tight">Eisenhower Prioritization Matrix</h2>
                        <p className="text-[11px] text-white/40">Double click any task card to break it down, add notes, or block deep focus schedules.</p>
                      </div>
                      <button
                        id="refresh-ai-sorting-btn"
                        onClick={() => triggerAiPrioritization(tasks)}
                        disabled={prioritizing}
                        className="bg-[#0C0C18] border border-white/5 hover:border-white/10 hover:bg-[#121225] text-xs text-slate-300 py-1.5 px-3 rounded-lg font-mono flex items-center"
                      >
                        {prioritizing ? "Auto Sorting..." : "AI Auto Sort Matrix"}
                      </button>
                    </div>

                    <EisenhowerMatrix
                      tasks={tasks}
                      onToggleComplete={handleToggleTask}
                      onDeleteTask={handleDeleteTask}
                      onSelectTask={(t) => setSelectedTask(t)}
                    />
                  </motion.div>
                )}

                {activeTab === "defeater" && (
                  <motion.div
                    id="view-defeater"
                    key="defeater"
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -15 }}
                  >
                    <ProcrastinationBox
                      tasks={tasks}
                      onAddSubsteps={handleAddSubsteps}
                      onSelectMood={setCurrentMood}
                      currentMood={currentMood}
                    />
                  </motion.div>
                )}

                {activeTab === "focus" && (
                  <motion.div
                    id="view-focus"
                    key="focus"
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -15 }}
                    className="space-y-6"
                  >
                    <PomodoroTimer
                      taskTitle={tasks.find(t => !t.completed)?.title}
                    />
                  </motion.div>
                )}

                {activeTab === "tools" && (
                  <motion.div
                    id="view-tools"
                    key="tools"
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -15 }}
                    className="space-y-6"
                  >
                    <DecisionMaker />
                    <MeetingPrep events={events} />
                  </motion.div>
                )}
              </AnimatePresence>

            </div>

            {/* RIGHT SIDEBAR STATS & CALENDAR VIEWS */}
            <div id="right-sidebar" className="lg:col-span-4 space-y-6">
              
              {/* Productivity Stats Score Dashboard */}
              <div id="stats-dashboard" className="p-4 bg-[#0C0C18] border border-white/5 rounded-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 h-24 w-24 bg-indigo-500/5 blur-2xl pointer-events-none rounded-full" />
                <span className="text-[9px] font-mono uppercase tracking-wider text-white/40 block mb-3">Live Lifeline Performance</span>
                
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="p-3 bg-[#05050A] rounded-xl border border-white/5">
                    <span className="text-[10px] text-white/40 font-mono block">Stress Level</span>
                    <span className="text-xl font-bold font-mono text-indigo-400 mt-1 block">
                      {Math.max(10, 100 - stressReductionIndex)}%
                    </span>
                  </div>
                  <div className="p-3 bg-[#05050A] rounded-xl border border-white/5">
                    <span className="text-[10px] text-white/40 font-mono block">Productivity</span>
                    <span className="text-xl font-bold font-mono text-emerald-400 mt-1 block">
                      {productivityScore}%
                    </span>
                  </div>
                </div>

                <div className="space-y-2.5 text-xs text-slate-300">
                  <div className="flex justify-between items-center">
                    <span className="flex items-center text-white/55">
                      <CheckCircle className="h-3.5 w-3.5 text-emerald-500 mr-1.5" /> Tasks Completed
                    </span>
                    <span className="font-mono text-white">{tasksCompleted} / {tasksTotal}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="flex items-center text-white/55">
                      <AlertCircle className="h-3.5 w-3.5 text-red-500 mr-1.5" /> Crises Missed
                    </span>
                    <span className="font-mono text-white">{tasksMissed}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="flex items-center text-white/55">
                      <TrendingUp className="h-3.5 w-3.5 text-indigo-400 mr-1.5" /> Estim. Time Saved
                    </span>
                    <span className="font-mono text-white">{timeSavedMinutes} mins</span>
                  </div>
                </div>

                {/* Micro Reward badge */}
                <div className="mt-4 p-3 bg-gradient-to-tr from-indigo-950/20 to-[#05050A] border border-indigo-500/10 rounded-xl flex items-center space-x-2.5">
                  <div className="h-8 w-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
                    <Award className="h-4 w-4 text-indigo-400" />
                  </div>
                  <div>
                    <span className="text-[10px] text-white/40 block font-sans">Active Title</span>
                    <span className="font-extrabold text-[11px] text-white font-sans tracking-wide">
                      {totalEarnedPoints >= 1000 ? "🏅 Life Savior Master" : totalEarnedPoints >= 400 ? "🥈 Last Minute Ninja" : "🥉 Procrastination Fighter"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Stress Meter Widget */}
              <StressMeter tasks={tasks} />

              {/* Habit tracking panel */}
              <div id="habit-panel" className="p-4 bg-[#0C0C18] border border-white/5 rounded-2xl">
                <span className="text-[9px] font-mono uppercase tracking-wider text-white/40 block mb-3">Habit Streaks</span>
                
                <div className="space-y-2">
                  {habits.map((h) => {
                    const todayStr = new Date().toISOString().split("T")[0];
                    const isCompleted = h.completedDates.includes(todayStr);
                    return (
                      <div
                        id={`habit-item-${h.id}`}
                        key={h.id}
                        onClick={() => handleToggleHabit(h.id)}
                        className={`p-2.5 rounded-xl border cursor-pointer flex items-center justify-between transition-colors ${
                          isCompleted
                            ? "bg-[#05050A]/40 border-white/5 text-slate-500"
                            : "bg-[#05050A] border-white/5 hover:border-white/10 text-slate-200"
                        }`}
                      >
                        <div className="flex items-center space-x-2 min-w-0">
                          <button
                            id={`toggle-habit-btn-${h.id}`}
                            className={`p-0.5 rounded-full ${
                              isCompleted ? "text-emerald-500" : "text-slate-600"
                            }`}
                          >
                            <CircleCheck className="h-4.5 w-4.5 fill-current" />
                          </button>
                          <span className="text-xs font-medium truncate">{h.title}</span>
                        </div>
                        <span className="text-[10px] font-mono text-indigo-400 bg-indigo-950/50 px-2 py-0.5 rounded-full">
                          🔥 {h.streak}d
                        </span>
                      </div>
                    );
                  })}
                </div>
                
                <input
                  id="add-habit-input"
                  type="text"
                  placeholder="+ Add new habit and start streak"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleAddHabit(e.currentTarget.value);
                      e.currentTarget.value = "";
                    }
                  }}
                  className="w-full bg-[#05050A] border border-white/5 rounded-xl text-[10.5px] px-3 py-2 mt-2 text-slate-300 placeholder-white/20 focus:outline-none focus:border-indigo-500/50"
                />
              </div>

              {/* Goal List tracking panel */}
              <div id="goal-panel" className="p-4 bg-[#0C0C18] border border-white/5 rounded-2xl">
                <span className="text-[9px] font-mono uppercase tracking-wider text-white/40 block mb-3">Goal Progress</span>
                <div className="space-y-3">
                  {goals.map((g) => (
                    <div id={`goal-item-${g.id}`} key={g.id} className="space-y-1">
                      <div className="flex justify-between items-center text-[11px]">
                        <span className="text-slate-200 font-medium truncate pr-4">{g.title}</span>
                        <span className="font-mono text-[10px] text-slate-400">{g.progress}%</span>
                      </div>
                      <div className="w-full bg-[#05050A] h-1.5 rounded-full overflow-hidden border border-white/5">
                        <div
                          className="bg-indigo-600 h-full rounded-full"
                          style={{ width: `${g.progress}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
                <input
                  id="add-goal-input"
                  type="text"
                  placeholder="+ New goal (Academic/Personal)"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleAddGoal(e.currentTarget.value, "academic");
                      e.currentTarget.value = "";
                    }
                  }}
                  className="w-full bg-[#05050A] border border-white/5 rounded-xl text-[10.5px] px-3 py-2 mt-3 text-slate-300 placeholder-white/20 focus:outline-none focus:border-indigo-500/50"
                />
              </div>

              {/* Next upcoming schedule/calendar strip */}
              <div id="upcoming-calendar-strip" className="p-4 bg-[#0C0C18] border border-white/5 rounded-2xl">
                <span className="text-[9px] font-mono uppercase tracking-wider text-white/40 block mb-3">Active Calendar View</span>
                
                <div className="space-y-2">
                  {events.slice(0, 3).map((event) => {
                    const startLocal = new Date(event.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    return (
                      <div id={`event-strip-item-${event.id}`} key={event.id} className="p-2.5 rounded-xl bg-[#05050A] border border-white/5 flex items-center justify-between">
                        <div className="min-w-0 pr-2">
                          <h4 className="text-xs font-semibold text-slate-200 truncate">{event.title}</h4>
                          <span className="text-[9px] font-mono text-slate-500">{event.location || "Virtual HQ"}</span>
                        </div>
                        <span className="text-[10px] font-mono text-indigo-400 px-2 py-0.5 rounded bg-indigo-950/40 shrink-0">
                          {startLocal}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Natural command box */}
              <VoiceCommandBtn onParsedTask={handleParsedVoiceTask} />

            </div>

          </div>

        </div>

      </main>

      {/* 3. TASK DETAILED BOTTOM DRAWER / VIEW MODAL */}
      <AnimatePresence>
        {activeDetailedTask && (
          <motion.div
            id="task-detail-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-[#05050A]/75 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="bg-[#0C0C18] border border-white/5 w-full max-w-lg rounded-2xl p-5 shadow-2xl relative"
            >
              <div className="flex items-start justify-between pb-3 border-b border-white/5">
                <div className="min-w-0">
                  <div className="flex items-center space-x-2">
                    <span className="text-[9px] font-mono uppercase tracking-wider bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2 py-0.5 rounded">
                      {activeDetailedTask.matrixQuadrant?.replace("-", " ")}
                    </span>
                    <span className="text-[9px] font-mono text-white/40">{activeDetailedTask.duration} mins</span>
                  </div>
                  <h3 className="font-extrabold text-base text-white mt-1.5 truncate">
                    {activeDetailedTask.title}
                  </h3>
                </div>
                <button
                  id="close-modal-btn"
                  onClick={() => {
                    setSelectedTask(null);
                    setEditingNotes("");
                  }}
                  className="text-slate-400 hover:text-white font-mono text-xs border border-white/5 hover:border-white/10 bg-[#05050A] px-2.5 py-1 rounded-lg transition-colors"
                >
                  Esc Close
                </button>
              </div>

              {/* Modal Body */}
              <div className="space-y-4 py-4 max-h-[380px] overflow-y-auto pr-1 custom-scrollbar text-xs">
                {activeDetailedTask.description && (
                  <div>
                    <span className="text-[10px] text-slate-500 font-mono uppercase">Goal & Objective</span>
                    <p className="text-slate-300 leading-relaxed font-sans mt-0.5">{activeDetailedTask.description}</p>
                  </div>
                )}

                {/* Substeps checklists */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-slate-500 font-mono uppercase">Checklist Steps</span>
                    <div className="flex items-center space-x-1.5 bg-indigo-500/10 px-2 py-0.5 rounded-full border border-indigo-500/20">
                      <span className="text-[9px] font-mono text-indigo-300">Progress</span>
                      <div className="relative h-4 w-4">
                        <svg className="h-4 w-4 transform -rotate-90">
                          <circle cx="8" cy="8" r="6" className="stroke-white/10" strokeWidth="1.5" fill="transparent" />
                          <motion.circle
                            cx="8"
                            cy="8"
                            r="6"
                            className="stroke-indigo-400"
                            strokeWidth="1.5"
                            fill="transparent"
                            strokeDasharray={2 * Math.PI * 6}
                            initial={{ strokeDashoffset: 2 * Math.PI * 6 }}
                            animate={{ strokeDashoffset: 2 * Math.PI * 6 - (activeDetailedTask.progress / 100) * 2 * Math.PI * 6 }}
                            transition={{ duration: 0.6 }}
                          />
                        </svg>
                      </div>
                      <span className="text-[9px] font-mono text-indigo-300 font-bold">{activeDetailedTask.progress}%</span>
                    </div>
                  </div>
                  {activeDetailedTask.steps && activeDetailedTask.steps.length > 0 ? (
                    <div className="space-y-1.5">
                      {activeDetailedTask.steps.map((step, idx) => (
                        <div
                          id={`modal-step-item-${idx}`}
                          key={idx}
                          onClick={() => handleToggleSubstep(activeDetailedTask.id, idx)}
                          className={`p-2.5 rounded-lg border transition-all cursor-pointer flex items-center justify-between ${
                            step.completed
                              ? "bg-[#05050A]/40 border-white/5 text-slate-500 line-through"
                              : "bg-[#05050A] border border-white/5 hover:border-white/10 text-slate-300"
                          }`}
                        >
                          <div className="flex items-center space-x-2">
                            <span className={`h-4 w-4 rounded-full flex items-center justify-center border text-[10px] ${
                              step.completed ? "border-emerald-500 bg-emerald-500/20 text-emerald-400" : "border-white/10 text-transparent"
                            }`}>
                              ✓
                            </span>
                            <span className="font-sans">{step.title}</span>
                          </div>
                          <span className="text-[9px] font-mono text-white/40">{step.durationMinutes}m</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-3 border border-dashed border-white/5 rounded-xl text-center text-white/30">
                      No broken-down steps yet. Try launching the "Procrastination Box" tab to auto-break this task.
                    </div>
                  )}
                </div>

                {/* AI generated Notes block */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-white/40 font-mono uppercase">AI-Analyzed Notes Summary</span>
                    {activeDetailedTask.notes && (
                      <button
                        id="modal-save-notes-btn"
                        onClick={handleSaveNotes}
                        disabled={notesSummaryLoading}
                        className="text-[10px] text-indigo-400 hover:underline flex items-center"
                      >
                        {notesSummaryLoading ? "Summarizing with AI..." : "Re-Analyze Notes"}
                      </button>
                    )}
                  </div>
                  
                  {activeDetailedTask.aiNotesSummary ? (
                    <div className="p-3 bg-indigo-500/5 border border-indigo-500/20 rounded-xl text-slate-300 font-sans leading-relaxed">
                      {activeDetailedTask.aiNotesSummary}
                    </div>
                  ) : (
                    <p className="text-[10px] text-white/30 font-sans italic">Write notes on your task below and click Analyze to let AI summarize ideas and add tags automatically.</p>
                  )}

                  <textarea
                    id="modal-notes-textarea"
                    value={editingNotes || activeDetailedTask.notes || ""}
                    onChange={(e) => setEditingNotes(e.target.value)}
                    placeholder="Brainstorm ideas, outline project specs, write down raw thoughts here..."
                    className="w-full bg-[#05050A] border border-white/5 rounded-xl text-xs p-2.5 text-slate-200 placeholder-white/20 focus:outline-none focus:border-indigo-500 resize-none h-[80px]"
                  />
                  {!activeDetailedTask.aiNotesSummary && editingNotes && (
                    <button
                      id="save-notes-primary-btn"
                      onClick={handleSaveNotes}
                      disabled={notesSummaryLoading}
                      className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs py-2 rounded-xl transition-all flex items-center justify-center space-x-1 shadow-lg shadow-indigo-500/20"
                    >
                      <span>Analyze & Summarize Notes</span>
                    </button>
                  )}
                </div>

                {/* Tags */}
                {activeDetailedTask.tags && activeDetailedTask.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {activeDetailedTask.tags.map((tag) => (
                      <span key={tag} className="text-[9px] font-mono bg-[#05050A] text-indigo-400 px-2 py-0.5 rounded border border-white/5">
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Modal footer controls */}
              <div className="flex space-x-2 pt-3 border-t border-white/5">
                <button
                  id="modal-complete-btn"
                  onClick={() => {
                    handleToggleTask(activeDetailedTask.id);
                    setSelectedTask(null);
                  }}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs py-2 px-3 rounded-xl transition-all"
                >
                  {activeDetailedTask.completed ? "Mark Incomplete" : "Complete Task"}
                </button>
                <button
                  id="modal-block-focus-btn"
                  onClick={() => {
                    handleBlockFocusTime(activeDetailedTask);
                    setSelectedTask(null);
                  }}
                  className="bg-[#05050A] hover:bg-[#121225] border border-white/5 text-slate-300 hover:text-white font-semibold text-xs py-2 px-4 rounded-xl transition-all flex items-center space-x-1"
                >
                  <Timer className="h-4 w-4 text-indigo-400" />
                  <span>Block Focus Time</span>
                </button>
              </div>

            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile Add Task Modal (FAB triggered) */}
      <AnimatePresence>
        {showMobileAddModal && (
          <motion.div
            id="mobile-add-modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-end sm:items-center justify-center p-4"
          >
            <motion.div
              id="mobile-add-modal-card"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 250 }}
              className="w-full max-w-md bg-[#090912] border-t sm:border border-white/10 rounded-t-2xl sm:rounded-2xl overflow-hidden shadow-2xl shadow-black p-5 space-y-4 pb-8 sm:pb-5"
            >
              <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <span className="text-xs font-bold font-mono text-indigo-400 uppercase tracking-wider flex items-center">
                  <Plus className="h-4 w-4 mr-1.5 text-indigo-400 animate-pulse" />
                  Quick Add Task
                </span>
                <button
                  id="close-mobile-add-modal"
                  onClick={() => setShowMobileAddModal(false)}
                  className="text-slate-400 hover:text-white p-2 rounded-lg bg-white/5 transition-all"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <form id="mobile-add-task-form" onSubmit={handleMobileAddTask} className="space-y-4">
                <div>
                  <label className="text-[10px] text-white/40 font-mono uppercase block mb-1">Task Title *</label>
                  <input
                    id="mobile-task-title-input"
                    type="text"
                    required
                    value={mobileTaskTitle}
                    onChange={(e) => setMobileTaskTitle(e.target.value)}
                    placeholder="Enter task name..."
                    className="w-full bg-[#05050A] border border-white/10 rounded-xl text-sm px-4 py-3 text-slate-200 focus:outline-none focus:border-indigo-500 placeholder-white/20 min-h-[44px]"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-white/40 font-mono uppercase block mb-1">Description (Optional)</label>
                  <textarea
                    id="mobile-task-desc-input"
                    value={mobileTaskDescription}
                    onChange={(e) => setMobileTaskDescription(e.target.value)}
                    placeholder="Provide details about the task..."
                    rows={2}
                    className="w-full bg-[#05050A] border border-white/10 rounded-xl text-sm px-4 py-3 text-slate-200 focus:outline-none focus:border-indigo-500 placeholder-white/20 min-h-[64px]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] text-white/40 font-mono uppercase block mb-1">Urgency</label>
                    <select
                      id="mobile-task-urgency-select"
                      value={mobileTaskUrgency}
                      onChange={(e) => setMobileTaskUrgency(e.target.value as "high" | "low")}
                      className="w-full bg-[#05050A] border border-white/10 rounded-xl text-sm px-3 py-3 text-slate-300 focus:outline-none min-h-[44px]"
                    >
                      <option value="high">🔥 High (Immediate)</option>
                      <option value="low">☕ Low (Flexible)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] text-white/40 font-mono uppercase block mb-1">Importance</label>
                    <select
                      id="mobile-task-importance-select"
                      value={mobileTaskImportance}
                      onChange={(e) => setMobileTaskImportance(e.target.value as "high" | "low")}
                      className="w-full bg-[#05050A] border border-white/10 rounded-xl text-sm px-3 py-3 text-slate-300 focus:outline-none min-h-[44px]"
                    >
                      <option value="high">⭐️ High Importance</option>
                      <option value="low">☕ Low Importance</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] text-white/40 font-mono uppercase block mb-1">Due Deadline</label>
                  <select
                    id="mobile-task-hours-select"
                    value={mobileTaskHoursLeft}
                    onChange={(e) => setMobileTaskHoursLeft(e.target.value)}
                    className="w-full bg-[#05050A] border border-white/10 rounded-xl text-sm px-3 py-3 text-slate-300 focus:outline-none min-h-[44px]"
                  >
                    <option value="3">Within 3 hours</option>
                    <option value="12">Within 12 hours</option>
                    <option value="24">Within 24 hours</option>
                    <option value="72">Within 3 days</option>
                  </select>
                </div>

                <div className="pt-2 flex space-x-3">
                  <button
                    id="mobile-task-cancel-btn"
                    type="button"
                    onClick={() => setShowMobileAddModal(false)}
                    className="flex-1 bg-white/5 hover:bg-white/10 border border-white/5 text-slate-300 font-bold text-sm py-3.5 px-4 rounded-xl transition-all min-h-[44px]"
                  >
                    Cancel
                  </button>
                  <button
                    id="mobile-task-submit-btn"
                    type="submit"
                    className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm py-3.5 px-4 rounded-xl transition-all shadow-lg shadow-indigo-500/20 min-h-[44px]"
                  >
                    Add Task
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Action Button (FAB) for Mobile Quick Task Addition */}
      <div className="fixed bottom-24 right-5 z-40 lg:hidden">
        <button
          id="mobile-quick-add-fab"
          onClick={() => setShowMobileAddModal(true)}
          className="bg-indigo-600 hover:bg-indigo-500 text-white p-4 rounded-full shadow-2xl shadow-indigo-500/50 hover:scale-105 active:scale-95 transition-all flex items-center justify-center border border-indigo-400/30 w-14 h-14"
        >
          <Plus className="h-6 w-6 stroke-[3px]" />
        </button>
      </div>

      {/* 4. MOBILE NAVIGATION BOTTOM BAR */}
      <nav id="mobile-nav-bar" className="lg:hidden sticky bottom-0 z-40 bg-[#06060c]/90 backdrop-blur-md border-t border-white/10 px-1 py-1.5 flex justify-around items-center">
        <button
          id="mob-tab-dashboard"
          onClick={() => setActiveTab("dashboard")}
          className={`flex-1 flex flex-col items-center justify-center py-2 px-1 rounded-xl transition-all min-h-[48px] active:scale-95 ${
            activeTab === "dashboard" ? "text-indigo-400 bg-white/5" : "text-white/40"
          }`}
        >
          <LayoutDashboard className="h-5 w-5" />
          <span className="text-[10px] font-medium font-sans mt-1">Hub</span>
        </button>

        <button
          id="mob-tab-planner"
          onClick={() => setActiveTab("planner")}
          className={`flex-1 flex flex-col items-center justify-center py-2 px-1 rounded-xl transition-all min-h-[48px] active:scale-95 ${
            activeTab === "planner" ? "text-indigo-400 bg-white/5" : "text-white/40"
          }`}
        >
          <CalendarDays className="h-5 w-5" />
          <span className="text-[10px] font-medium font-sans mt-1">Plan</span>
        </button>

        <button
          id="mob-tab-matrix"
          onClick={() => setActiveTab("matrix")}
          className={`flex-1 flex flex-col items-center justify-center py-2 px-1 rounded-xl transition-all min-h-[48px] active:scale-95 ${
            activeTab === "matrix" ? "text-indigo-400 bg-white/5" : "text-white/40"
          }`}
        >
          <Grid3X3 className="h-5 w-5" />
          <span className="text-[10px] font-medium font-sans mt-1">Matrix</span>
        </button>

        <button
          id="mob-tab-defeater"
          onClick={() => setActiveTab("defeater")}
          className={`flex-1 flex flex-col items-center justify-center py-2 px-1 rounded-xl transition-all min-h-[48px] active:scale-95 ${
            activeTab === "defeater" ? "text-indigo-400 bg-white/5" : "text-white/40"
          }`}
        >
          <Brain className="h-5 w-5" />
          <span className="text-[10px] font-medium font-sans mt-1">Defeat</span>
        </button>

        <button
          id="mob-tab-focus"
          onClick={() => setActiveTab("focus")}
          className={`flex-1 flex flex-col items-center justify-center py-2 px-1 rounded-xl transition-all min-h-[48px] active:scale-95 ${
            activeTab === "focus" ? "text-indigo-400 bg-white/5" : "text-white/40"
          }`}
        >
          <Timer className="h-5 w-5" />
          <span className="text-[10px] font-medium font-sans mt-1">Focus</span>
        </button>

        <button
          id="mob-tab-tools"
          onClick={() => setActiveTab("tools")}
          className={`flex-1 flex flex-col items-center justify-center py-2 px-1 rounded-xl transition-all min-h-[48px] active:scale-95 ${
            activeTab === "tools" ? "text-indigo-400 bg-white/5" : "text-white/40"
          }`}
        >
          <Compass className="h-5 w-5" />
          <span className="text-[10px] font-medium font-sans mt-1">Tools</span>
        </button>
      </nav>

    </div>
  );
}

