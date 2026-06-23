import React, { useState, useEffect } from "react";
import { type Task } from "../types";
import { AlertCircle, Calendar, CheckCircle, Trash2, Zap, Sparkles, Star, Award } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface EisenhowerMatrixProps {
  tasks: Task[];
  onToggleComplete: (id: string) => void;
  onDeleteTask: (id: string) => void;
  onSelectTask: (task: Task) => void;
}

function UrgentCountdown({ dueDate }: { dueDate: string }) {
  const [timeLeft, setTimeLeft] = useState("");

  useEffect(() => {
    const updateCountdown = () => {
      const diff = new Date(dueDate).getTime() - Date.now();
      if (diff <= 0) {
        setTimeLeft("00:00:00");
        return;
      }
      const hrs = Math.floor(diff / (1000 * 60 * 60));
      const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const secs = Math.floor((diff % (1000 * 60)) / 1000);

      const pad = (n: number) => String(n).padStart(2, "0");
      setTimeLeft(`${pad(hrs)}:${pad(mins)}:${pad(secs)}`);
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [dueDate]);

  return (
    <span className="flex items-center text-red-400 font-mono text-[9.5px] bg-red-950/40 border border-red-500/20 px-1.5 py-0.5 rounded animate-pulse shadow-sm">
      <AlertCircle className="h-3 w-3 mr-1 text-red-400 animate-spin-slow shrink-0" />
      <span>{timeLeft}</span>
    </span>
  );
}

export default function EisenhowerMatrix({
  tasks,
  onToggleComplete,
  onDeleteTask,
  onSelectTask
}: EisenhowerMatrixProps) {
  
  const getQuadrantTasks = (quadrant: string) => {
    return tasks.filter(t => t.matrixQuadrant === quadrant);
  };

  const quadrantStyle = (quad: string) => {
    switch (quad) {
      case "urgent-important":
        return {
          bg: "bg-red-500/10",
          border: "border-red-500/30",
          badge: "bg-red-500/20 text-red-400 border border-red-500/40",
          titleColor: "text-red-400",
          label: "Urgent & Important",
          desc: "Do First — Critical Deadlines"
        };
      case "not-urgent-important":
        return {
          bg: "bg-indigo-500/10",
          border: "border-indigo-500/30",
          badge: "bg-indigo-500/20 text-indigo-400 border border-indigo-500/40",
          titleColor: "text-indigo-400",
          label: "Important, Not Urgent",
          desc: "Schedule — Long-term Goals"
        };
      case "urgent-not-important":
        return {
          bg: "bg-amber-500/10",
          border: "border-amber-500/30",
          badge: "bg-amber-500/20 text-amber-400 border border-amber-500/40",
          titleColor: "text-amber-400",
          label: "Urgent, Not Important",
          desc: "Delegate/Minimize — Interruptions"
        };
      case "not-urgent-not-important":
      default:
        return {
          bg: "bg-slate-500/10",
          border: "border-slate-500/30",
          badge: "bg-slate-500/20 text-slate-400 border border-slate-500/40",
          titleColor: "text-slate-400",
          label: "Not Urgent & Not Important",
          desc: "Eliminate — Low-Value Activities"
        };
    }
  };

  const renderQuadrant = (quadrantKey: "urgent-important" | "not-urgent-important" | "urgent-not-important" | "not-urgent-not-important") => {
    const style = quadrantStyle(quadrantKey);
    const qTasks = getQuadrantTasks(quadrantKey);

    return (
      <div id={`quadrant-${quadrantKey}`} className={`flex flex-col h-[280px] p-4 rounded-xl border ${style.bg} ${style.border} transition-all duration-300 hover:shadow-lg hover:shadow-indigo-500/5`}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex flex-col">
            <span className={`text-sm font-semibold font-sans tracking-wide ${style.titleColor}`}>
              {style.label}
            </span>
            <span className="text-xs text-white/40 font-sans mt-0.5">{style.desc}</span>
          </div>
          <span className={`text-xs px-2 py-0.5 rounded-full ${style.badge}`}>
            {qTasks.length} {qTasks.length === 1 ? "task" : "tasks"}
          </span>
        </div>

        <div className="flex-1 overflow-y-auto space-y-2 mt-2 pr-1 custom-scrollbar">
          {qTasks.length === 0 ? (
            <div className="h-full flex items-center justify-center text-xs text-white/30 border border-dashed border-white/5 rounded-lg p-4">
              No tasks in this quadrant
            </div>
          ) : (
            <div className="space-y-2">
              <AnimatePresence initial={false}>
                {qTasks.map(task => {
                  const dueHours = Math.max(
                    0,
                    Math.round((new Date(task.dueDate).getTime() - Date.now()) / (1000 * 60 * 60))
                  );
                  const isDueSoon = dueHours < 24 && !task.completed;

                  return (
                    <motion.div
                      key={task.id}
                      layout
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ type: "spring", stiffness: 500, damping: 30 }}
                      className="relative overflow-hidden rounded-lg group"
                    >
                      {/* Slide-to-complete indicator layer underneath */}
                      {!task.completed && (
                        <div className="absolute inset-0 bg-emerald-500/20 border border-emerald-500/30 rounded-lg flex items-center pl-3.5 text-emerald-400 font-mono text-[9.5px] font-bold pointer-events-none select-none z-0">
                          <CheckCircle className="h-4 w-4 mr-1.5 text-emerald-400 animate-pulse shrink-0" />
                          <span>Release to Complete →</span>
                        </div>
                      )}

                      <motion.div
                        id={`task-item-${task.id}`}
                        layoutId={task.id}
                        drag={task.completed ? false : "x"}
                        dragConstraints={{ left: 0, right: 120 }}
                        dragElastic={{ left: 0.05, right: 0.2 }}
                        onDragEnd={(e, info) => {
                          if (info.offset.x > 75) {
                            onToggleComplete(task.id);
                          }
                        }}
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.99 }}
                        className={`relative z-10 p-2.5 rounded-lg border text-xs cursor-pointer flex items-center justify-between transition-colors ${
                          task.completed
                            ? "bg-[#05050A]/40 border-white/5 text-slate-500 line-through"
                            : "bg-[#0C0C18] border border-white/5 hover:border-white/10 hover:bg-[#121225] text-slate-200"
                        }`}
                        onClick={() => onSelectTask(task)}
                      >
                        <div className="flex items-center space-x-2.5 mr-2 min-w-0 flex-1">
                          <div className="relative flex items-center justify-center shrink-0 w-6 h-6">
                            <button
                              id={`toggle-btn-${task.id}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                onToggleComplete(task.id);
                              }}
                              className={`p-1 rounded-full relative z-10 hover:scale-110 active:scale-90 transition-all ${
                                task.completed ? "text-emerald-500 hover:text-emerald-400" : "text-slate-500 hover:text-indigo-400"
                              }`}
                            >
                              {task.completed ? (
                                <CheckCircle className="h-4 w-4 fill-emerald-500/10" />
                              ) : (
                                <div className="h-4 w-4 rounded-full border border-white/20 hover:border-indigo-400 flex items-center justify-center text-[7.5px] font-mono font-bold text-indigo-400 transition-colors">
                                  {task.progress > 0 ? `${task.progress}` : ""}
                                </div>
                              )}
                            </button>

                            {/* Dynamic Progress Ring surrounding the button */}
                            {!task.completed && (
                              <svg className="absolute inset-0 h-6 w-6 transform -rotate-90 pointer-events-none">
                                <circle
                                  cx="12"
                                  cy="12"
                                  r="9"
                                  className="stroke-white/5"
                                  strokeWidth="1.5"
                                  fill="transparent"
                                />
                                <motion.circle
                                  cx="12"
                                  cy="12"
                                  r="9"
                                  className="stroke-indigo-500"
                                  strokeWidth="1.5"
                                  fill="transparent"
                                  strokeLinecap="round"
                                  strokeDasharray={2 * Math.PI * 9}
                                  initial={{ strokeDashoffset: 2 * Math.PI * 9 }}
                                  animate={{ strokeDashoffset: 2 * Math.PI * 9 - (task.progress / 100) * 2 * Math.PI * 9 }}
                                  transition={{ duration: 0.8, ease: "easeInOut" }}
                                />
                              </svg>
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium truncate text-xs group-hover:text-white transition-colors">{task.title}</p>
                            <div className="flex items-center space-x-1.5 mt-1 text-[10px] text-white/40">
                              {isDueSoon ? (
                                <UrgentCountdown dueDate={task.dueDate} />
                              ) : (
                                <span className="flex items-center font-mono">
                                  <Calendar className="h-2.5 w-2.5 mr-0.5 text-slate-500" />
                                  {new Date(task.dueDate).toLocaleDateString()}
                                </span>
                              )}
                              {task.stressReduction && (
                                <span className="flex items-center text-indigo-400 font-mono bg-indigo-950/20 px-1 py-0.25 rounded border border-indigo-500/10">
                                  <Zap className="h-2.5 w-2.5 mr-0.5 text-indigo-400" />
                                  -{task.stressReduction}% stress
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <button
                          id={`delete-btn-${task.id}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteTask(task.id);
                          }}
                          className="text-slate-600 hover:text-red-400 hover:scale-110 active:scale-90 p-1 rounded transition-all"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </motion.div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>
    );
  };

  const totalIncomplete = tasks.filter(t => !t.completed).length;
  const totalCompleted = tasks.filter(t => t.completed).length;

  return (
    <div className="space-y-4">
      {/* Celebration card if all tasks are complete */}
      {totalIncomplete === 0 && tasks.length > 0 && (
        <motion.div
          id="all-completed-celebration-banner"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-5 rounded-2xl bg-gradient-to-r from-emerald-950/30 via-[#0C0C18] to-[#0A0A14] border border-emerald-500/20 flex flex-col sm:flex-row items-center justify-between shadow-xl relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 h-32 w-32 bg-emerald-500/5 blur-3xl pointer-events-none rounded-full" />
          <div className="flex items-center space-x-3.5 mb-3 sm:mb-0">
            <div className="h-11 w-11 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 animate-bounce">
              <Sparkles className="h-6 w-6 animate-pulse" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white tracking-wide flex items-center">
                All Systems Clear! 
                <span className="ml-1.5 text-xs text-emerald-400 font-mono bg-emerald-500/10 px-1.5 py-0.25 rounded border border-emerald-500/20">
                  {totalCompleted} Completed
                </span>
              </h3>
              <p className="text-[11px] text-white/50">You have zero outstanding tasks. That is a perfect workflow execution!</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-[10px] text-emerald-400/80 font-mono font-bold animate-pulse">
              ★ Task Lifeline Integrity: 100%
            </span>
          </div>
        </motion.div>
      )}

      <div id="eisenhower-matrix-container" className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {renderQuadrant("urgent-important")}
        {renderQuadrant("not-urgent-important")}
        {renderQuadrant("urgent-not-important")}
        {renderQuadrant("not-urgent-not-important")}
      </div>
    </div>
  );
}
