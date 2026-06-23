import React, { useState } from "react";
import { type CalendarEvent, type MeetingPrepData } from "../types";
import { aiPrepareMeeting } from "../lib/gemini";
import { Briefcase, List, Mail, MessageSquare, Clock, Copy, Check, Loader } from "lucide-react";
import { motion } from "motion/react";

interface MeetingPrepProps {
  events: CalendarEvent[];
}

export default function MeetingPrep({ events }: MeetingPrepProps) {
  const [selectedEventId, setSelectedEventId] = useState("");
  const [loading, setLoading] = useState(false);
  const [prepData, setPrepData] = useState<MeetingPrepData | null>(null);
  const [copied, setCopied] = useState(false);

  const selectedEvent = events.find(e => e.id === selectedEventId);

  const handleGeneratePrep = async () => {
    if (!selectedEvent) return;
    setLoading(true);
    setPrepData(null);

    try {
      const res = await aiPrepareMeeting(selectedEvent.title, selectedEvent.description);
      setPrepData(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyEmail = () => {
    if (!prepData) return;
    navigator.clipboard.writeText(prepData.emailDraft);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div id="meeting-prep-tool" className="p-5 rounded-2xl border border-white/5 bg-[#0C0C18] relative overflow-hidden h-full shadow-xl">
      <div className="absolute top-0 right-0 h-32 w-32 bg-indigo-500/5 blur-3xl pointer-events-none rounded-full" />

      <div className="flex items-center space-x-2 mb-4 pb-2 border-b border-white/5">
        <Briefcase className="h-5 w-5 text-indigo-400" />
        <h3 className="font-semibold text-sm tracking-wide text-slate-200 font-sans">
          Smart Meeting Prep Agent
        </h3>
      </div>

      <p className="text-xs text-white/40 mb-4 leading-relaxed font-sans">
        Walk into every meeting fully briefed. Select any event on your schedule, and the AI agent will instantly construct talking points, agendas, and a follow-up email brief.
      </p>

      <div className="space-y-4">
        {/* Selector */}
        <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
          <select
            id="meeting-event-select"
            value={selectedEventId}
            onChange={(e) => {
              setSelectedEventId(e.target.value);
              setPrepData(null);
            }}
            className="flex-1 bg-[#05050A] border border-white/5 rounded-xl text-xs p-2.5 text-slate-300 focus:outline-none focus:border-indigo-500"
          >
            <option value="">-- Choose an upcoming meeting --</option>
            {events.map(e => (
              <option key={e.id} value={e.id}>
                {e.title} ({new Date(e.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})
              </option>
            ))}
          </select>

          {selectedEventId && (
            <button
              id="generate-prep-btn"
              onClick={handleGeneratePrep}
              disabled={loading}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs px-4 py-2.5 rounded-xl transition-all flex items-center justify-center space-x-1 shadow-lg shadow-indigo-500/20"
            >
              {loading ? (
                <>
                  <Loader className="h-3.5 w-3.5 animate-spin mr-1.5" />
                  <span>Preparing...</span>
                </>
              ) : (
                <span>AI Briefing</span>
              )}
            </button>
          )}
        </div>

        {prepData && (
          <motion.div
            id="prep-results-card"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            {/* Quick stats */}
            <div className="flex items-center space-x-2 text-[10px] text-indigo-400 font-mono bg-indigo-500/10 p-2.5 border border-indigo-500/20 rounded-xl">
              <Clock className="h-3.5 w-3.5 animate-pulse" />
              <span>Recommended prep duration: <b>{prepData.estimatedDuration} mins</b> to master this briefing.</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Agenda */}
              <div className="bg-[#05050A]/80 p-3.5 rounded-xl border border-white/5 space-y-2">
                <span className="text-[10px] font-mono uppercase tracking-wider text-indigo-400 flex items-center">
                  <List className="h-3.5 w-3.5 mr-1" /> Meeting Agenda
                </span>
                <ul className="space-y-2 text-[11px] text-slate-300">
                  {prepData.agenda.map((item, idx) => (
                    <li key={idx} className="flex items-start space-x-2">
                      <span className="text-indigo-400 font-bold font-mono">0{idx + 1}.</span>
                      <span className="leading-relaxed">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Talking Points */}
              <div className="bg-[#05050A]/80 p-3.5 rounded-xl border border-white/5 space-y-2">
                <span className="text-[10px] font-mono uppercase tracking-wider text-indigo-400 flex items-center">
                  <MessageSquare className="h-3.5 w-3.5 mr-1" /> Key Talking Points
                </span>
                <ul className="space-y-2 text-[11px] text-slate-300">
                  {prepData.talkingPoints.map((item, idx) => (
                    <li key={idx} className="flex items-start space-x-2">
                      <span className="text-emerald-400 font-bold font-mono">•</span>
                      <span className="leading-relaxed font-sans">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Email Draft */}
            <div className="bg-[#05050A]/80 rounded-xl border border-white/5 overflow-hidden">
              <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-white/5 bg-[#05050A]">
                <span className="text-[10px] font-mono uppercase tracking-wider text-white/40 flex items-center">
                  <Mail className="h-3.5 w-3.5 mr-1" /> Pre/Post Email Draft
                </span>
                <button
                  id="copy-email-btn"
                  onClick={handleCopyEmail}
                  className="text-[10px] text-indigo-400 hover:text-indigo-300 flex items-center space-x-1"
                >
                  {copied ? (
                    <>
                      <Check className="h-3 w-3 text-emerald-400" />
                      <span className="text-emerald-400">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3 w-3" />
                      <span>Copy template</span>
                    </>
                  )}
                </button>
              </div>
              <div className="p-3.5">
                <textarea
                  id="email-draft-text-area"
                  readOnly
                  value={prepData.emailDraft}
                  className="w-full bg-[#0C0C18] border border-white/5 rounded-lg text-[10.5px] p-2.5 text-slate-300 font-mono resize-none h-[140px] focus:outline-none focus:border-indigo-500/50"
                />
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
