import React, { useState } from "react";
import { Calendar as CalendarIcon, Clock, ChevronLeft, ChevronRight, Bell } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface Task {
  id: string;
  title: string;
  completed: boolean;
  dueDate: string;
}

interface CalendarEvent {
  id: string;
  title: string;
  start: string;
}

interface MiniCalendarProps {
  tasks: Task[];
  events: CalendarEvent[];
}

export default function MiniCalendar({ tasks, events }: MiniCalendarProps) {
  // Use current local year and month (June 2026)
  const [currentYear, setCurrentYear] = useState(2026);
  const [currentMonth, setCurrentMonth] = useState(5); // June is index 5
  const [selectedDay, setSelectedDay] = useState<number | null>(23); // Default select 23rd

  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay();

  // Navigation handlers
  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
    setSelectedDay(null);
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
    setSelectedDay(null);
  };

  // Check if a specific date has any tasks or events
  const getDeadlinesForDay = (day: number) => {
    const dayDeadlines: { type: "task" | "event"; title: string; completed?: boolean; time?: string }[] = [];
    const dateStringStr = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

    // Filter tasks
    tasks.forEach((task) => {
      const taskDate = task.dueDate.split("T")[0];
      if (taskDate === dateStringStr) {
        let timeStr = "";
        try {
          const dt = new Date(task.dueDate);
          timeStr = dt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
        } catch (_) {}
        dayDeadlines.push({ type: "task", title: task.title, completed: task.completed, time: timeStr });
      }
    });

    // Filter events
    events.forEach((event) => {
      const eventDate = event.start.split("T")[0];
      if (eventDate === dateStringStr) {
        let timeStr = "";
        try {
          const dt = new Date(event.start);
          timeStr = dt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
        } catch (_) {}
        dayDeadlines.push({ type: "event", title: event.title, time: timeStr });
      }
    });

    return dayDeadlines;
  };

  const selectedDayDeadlines = selectedDay ? getDeadlinesForDay(selectedDay) : [];

  return (
    <div id="mini-calendar-widget" className="p-4 bg-[#0C0C18] border border-white/5 rounded-2xl relative overflow-hidden shadow-xl">
      <div className="absolute top-0 right-0 h-24 w-24 bg-indigo-500/5 blur-2xl pointer-events-none rounded-full" />
      
      <div className="flex items-center justify-between mb-3">
        <span className="text-[9px] font-mono uppercase tracking-wider text-white/40 flex items-center">
          <CalendarIcon className="h-3 w-3 mr-1 text-indigo-400" /> Deadline Calendar
        </span>
        <div className="flex items-center space-x-2">
          <button
            onClick={handlePrevMonth}
            className="p-1 rounded bg-[#05050A] border border-white/5 text-slate-400 hover:text-white hover:border-white/15 transition-all"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>
          <span className="text-xs font-mono font-bold text-slate-200">
            {months[currentMonth]} {currentYear}
          </span>
          <button
            onClick={handleNextMonth}
            className="p-1 rounded bg-[#05050A] border border-white/5 text-slate-400 hover:text-white hover:border-white/15 transition-all"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-mono text-white/40 mb-2 border-b border-white/5 pb-1">
        <span>Su</span><span>Mo</span><span>Tu</span><span>We</span><span>Th</span><span>Fr</span><span>Sa</span>
      </div>

      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: firstDayIndex }).map((_, idx) => (
          <div key={`empty-${idx}`} className="h-6 w-full" />
        ))}
        {Array.from({ length: daysInMonth }).map((_, idx) => {
          const day = idx + 1;
          const deadlines = getDeadlinesForDay(day);
          const hasDeadlines = deadlines.length > 0;
          const isSelected = selectedDay === day;
          const isToday = currentYear === 2026 && currentMonth === 5 && day === 23; // June 23, 2026

          return (
            <button
              key={`day-${day}`}
              onClick={() => setSelectedDay(day)}
              className={`h-7 w-full rounded-lg text-xs font-mono relative flex items-center justify-center transition-all ${
                isSelected
                  ? "bg-indigo-600 text-white font-bold shadow-lg shadow-indigo-500/20"
                  : isToday
                    ? "border border-indigo-400/50 text-indigo-400 font-bold bg-indigo-500/5"
                    : "text-slate-300 hover:bg-white/5"
              }`}
            >
              <span>{day}</span>
              
              {/* Highlight dot if has deadlines */}
              {hasDeadlines && !isSelected && (
                <span className={`absolute bottom-1 h-1 w-1 rounded-full ${
                  deadlines.some((d) => d.type === "task" && !d.completed) ? "bg-red-500" : "bg-indigo-400"
                }`} />
              )}
            </button>
          );
        })}
      </div>

      {/* Selected Day Deadlines Drawer */}
      <div className="mt-3.5 pt-3 border-t border-white/5">
        <AnimatePresence mode="wait">
          {selectedDay ? (
            <motion.div
              key={`deadlines-${selectedDay}`}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              className="space-y-1.5"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-sans font-semibold text-slate-400">
                  Deadlines for {months[currentMonth]} {selectedDay}
                </span>
                <span className="text-[9px] font-mono text-slate-500 bg-[#05050A] px-1.5 py-0.5 rounded border border-white/5">
                  {selectedDayDeadlines.length} items
                </span>
              </div>

              {selectedDayDeadlines.length > 0 ? (
                <div className="space-y-1.5 max-h-36 overflow-y-auto custom-scrollbar">
                  {selectedDayDeadlines.map((item, idx) => (
                    <div
                      key={`item-${idx}`}
                      className={`p-2 rounded-xl text-xs flex items-center justify-between border ${
                        item.type === "task"
                          ? item.completed
                            ? "bg-[#05050A]/40 border-white/5 text-slate-500"
                            : "bg-red-500/5 border-red-500/10 text-red-300"
                          : "bg-indigo-500/5 border-indigo-500/10 text-indigo-300"
                      }`}
                    >
                      <div className="flex items-center space-x-2 min-w-0 pr-2">
                        <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${
                          item.type === "task" ? (item.completed ? "bg-slate-600" : "bg-red-500") : "bg-indigo-400"
                        }`} />
                        <span className={`truncate font-sans ${item.completed ? "line-through text-slate-500" : "font-medium"}`}>
                          {item.title}
                        </span>
                      </div>
                      {item.time && (
                        <span className="text-[9px] font-mono text-slate-500 flex items-center space-x-0.5 shrink-0 bg-[#05050A] px-1.5 py-0.5 rounded border border-white/5">
                          <Clock className="h-2.5 w-2.5" />
                          <span>{item.time}</span>
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4 bg-[#05050A]/40 rounded-xl border border-dashed border-white/5">
                  <p className="text-[10px] text-slate-500 font-sans">No tasks or meetings scheduled. Rest day! 🎉</p>
                </div>
              )}
            </motion.div>
          ) : (
            <div className="text-center py-4 text-slate-500 text-[10px] font-sans">
              Select a date on the calendar grid to inspect deadlines.
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
