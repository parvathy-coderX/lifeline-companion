import React from "react";
import { motion } from "motion/react";
import { AlertTriangle, Activity, CheckCircle, Flame } from "lucide-react";

interface Task {
  id: string;
  title: string;
  completed: boolean;
  importance: "high" | "low";
  urgency: "high" | "low";
  matrixQuadrant?: string;
}

interface StressMeterProps {
  tasks: Task[];
}

export default function StressMeter({ tasks }: StressMeterProps) {
  const pendingTasks = tasks.filter((t) => !t.completed);
  
  // Dynamic Stress Calculation Formula based on urgency/importance of pending tasks
  let calculatedStress = 15; // Base resting stress
  pendingTasks.forEach((task) => {
    if (task.importance === "high" && task.urgency === "high") {
      calculatedStress += 20; // Critical Now
    } else if (task.importance === "high" && task.urgency === "low") {
      calculatedStress += 12; // Important, Not Urgent
    } else if (task.importance === "low" && task.urgency === "high") {
      calculatedStress += 8;  // Urgent, Not Important
    } else {
      calculatedStress += 4;  // Low priority
    }
  });

  const stressScore = Math.min(100, Math.max(10, calculatedStress));

  // Determine stress profile and colors
  let colorClass = "text-emerald-400";
  let strokeColor = "#10B981"; // Emerald
  let glowColor = "rgba(16, 185, 129, 0.2)";
  let statusText = "Optimal & Relaxed";
  let advice = "Your mind is clear and task load is perfectly manageable. Excellent window for deep planning, self-care, or launching creative endeavors.";

  if (stressScore >= 75) {
    colorClass = "text-red-400 animate-pulse";
    strokeColor = "#EF4444"; // Red
    glowColor = "rgba(239, 68, 68, 0.4)";
    statusText = "Overload Red Alert";
    advice = "Crisis risk is highly elevated! We strongly suggest freezing low-importance tasks, splitting big tasks, and scheduling a mandatory 5-minute breathing screen.";
  } else if (stressScore >= 40) {
    colorClass = "text-amber-400";
    strokeColor = "#F59E0B"; // Amber
    glowColor = "rgba(245, 158, 11, 0.2)";
    statusText = "Moderate Cognitive Load";
    advice = "Deadlines are piling up. Break down your next task to prevent procrastination freeze, and use white noise background synthesis to block distractions.";
  }

  // Semi-circle meter parameters
  const radius = 50;
  const strokeWidth = 8;
  const circumference = 2 * Math.PI * radius;
  const halfCircumference = circumference / 2;
  const strokeDashoffset = halfCircumference - (stressScore / 100) * halfCircumference;

  return (
    <div id="dynamic-stress-meter" className="p-4 bg-[#0C0C18] border border-white/5 rounded-2xl relative overflow-hidden shadow-xl">
      <div className="absolute top-0 left-0 h-24 w-24 bg-red-500/5 blur-2xl pointer-events-none rounded-full" />
      
      <div className="flex items-center justify-between mb-4">
        <span className="text-[9px] font-mono uppercase tracking-wider text-white/40 flex items-center">
          <Activity className="h-3 w-3 mr-1 text-indigo-400" /> Estimated Stress Meter
        </span>
        <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded-full ${
          stressScore >= 75 ? "bg-red-500/15 text-red-400" : stressScore >= 40 ? "bg-amber-500/15 text-amber-400" : "bg-emerald-500/15 text-emerald-400"
        }`}>
          {statusText}
        </span>
      </div>

      <div className="flex flex-col items-center justify-center py-2 relative">
        {/* SVG Arc Gauge */}
        <div className="relative w-40 h-24 flex items-center justify-center">
          <svg className="absolute top-0 left-0 w-full h-full transform rotate-180" viewBox="0 0 120 70">
            {/* Background Arch */}
            <path
              d="M 10 60 A 50 50 0 0 1 110 60"
              fill="none"
              stroke="rgba(255, 255, 255, 0.05)"
              strokeWidth={strokeWidth}
              strokeLinecap="round"
            />
            {/* Active Colored Arch */}
            <motion.path
              d="M 10 60 A 50 50 0 0 1 110 60"
              fill="none"
              stroke={strokeColor}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeDasharray={halfCircumference}
              initial={{ strokeDashoffset: halfCircumference }}
              animate={{ strokeDashoffset }}
              transition={{ duration: 1.2, ease: "easeOut" }}
              style={{ filter: `drop-shadow(0 0 4px ${strokeColor})` }}
            />
          </svg>
          
          <div className="text-center mt-6">
            <span className={`text-3xl font-mono font-extrabold ${colorClass}`}>
              {stressScore}%
            </span>
            <span className="text-[9px] font-mono text-white/30 block tracking-wider uppercase mt-0.5">Cognitive Strain</span>
          </div>
        </div>

        {/* Dynamic Context Advice Box */}
        <div className="w-full mt-3 p-3 rounded-xl bg-[#05050A] border border-white/5 flex items-start space-x-2.5">
          <div className="shrink-0 mt-0.5">
            {stressScore >= 75 ? (
              <Flame className="h-4 w-4 text-red-400 animate-pulse" />
            ) : stressScore >= 40 ? (
              <AlertTriangle className="h-4 w-4 text-amber-400" />
            ) : (
              <CheckCircle className="h-4 w-4 text-emerald-400" />
            )}
          </div>
          <div className="space-y-1">
            <h4 className="text-[11px] font-bold text-slate-200">Coach Guidance</h4>
            <p className="text-[10px] text-white/50 leading-relaxed font-sans">{advice}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
