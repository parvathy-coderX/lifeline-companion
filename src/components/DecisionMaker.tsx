import React, { useState } from "react";
import { type Decision } from "../types";
import { aiAnalyzeDecision } from "../lib/gemini";
import { HelpCircle, Check, X, ArrowRight, Loader, Award, ShieldAlert } from "lucide-react";
import { motion } from "motion/react";

export default function DecisionMaker() {
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [decisionResult, setDecisionResult] = useState<Decision | null>(null);
  const [history, setHistory] = useState<Decision[]>([]);

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim()) return;

    setLoading(true);
    setDecisionResult(null);

    try {
      const res = await aiAnalyzeDecision(question);
      setDecisionResult(res);
      setHistory(prev => [res, ...prev]);
      setQuestion("");
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="decision-maker-tool" className="p-5 rounded-2xl border border-white/5 bg-[#0C0C18] relative overflow-hidden shadow-xl">
      <div className="absolute top-0 right-0 h-32 w-32 bg-indigo-500/5 blur-3xl pointer-events-none rounded-full" />

      <div className="flex items-center space-x-2 mb-4">
        <HelpCircle className="h-5 w-5 text-indigo-400" />
        <h3 className="font-semibold text-sm tracking-wide text-slate-200">
          AI Decision Matrix
        </h3>
      </div>

      <p className="text-xs text-white/40 mb-4 font-sans leading-relaxed">
        Paralyzed by options? Type your crossroad dilemma (e.g. "Should I skip my workout to study?" or "Should I launch a private beta now?") and let AI analyze the outcomes.
      </p>

      <form id="decision-form" onSubmit={handleAnalyze} className="space-y-3">
        <div className="flex space-x-2">
          <input
            id="decision-input-field"
            type="text"
            required
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Should I..."
            className="flex-1 bg-[#05050A] border border-white/5 rounded-xl text-xs px-3.5 py-2.5 text-slate-200 placeholder-white/20 focus:outline-none focus:border-indigo-500"
          />
          <button
            id="decision-submit-btn"
            type="submit"
            disabled={loading}
            className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs px-4 py-2.5 rounded-xl transition-all flex items-center justify-center min-w-[90px] shadow-lg shadow-indigo-500/20"
          >
            {loading ? <Loader className="h-3.5 w-3.5 animate-spin" /> : "Analyze"}
          </button>
        </div>
      </form>

      {decisionResult && (
        <motion.div
          id="decision-result-card"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-5 space-y-4 border border-indigo-500/20 bg-[#05050A]/80 p-4 rounded-xl shadow-inner"
        >
          <div className="flex items-start justify-between pb-3 border-b border-white/5">
            <div>
              <span className="text-[9px] font-mono uppercase tracking-wider text-indigo-400">Dilemma Analyzed</span>
              <p className="font-semibold text-xs text-white mt-0.5">"{decisionResult.question}"</p>
            </div>
            <div className="text-right flex flex-col items-end">
              <span className="text-[9px] font-mono uppercase tracking-wider text-white/40">Confidence</span>
              <span className="text-sm font-bold text-emerald-400">{decisionResult.confidenceScore}%</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-emerald-500/5 p-3 rounded-lg border border-emerald-500/10 space-y-2">
              <span className="text-[9px] font-mono uppercase tracking-wider text-emerald-400 flex items-center">
                <Check className="h-3 w-3 mr-1" /> Pros
              </span>
              <ul className="space-y-1.5 text-[11px] text-slate-300 font-sans">
                {decisionResult.pros.map((pro, i) => (
                  <li key={i} className="flex items-start space-x-1.5">
                    <span className="text-emerald-500 mt-0.5">•</span>
                    <span>{pro}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-red-500/5 p-3 rounded-lg border border-red-500/10 space-y-2">
              <span className="text-[9px] font-mono uppercase tracking-wider text-red-400 flex items-center">
                <X className="h-3 w-3 mr-1" /> Cons
              </span>
              <ul className="space-y-1.5 text-[11px] text-slate-300 font-sans">
                {decisionResult.cons.map((con, i) => (
                  <li key={i} className="flex items-start space-x-1.5">
                    <span className="text-red-500 mt-0.5">•</span>
                    <span>{con}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="bg-indigo-500/10 p-3.5 rounded-lg border border-indigo-500/20 space-y-2 relative">
            <Award className="absolute right-3 top-3 h-8 w-8 text-indigo-400/10" />
            <div className="flex items-center space-x-1.5">
              <span className="text-[9px] font-mono uppercase tracking-wider text-indigo-400">AI Recommendation</span>
              <span className="text-[9px] bg-indigo-500/30 text-indigo-300 px-1.5 py-0.5 rounded font-mono uppercase">
                {decisionResult.priorityQuadrant}
              </span>
            </div>
            <p className="text-slate-200 text-[11.5px] leading-relaxed font-sans font-medium">
              {decisionResult.recommendation}
            </p>
          </div>
        </motion.div>
      )}

      {/* History */}
      {history.length > 1 && (
        <div className="mt-5 border-t border-white/5 pt-4">
          <span className="text-[9px] font-mono uppercase tracking-wider text-white/40 block mb-2">Previous Decisions</span>
          <div className="space-y-2 max-h-[140px] overflow-y-auto pr-1 custom-scrollbar">
            {history.slice(1).map((item) => (
              <div
                id={`history-decision-${item.id}`}
                key={item.id}
                onClick={() => setDecisionResult(item)}
                className="p-2 rounded bg-[#05050A] hover:bg-[#121225] text-[10px] text-white/50 cursor-pointer flex justify-between items-center border border-white/5"
              >
                <span className="truncate flex-1 pr-4">"{item.question}"</span>
                <span className="font-mono text-[9px] text-indigo-400 bg-indigo-950/40 px-1 py-0.25 rounded">{item.priorityQuadrant}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
