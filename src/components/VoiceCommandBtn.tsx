import React, { useState, useEffect } from "react";
import { Mic, MicOff, Play, Loader, Volume2, HelpCircle } from "lucide-react";
import { aiParseVoiceTask } from "../lib/gemini";
import { type Task } from "../types";

interface VoiceCommandBtnProps {
  onParsedTask: (taskData: Omit<Task, "id" | "completed" | "progress">) => void;
}

const TEMPLATE_VOICE_COMMANDS = [
  "Finish the slide deck for chemistry project by tomorrow 4 PM",
  "Urgent: pay electric bill tonight",
  "Prepare talking points for the pitch on Friday at noon",
  "Research competitors for focus study tomorrow morning"
];

export default function VoiceCommandBtn({ onParsedTask }: VoiceCommandBtnProps) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [loading, setLoading] = useState(false);
  const [recognition, setRecognition] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    // Check for browser speech recognition
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang = "en-US";

      rec.onstart = () => {
        setIsListening(true);
        setErrorMsg("");
      };

      rec.onresult = (e: any) => {
        const text = e.results[0][0].transcript;
        setTranscript(text);
        setIsListening(false);
      };

      rec.onerror = (e: any) => {
        console.error("Speech recognition error:", e.error);
        setIsListening(false);
        if (e.error === "not-allowed") {
          setErrorMsg("Microphone permission denied. Use template shortcuts below.");
        } else {
          setErrorMsg(`Error: ${e.error}. Try a text command instead.`);
        }
      };

      rec.onend = () => {
        setIsListening(false);
      };

      setRecognition(rec);
    }
  }, []);

  const handleToggleListening = () => {
    if (!recognition) {
      setErrorMsg("Speech recognition is not supported in this browser. Please use the text inputs.");
      return;
    }

    if (isListening) {
      recognition.stop();
    } else {
      setTranscript("");
      setErrorMsg("");
      try {
        recognition.start();
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleParse = async (textToParse: string) => {
    if (!textToParse.trim()) return;

    setLoading(true);
    setErrorMsg("");

    try {
      const parsed = await aiParseVoiceTask(textToParse);
      onParsedTask(parsed);
      setTranscript("");
    } catch (err: any) {
      console.error(err);
      setErrorMsg(`Failed to parse: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Speak a reminder out loud (TTS)
  const handleReadAloud = (taskText: string) => {
    if ("speechSynthesis" in window) {
      const utterance = new SpeechSynthesisUtterance(`Project Lifeline Reminder: ${taskText}`);
      utterance.rate = 0.95;
      utterance.pitch = 1.0;
      window.speechSynthesis.speak(utterance);
    } else {
      console.warn("Text-to-speech is not supported in this browser.");
    }
  };

  return (
    <div id="voice-assistant-panel" className="p-5 rounded-2xl border border-white/5 bg-[#0C0C18] relative overflow-hidden shadow-xl">
      <div className="absolute top-0 left-0 h-32 w-32 bg-indigo-500/5 blur-3xl pointer-events-none rounded-full" />

      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <Volume2 className="h-5 w-5 text-indigo-400" />
          <h3 className="font-semibold text-sm tracking-wide text-slate-200">
            Voice Assistant ("Hey Lifeline")
          </h3>
        </div>
        {recognition && (
          <span className="text-[10px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded font-mono">
            Mic Enabled
          </span>
        )}
      </div>

      <p className="text-xs text-white/40 mb-4 leading-relaxed font-sans">
        Add tasks hands-free using natural language! Press the mic icon, say what you need to do, or click a template shortcut below to see the AI dynamically extract schedule dates.
      </p>

      <div className="flex items-center space-x-3 mb-4">
        <button
          id="toggle-mic-btn"
          onClick={handleToggleListening}
          className={`p-4 rounded-full transition-all flex items-center justify-center border ${
            isListening
              ? "bg-red-500/20 border-red-500 text-red-400 animate-pulse"
              : "bg-[#05050A] border border-white/5 text-white/40 hover:border-white/10 hover:text-white"
          }`}
          title="Toggle voice dictation"
        >
          {isListening ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
        </button>

        <div className="flex-1 min-w-0">
          <textarea
            id="voice-transcript-area"
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
            placeholder={isListening ? "Listening... Speak now." : "Dictated text will appear here. You can also type directly."}
            className="w-full bg-[#05050A] border border-white/5 rounded-xl text-xs p-2.5 text-slate-200 placeholder-white/20 focus:outline-none focus:border-indigo-500 resize-none h-[46px]"
          />
        </div>

        {transcript && (
          <button
            id="parse-voice-btn"
            onClick={() => handleParse(transcript)}
            disabled={loading}
            className="bg-indigo-600 hover:bg-indigo-500 text-white p-3 rounded-full transition-all flex items-center justify-center shadow-lg shadow-indigo-500/20"
          >
            {loading ? <Loader className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4 fill-current" />}
          </button>
        )}
      </div>

      {errorMsg && (
        <div className="text-[11px] text-red-400 bg-red-500/5 p-2 rounded-lg border border-red-500/10 mb-4 font-sans">
          {errorMsg}
        </div>
      )}

      {/* Shortcuts */}
      <div className="space-y-2">
        <span className="text-[9px] font-mono uppercase tracking-wider text-white/40 flex items-center">
          <HelpCircle className="h-3 w-3 mr-1" /> Tap a Natural Command to Test
        </span>
        <div className="grid grid-cols-1 gap-1.5">
          {TEMPLATE_VOICE_COMMANDS.map((cmd, idx) => (
            <div
              id={`voice-template-item-${idx}`}
              key={idx}
              className="flex items-center justify-between p-2 rounded-lg bg-[#05050A]/60 hover:bg-[#05050A] border border-white/5 hover:border-white/10 text-[10.5px] transition-all text-slate-300 cursor-pointer"
              onClick={() => handleParse(cmd)}
            >
              <span className="truncate flex-1 pr-4 italic font-sans">"{cmd}"</span>
              <button
                id={`voice-template-tts-btn-${idx}`}
                onClick={(e) => {
                  e.stopPropagation();
                  handleReadAloud(cmd);
                }}
                className="text-white/40 hover:text-indigo-400 font-semibold px-2 py-0.5 rounded font-mono text-[9px] uppercase hover:bg-indigo-500/10 transition-colors"
                title="Read reminder aloud using TTS"
              >
                Hear Voice
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
