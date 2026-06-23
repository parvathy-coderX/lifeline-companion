import React, { useState } from "react";
import { Sparkles, Brain, ClipboardList, Clock, ShieldCheck, RefreshCw, PlusCircle, Check } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface ExtractedTask {
  title: string;
  description: string;
  importance: "high" | "low";
  urgency: "high" | "low";
  duration: number;
  dueDate: string;
}

interface BrainDumpProps {
  onImportTasks: (tasks: ExtractedTask[]) => void;
}

export default function BrainDump({ onImportTasks }: BrainDumpProps) {
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ encouragement: string; tasks: ExtractedTask[] } | null>(null);
  const [importCompleted, setImportCompleted] = useState(false);

  const handleOrganize = async () => {
    if (!inputText.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    setImportCompleted(false);

    try {
      const response = await fetch("/api/gemini/brain-dump", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: inputText }),
      });

      if (!response.ok) {
        throw new Error("Failed to organize thoughts. Please try again.");
      }

      const data = await response.json();
      setResult(data);
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmImport = () => {
    if (!result || result.tasks.length === 0) return;
    onImportTasks(result.tasks);
    setImportCompleted(true);
    setInputText("");
    setTimeout(() => {
      setResult(null);
      setImportCompleted(false);
    }, 2500);
  };

  return (
    <div id="brain-dump-panel" className="p-5 rounded-2xl border border-white/5 bg-[#0C0C18] relative overflow-hidden shadow-xl">
      <div className="absolute top-0 right-0 h-32 w-32 bg-indigo-500/5 blur-3xl pointer-events-none rounded-full" />
      
      <div className="flex items-center space-x-2.5 mb-3">
        <div className="h-8 w-8 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
          <Brain className="h-4.5 w-4.5 animate-pulse" />
        </div>
        <div>
          <h3 className="text-sm font-extrabold text-slate-200 tracking-wide">Brain Dump Quick Capture</h3>
          <p className="text-[10px] text-white/40 font-sans">Dump all your messy thoughts. Our AI coordinator will sort them into prioritized, sized tasks.</p>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {!result ? (
          <motion.div
            key="input-stage"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-3"
          >
            <textarea
              id="brain-dump-textarea"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Example: I need to write that Biochem report before tomorrow noon, email Dr. Parvathy about lab results, and buy groceries. Also, remember to work on Lifeline logo designs this weekend..."
              className="w-full h-32 bg-[#05050A] border border-white/5 rounded-xl text-xs p-3 px-3.5 text-slate-200 focus:outline-none focus:border-indigo-500 placeholder-white/20 leading-relaxed resize-none custom-scrollbar"
            />
            
            <div className="flex justify-end">
              <button
                id="brain-dump-submit-btn"
                onClick={handleOrganize}
                disabled={loading || !inputText.trim()}
                className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-semibold text-xs py-2 px-4 rounded-xl shadow-lg shadow-indigo-500/20 transition-all flex items-center space-x-1.5"
              >
                {loading ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    <span>Sorting Brain Chaos...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="h-3.5 w-3.5" />
                    <span>Organize via AI Coordinator</span>
                  </>
                )}
              </button>
            </div>

            {error && (
              <p className="text-[10.5px] text-red-400 font-sans italic bg-red-500/5 p-2 rounded-lg border border-red-500/10">
                ⚠️ {error}
              </p>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="results-stage"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
          >
            {/* Encouragement message */}
            <div className="p-3 bg-indigo-500/5 border border-indigo-500/10 rounded-xl flex items-center space-x-2.5">
              <ShieldCheck className="h-4.5 w-4.5 text-indigo-400 shrink-0" />
              <p className="text-xs text-indigo-300 font-medium font-sans italic">"{result.encouragement}"</p>
            </div>

            {/* Extracted list */}
            <div className="space-y-2 max-h-56 overflow-y-auto custom-scrollbar pr-1">
              {result.tasks.map((task, idx) => {
                const isUrgent = task.urgency === "high";
                const isImportant = task.importance === "high";
                return (
                  <div
                    key={`dump-${idx}`}
                    className="p-3 bg-[#05050A] border border-white/5 rounded-xl flex flex-col justify-between"
                  >
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-slate-200 truncate">{task.title}</h4>
                      <div className="flex space-x-1">
                        <span className={`text-[8.5px] font-mono px-1.5 py-0.5 rounded ${
                          isUrgent ? "bg-red-500/10 text-red-400 border border-red-500/10" : "bg-slate-800 text-slate-400"
                        }`}>
                          {isUrgent ? "Urgent" : "Scheduled"}
                        </span>
                        <span className={`text-[8.5px] font-mono px-1.5 py-0.5 rounded ${
                          isImportant ? "bg-indigo-500/10 text-indigo-400 border border-indigo-500/10" : "bg-slate-800 text-slate-400"
                        }`}>
                          {isImportant ? "Important" : "Optional"}
                        </span>
                      </div>
                    </div>
                    {task.description && (
                      <p className="text-[10px] text-white/40 mt-1 leading-relaxed font-sans">{task.description}</p>
                    )}
                    <div className="flex items-center space-x-3 mt-2 text-[9px] font-mono text-white/30">
                      <span className="flex items-center">
                        <Clock className="h-3 w-3 mr-1 text-slate-500" /> {task.duration} mins
                      </span>
                      <span>Due: {task.dueDate.split("T")[0]}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex space-x-2 justify-end">
              <button
                onClick={() => setResult(null)}
                disabled={importCompleted}
                className="bg-transparent border border-white/10 hover:border-white/20 text-slate-400 hover:text-white font-semibold text-xs py-2 px-3 rounded-xl transition-all"
              >
                Start Over
              </button>
              
              <button
                onClick={handleConfirmImport}
                disabled={importCompleted}
                className={`font-semibold text-xs py-2 px-4 rounded-xl transition-all flex items-center space-x-1.5 ${
                  importCompleted
                    ? "bg-emerald-600 text-white shadow-lg shadow-emerald-500/20"
                    : "bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20"
                }`}
              >
                {importCompleted ? (
                  <>
                    <Check className="h-3.5 w-3.5" />
                    <span>Imported Successfully!</span>
                  </>
                ) : (
                  <>
                    <PlusCircle className="h-3.5 w-3.5" />
                    <span>Import {result.tasks.length} Tasks</span>
                  </>
                )}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
