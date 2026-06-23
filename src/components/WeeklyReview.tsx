import React, { useState } from "react";
import { Award, CheckCircle, Flame, Sparkles, TrendingUp, RefreshCw, BarChart2, BookOpen } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface Task {
  id: string;
  title: string;
  completed: boolean;
  duration: number;
}

interface Habit {
  id: string;
  title: string;
  streak: number;
}

interface Goal {
  id: string;
  title: string;
  progress: number;
}

interface WeeklyReviewProps {
  tasks: Task[];
  habits: Habit[];
  goals: Goal[];
}

export default function WeeklyReview({ tasks, habits, goals }: WeeklyReviewProps) {
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<{ summary: string; strengths: string[]; recommendation: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const completedTasks = tasks.filter((t) => t.completed);
  const pendingTasksCount = tasks.filter((t) => !t.completed).length;
  const timeSaved = completedTasks.reduce((acc, t) => acc + t.duration, 0);

  const handleGenerateReport = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/gemini/weekly-review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          completedTasks: completedTasks.map((t) => t.title),
          habits: habits.map((h) => `${h.title} (streak: ${h.streak}d)`),
          goals: goals.map((g) => `${g.title} (progress: ${g.progress}%)`),
        }),
      });

      if (!response.ok) {
        throw new Error("Could not compile review report. Please try again.");
      }

      const data = await response.json();
      setReport(data);
    } catch (err: any) {
      setError(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="weekly-review-container" className="p-5 rounded-2xl border border-white/5 bg-[#0C0C18] relative overflow-hidden shadow-xl">
      <div className="absolute top-0 right-0 h-32 w-32 bg-indigo-500/5 blur-3xl pointer-events-none rounded-full" />
      
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2.5">
          <div className="h-8 w-8 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
            <Award className="h-4.5 w-4.5" />
          </div>
          <div>
            <h3 className="text-sm font-extrabold text-slate-200 tracking-wide">Weekly Accomplishment Review</h3>
            <p className="text-[10px] text-white/40 font-sans">Quantify your milestones and get a custom AI behavioral analysis.</p>
          </div>
        </div>

        {report && (
          <button
            onClick={handleGenerateReport}
            className="p-1.5 rounded-lg bg-[#05050A] hover:bg-white/5 text-slate-400 hover:text-white border border-white/5 transition-all flex items-center space-x-1"
          >
            <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
            <span className="text-[9px] font-mono">Regenerate</span>
          </button>
        )}
      </div>

      {/* Numerical Stats Overview */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="p-3 bg-[#05050A] rounded-xl border border-white/5 text-center">
          <span className="text-[9px] font-mono text-white/40 uppercase tracking-wider block">Completed</span>
          <span className="text-lg font-bold font-mono text-emerald-400 mt-0.5 block">{completedTasks.length}</span>
          <span className="text-[8.5px] text-slate-500 font-sans block">{pendingTasksCount} pending</span>
        </div>
        <div className="p-3 bg-[#05050A] rounded-xl border border-white/5 text-center">
          <span className="text-[9px] font-mono text-white/40 uppercase tracking-wider block">Focus Time</span>
          <span className="text-lg font-bold font-mono text-indigo-400 mt-0.5 block">{timeSaved}m</span>
          <span className="text-[8.5px] text-slate-500 font-sans block">allocated</span>
        </div>
        <div className="p-3 bg-[#05050A] rounded-xl border border-white/5 text-center">
          <span className="text-[9px] font-mono text-white/40 uppercase tracking-wider block">Habits Checked</span>
          <span className="text-lg font-bold font-mono text-purple-400 mt-0.5 block">
            {habits.filter(h => h.streak > 0).length} / {habits.length}
          </span>
          <span className="text-[8.5px] text-slate-500 font-sans block">active streaks</span>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {!report ? (
          <motion.div
            key="pre-generate"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-6 text-center"
          >
            <BarChart2 className="h-10 w-10 text-white/10 mb-2" />
            <p className="text-xs text-white/60 font-sans max-w-sm mb-4">
              Generate a behavioral report of your completed goals, habit streaks, and task resolutions compiled by your AI Life Saver Coordinator.
            </p>
            <button
              id="generate-review-btn"
              onClick={handleGenerateReport}
              disabled={loading}
              className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-semibold text-xs py-2 px-5 rounded-xl shadow-lg shadow-indigo-500/20 transition-all flex items-center space-x-1.5"
            >
              {loading ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  <span>Synthesizing Review Report...</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>Generate AI Weekly Review</span>
                </>
              )}
            </button>
            {error && <p className="text-[10px] text-red-400 mt-2 font-sans italic">⚠️ {error}</p>}
          </motion.div>
        ) : (
          <motion.div
            key="report-details"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            {/* AI Summary */}
            <div className="p-3 bg-indigo-500/5 border border-indigo-500/10 rounded-xl space-y-1">
              <span className="text-[9px] font-mono text-indigo-400 uppercase tracking-wider block font-bold">Coordinator Review</span>
              <p className="text-xs text-slate-200 leading-relaxed font-sans">{report.summary}</p>
            </div>

            {/* Strengths & Success Patterns */}
            <div className="space-y-2">
              <span className="text-[9px] font-mono text-white/40 uppercase tracking-wider block">Behavioral Strengths Spotted</span>
              <div className="grid grid-cols-1 gap-2">
                {report.strengths.map((strength, idx) => (
                  <div key={`strength-${idx}`} className="p-2.5 bg-[#05050A] border border-white/5 rounded-xl flex items-start space-x-2.5">
                    <CheckCircle className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span className="text-[11px] text-white/60 leading-relaxed font-sans">{strength}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* AI Recommendation */}
            <div className="p-3 bg-purple-500/5 border border-purple-500/10 rounded-xl space-y-1">
              <span className="text-[9px] font-mono text-purple-400 uppercase tracking-wider block font-bold flex items-center">
                <BookOpen className="h-3 w-3 mr-1" /> Next Week Strategy Recommendation
              </span>
              <p className="text-xs text-slate-300 leading-relaxed font-sans">{report.recommendation}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
