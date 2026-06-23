import React from "react";
import { type DailyPlan, type HourlyActivity } from "../types";
import { Clock, Coffee, Brain, Calendar, ShieldAlert, Sparkles } from "lucide-react";
import { motion } from "motion/react";

interface ScheduleTimelineProps {
  plan: DailyPlan | null;
  onGeneratePlan: () => void;
  generating: boolean;
}

export default function ScheduleTimeline({ plan, onGeneratePlan, generating }: ScheduleTimelineProps) {
  
  const getActivityIcon = (type: HourlyActivity["type"]) => {
    switch (type) {
      case "deep-work":
        return <Brain className="h-4 w-4 text-indigo-400" />;
      case "break":
        return <Coffee className="h-4 w-4 text-emerald-400" />;
      case "habit":
        return <Sparkles className="h-4 w-4 text-amber-400" />;
      case "calendar-event":
        return <Calendar className="h-4 w-4 text-blue-400" />;
      default:
        return <Clock className="h-4 w-4 text-slate-400" />;
    }
  };

  const getActivityTypeStyles = (type: HourlyActivity["type"]) => {
    switch (type) {
      case "deep-work":
        return "bg-indigo-500/10 border-indigo-500/20 text-indigo-200 hover:border-indigo-500/40";
      case "break":
        return "bg-emerald-500/10 border-emerald-500/20 text-emerald-200 hover:border-emerald-500/40";
      case "habit":
        return "bg-amber-500/10 border-amber-500/20 text-amber-200 hover:border-amber-500/40";
      case "calendar-event":
        return "bg-blue-500/10 border-blue-500/20 text-blue-200 hover:border-blue-500/40";
      default:
        return "bg-[#05050A] border-white/5 text-slate-300 hover:border-white/10";
    }
  };

  return (
    <div id="schedule-timeline" className="p-5 rounded-2xl border border-white/5 bg-[#0C0C18] relative overflow-hidden h-full flex flex-col shadow-xl">
      <div className="absolute top-0 right-0 h-32 w-32 bg-indigo-500/5 blur-3xl pointer-events-none rounded-full" />

      <div className="flex items-center justify-between mb-4 pb-2 border-b border-white/5">
        <div className="flex items-center space-x-2">
          <Clock className="h-5 w-5 text-indigo-400 animate-pulse" />
          <h3 className="font-semibold text-sm tracking-wide text-slate-200 font-sans">
            AI Dynamic Daily Planner
          </h3>
        </div>
        
        {plan && (
          <div className="flex items-center space-x-1">
            <span className="text-[10px] text-white/40 font-mono">Predicted End-Of-Day Stress:</span>
            <span className={`text-[11px] font-mono font-bold ${
              plan.predictedStressScore <= 40 ? "text-emerald-400" : plan.predictedStressScore <= 70 ? "text-amber-400" : "text-red-400"
            }`}>
              {plan.predictedStressScore}%
            </span>
          </div>
        )}
      </div>

      {!plan ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
          <div className="h-12 w-12 rounded-full bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-4 animate-bounce">
            <Sparkles className="h-6 w-6 animate-pulse" />
          </div>
          <h4 className="text-sm font-semibold text-slate-200 mb-1 font-sans">No Daily Plan Generated Yet</h4>
          <p className="text-xs text-white/40 max-w-xs mb-6 font-sans leading-relaxed">
            Let Project Lifeline analyze your calendars, tasks, habits, and mood to build an optimal timeline.
          </p>
          <button
            id="plan-my-day-btn"
            onClick={onGeneratePlan}
            disabled={generating}
            className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold py-2.5 px-6 rounded-xl transition-all shadow-lg shadow-indigo-500/20"
          >
            {generating ? "AI Planning..." : "Plan My Day"}
          </button>
        </div>
      ) : (
        <div className="flex-1 flex flex-col space-y-4">
          {/* Encouragement */}
          <div className="p-3 bg-indigo-500/5 border border-indigo-500/10 rounded-xl">
            <span className="text-[9px] font-mono uppercase tracking-wider text-indigo-400 block mb-0.5">Morning Briefing</span>
            <p className="text-[11px] text-slate-300 italic">"{plan.morningEncouragement}"</p>
          </div>

          {/* Timeline Scrollable list */}
          <div className="flex-1 overflow-y-auto space-y-3 pr-1 max-h-[420px] custom-scrollbar">
            {plan.hourlySchedule.map((activity, index) => (
              <div
                id={`timeline-item-${index}`}
                key={index}
                className={`p-3 rounded-xl border flex items-start space-x-3 transition-all ${getActivityTypeStyles(activity.type)}`}
              >
                <div className="flex flex-col items-center justify-center p-1 bg-[#05050A] rounded-lg min-w-[56px] text-center border border-white/5">
                  <span className="text-[9px] font-mono text-indigo-400 font-bold uppercase">{activity.time}</span>
                  <span className="text-[8px] font-mono text-white/40 mt-0.5">{activity.durationMinutes}m</span>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-1.5">
                    {getActivityIcon(activity.type)}
                    <span className="font-semibold text-xs text-slate-100 truncate font-sans">
                      {activity.activityTitle}
                    </span>
                  </div>
                  {activity.tip && (
                    <p className="text-[10px] text-white/40 mt-1 leading-relaxed font-sans">
                      💡 {activity.tip}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>

          <button
            id="regenerate-plan-btn"
            onClick={onGeneratePlan}
            disabled={generating}
            className="w-full bg-[#05050A] border border-white/5 hover:border-white/10 hover:bg-[#121225] text-slate-300 text-xs font-semibold py-2.5 rounded-xl transition-all flex items-center justify-center space-x-1.5"
          >
            <Sparkles className="h-3.5 w-3.5 text-indigo-400 animate-pulse" />
            <span>{generating ? "Recalculating..." : "Optimize / Refresh Plan"}</span>
          </button>
        </div>
      )}
    </div>
  );
}
