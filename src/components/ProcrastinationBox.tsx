import React, { useState } from "react";
import { type Task, type WorkMood } from "../types";
import { aiGetProcrastinationHelp, aiBreakTask } from "../lib/gemini";
import { HelpCircle, Sparkles, Smile, ArrowRight, Play, Loader, CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface ProcrastinationBoxProps {
  tasks: Task[];
  onAddSubsteps: (taskId: string, steps: { title: string; description: string; durationMinutes: number }[]) => void;
  onSelectMood: (mood: WorkMood) => void;
  currentMood: WorkMood;
}

export default function ProcrastinationBox({
  tasks,
  onAddSubsteps,
  onSelectMood,
  currentMood
}: ProcrastinationBoxProps) {
  const [selectedTaskId, setSelectedTaskId] = useState<string>("");
  const [loadingHelp, setLoadingHelp] = useState(false);
  const [loadingIce, setLoadingIce] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successTaskTitle, setSuccessTaskTitle] = useState("");
  const [insightData, setInsightData] = useState<{
    psychologicalInsight: string;
    microAction: string;
    motivationQuote: string;
    playlistSuggestion: string;
  } | null>(null);
  
  const [iceSteps, setIceSteps] = useState<{
    icebreaker: string;
    steps: { title: string; description: string; durationMinutes: number; completed: boolean }[];
  } | null>(null);

  const selectedTask = tasks.find(t => t.id === selectedTaskId);

  const handleGetHelp = async () => {
    if (!selectedTask) return;
    setLoadingHelp(true);
    setInsightData(null);
    setIceSteps(null);
    setShowSuccess(false);

    try {
      const res = await aiGetProcrastinationHelp(selectedTask, currentMood);
      setInsightData(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingHelp(false);
    }
  };

  const handleBreakTheIce = async () => {
    if (!selectedTask) return;
    setLoadingIce(true);
    setIceSteps(null);
    setShowSuccess(false);
    try {
      const res = await aiBreakTask(selectedTask.title, selectedTask.description);
      setIceSteps({
        icebreaker: res.icebreaker,
        steps: res.steps.map(s => ({ ...s, completed: false }))
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingIce(false);
    }
  };

  const toggleIceStep = (idx: number) => {
    if (!iceSteps) return;
    const nextSteps = [...iceSteps.steps];
    nextSteps[idx].completed = !nextSteps[idx].completed;
    setIceSteps({
      ...iceSteps,
      steps: nextSteps
    });
  };

  const handleCommitToTask = () => {
    if (!selectedTask || !iceSteps) return;
    onAddSubsteps(selectedTask.id, iceSteps.steps);
    setSuccessTaskTitle(selectedTask.title);
    setShowSuccess(true);
    setIceSteps(null);
    setInsightData(null);
    setSelectedTaskId("");
    setTimeout(() => {
      setShowSuccess(false);
    }, 4500);
  };

  return (
    <div id="procrastination-box" className="p-5 rounded-2xl border border-white/5 bg-[#0C0C18] relative overflow-hidden shadow-xl">
      <div className="absolute top-0 left-0 h-32 w-32 bg-amber-500/5 blur-3xl pointer-events-none rounded-full" />

      <div className="flex items-center space-x-2 mb-4">
        <HelpCircle className="h-5 w-5 text-amber-400 animate-pulse" />
        <h3 className="font-semibold text-sm tracking-wide text-slate-200">
          Procrastination Defeater
        </h3>
      </div>

      <p className="text-xs text-white/40 mb-4 font-sans leading-relaxed">
        Struggling to start? Perfectionism freeze? Select how you are feeling, choose the task you are avoiding, and let the Project Lifeline AI nudge you into action.
      </p>

      {/* Mood Selector */}
      <div className="mb-4">
        <label className="text-[10px] text-white/40 font-mono uppercase block mb-1.5">How are you feeling today?</label>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-1">
          {(["focused", "tired", "stressed", "overwhelmed", "creative", "neutral"] as WorkMood[]).map((m) => (
            <button
              id={`mood-btn-${m}`}
              key={m}
              onClick={() => onSelectMood(m)}
              className={`text-[10px] py-1 capitalize rounded border font-medium transition-all ${
                currentMood === m
                  ? "bg-amber-500/20 border-amber-500 text-amber-400 font-semibold shadow-md shadow-amber-500/10"
                  : "bg-[#05050A] border border-white/5 text-white/40 hover:border-white/10"
              }`}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      {/* Avoided Task Selector */}
      <div className="mb-4">
        <label className="text-[10px] text-white/40 font-mono uppercase block mb-1.5">What task are you avoiding?</label>
        <select
          id="avoided-task-select"
          value={selectedTaskId}
          onChange={(e) => {
            setSelectedTaskId(e.target.value);
            setInsightData(null);
            setIceSteps(null);
            setShowSuccess(false);
          }}
          className="w-full bg-[#05050A] border border-white/5 rounded-lg text-xs p-2.5 text-slate-300 focus:outline-none focus:border-amber-500/50"
        >
          <option value="">-- Choose an active task --</option>
          {tasks.filter(t => !t.completed).map(t => (
            <option key={t.id} value={t.id}>
              {t.title}
            </option>
          ))}
        </select>
      </div>

      {selectedTaskId && (
        <div className="flex space-x-2 mt-4">
          <button
            id="get-ai-intervention"
            onClick={handleGetHelp}
            disabled={loadingHelp}
            className="flex-1 bg-[#05050A] border border-white/5 hover:border-white/10 text-slate-300 text-[11px] py-2 px-3 rounded-lg font-medium transition-all flex items-center justify-center space-x-1 hover:bg-[#121225]"
          >
            {loadingHelp ? (
              <Loader className="h-3.5 w-3.5 animate-spin text-amber-400" />
            ) : (
              <Smile className="h-3.5 w-3.5 text-amber-400" />
            )}
            <span>AI Intervention</span>
          </button>

          <button
            id="break-the-ice-btn"
            onClick={handleBreakTheIce}
            disabled={loadingIce}
            className="flex-1 bg-gradient-to-r from-amber-600 to-amber-500 text-white hover:from-amber-500 hover:to-amber-400 text-[11px] py-2 px-3 rounded-lg font-semibold transition-all flex items-center justify-center space-x-1 shadow-lg shadow-amber-500/20"
          >
            {loadingIce ? (
              <Loader className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Sparkles className="h-3.5 w-3.5 fill-current" />
            )}
            <span>Break the Ice</span>
          </button>
        </div>
      )}

      {/* Success Notification Alert */}
      <AnimatePresence>
        {showSuccess && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mt-4 p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl text-xs flex items-start space-x-2 font-sans"
          >
            <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5 text-emerald-400" />
            <div>
              <p className="font-semibold">Action Steps Locked In!</p>
              <p className="text-[11px] text-emerald-400/80 mt-0.5">We broke down "{successTaskTitle}" and successfully injected these micro-actions into your active checklist.</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Interventions output */}
      {insightData && (
        <motion.div
          id="intervention-results"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 p-4 rounded-xl border border-white/5 bg-[#05050A]/80 text-xs space-y-3 shadow-inner"
        >
          <div>
            <span className="text-[9px] font-mono uppercase tracking-wider text-indigo-400 block mb-0.5">Psychological Insight</span>
            <p className="text-slate-300 italic font-sans">"{insightData.psychologicalInsight}"</p>
          </div>

          <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20">
            <span className="text-[9px] font-mono uppercase tracking-wider text-amber-400 block mb-0.5">2-Min Micro-Action</span>
            <p className="text-slate-200 font-medium">{insightData.microAction}</p>
          </div>

          <div className="border-t border-white/5 pt-2 flex items-center justify-between text-[11px] text-white/40 font-sans">
            <span>🎵 Focus Playlist Suggestion:</span>
            <span className="font-semibold text-slate-200">{insightData.playlistSuggestion}</span>
          </div>
        </motion.div>
      )}

      {/* Ice Steps breakdown */}
      {iceSteps && (
        <motion.div
          id="ice-steps-results"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 p-4 rounded-xl border border-amber-500/20 bg-[#05050A] text-xs space-y-3"
        >
          <div className="text-center pb-2 border-b border-white/5">
            <span className="text-[10px] text-amber-400 font-semibold italic font-sans">"{iceSteps.icebreaker}"</span>
          </div>

          <div className="space-y-2">
            <span className="text-[9px] font-mono uppercase text-white/30 block">Low-Friction Action Plan</span>
            {iceSteps.steps.map((step, idx) => (
              <div
                id={`ice-step-item-${idx}`}
                key={idx}
                onClick={() => toggleIceStep(idx)}
                className={`p-2 rounded-lg border transition-all cursor-pointer flex items-start space-x-2.5 ${
                  step.completed
                    ? "bg-[#05050A]/40 border-white/5 text-slate-500 line-through"
                    : "bg-[#0C0C18] border border-white/5 hover:border-white/10 text-slate-300"
                }`}
              >
                <button id={`toggle-ice-btn-${idx}`} className={`mt-0.5 rounded ${step.completed ? "text-emerald-500" : "text-slate-600"}`}>
                  <CheckCircle2 className="h-4 w-4" />
                </button>
                <div className="flex-1 min-w-0 font-sans">
                  <p className="font-semibold text-xs text-slate-200">{step.title}</p>
                  <p className="text-[10px] text-white/40 mt-0.5 leading-relaxed">{step.description}</p>
                  <span className="text-[9px] font-mono text-amber-500 mt-1 block">{step.durationMinutes} mins</span>
                </div>
              </div>
            ))}
          </div>

          <button
            id="commit-steps-btn"
            onClick={handleCommitToTask}
            className="w-full bg-[#0C0C18] hover:bg-[#121225] border border-white/5 text-slate-200 font-semibold py-2 px-3 rounded-lg text-xs transition-colors flex items-center justify-center space-x-1.5"
          >
            <span>Lock Steps Into Checklist</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </motion.div>
      )}
    </div>
  );
}
