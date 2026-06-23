import React, { useState, useEffect, useRef } from "react";
import { Play, Pause, RotateCcw, Volume2, VolumeX, Flame, Coffee, HelpCircle } from "lucide-react";

interface PomodoroTimerProps {
  taskTitle?: string;
  defaultTimeMinutes?: number;
}

type TimerMode = "focus" | "short-break" | "long-break";

const BREAK_SUGGESTIONS = [
  "💧 Hydration & Movement: Walk around for 2 minutes and drink a full glass of water. This resets physical fatigue.",
  "🧘 Eye Rest & Breathing: Look at an object 20 feet away for 20 seconds (the 20-20-20 rule). Inhale deeply to oxygenate your brain.",
  "🤸 Posture Stretch: Stand up and interlock your fingers behind your back. Stretch backwards for 30 seconds.",
  "☕ Mental Reboot: Step away from screens completely. Close your eyes and count backwards from 30.",
  "🚶 Dynamic Step Refresh: Do a quick 2-minute lap around your room or hallway to circulate blood flow."
];

export default function PomodoroTimer({ taskTitle, defaultTimeMinutes = 25 }: PomodoroTimerProps) {
  const [mode, setMode] = useState<TimerMode>("focus");
  const [timeLeft, setTimeLeft] = useState(defaultTimeMinutes * 60);
  const [isActive, setIsActive] = useState(false);
  const [soundType, setSoundType] = useState<"none" | "white" | "pink" | "brown">("none");
  const [volume, setVolume] = useState(0.5);
  const [isFocusSprint, setIsFocusSprint] = useState(true);
  const [suggestionIdx, setSuggestionIdx] = useState(0);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Audio Web Synth refs
  const audioCtxRef = useRef<AudioContext | null>(null);
  const noiseNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);

  // Sync with defaultTimeMinutes if changed from prop
  useEffect(() => {
    if (mode === "focus") {
      setTimeLeft(defaultTimeMinutes * 60);
    }
  }, [defaultTimeMinutes, mode]);

  // Handle countdown
  useEffect(() => {
    if (isActive && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      // Alarm (Concept/Flash)
      setIsActive(false);
      handleModeComplete();
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isActive, timeLeft]);

  // Clean up audio on unmount
  useEffect(() => {
    return () => {
      stopAmbientNoise();
    };
  }, []);

  const handleModeComplete = () => {
    if (mode === "focus") {
      setMode("short-break");
      setTimeLeft(5 * 60);
      setSuggestionIdx((prev) => (prev + 1) % BREAK_SUGGESTIONS.length);
    } else {
      setMode("focus");
      setTimeLeft(defaultTimeMinutes * 60);
    }
  };

  const toggleTimer = () => {
    setIsActive(!isActive);
  };

  const resetTimer = () => {
    setIsActive(false);
    if (mode === "focus") {
      setTimeLeft(defaultTimeMinutes * 60);
    } else if (mode === "short-break") {
      setTimeLeft(5 * 60);
    } else {
      setTimeLeft(15 * 60);
    }
  };

  const changeMode = (newMode: TimerMode) => {
    setIsActive(false);
    setMode(newMode);
    if (newMode === "focus") {
      setTimeLeft(defaultTimeMinutes * 60);
    } else if (newMode === "short-break") {
      setTimeLeft(5 * 60);
    } else {
      setTimeLeft(15 * 60);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // WEB AUDIO NOISE GENERATOR
  const playAmbientNoise = (type: "white" | "pink" | "brown") => {
    stopAmbientNoise();

    if (!audioCtxRef.current) {
      // Use fallback AudioContext across modern browsers safely
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      audioCtxRef.current = new AudioCtxClass();
    }

    const ctx = audioCtxRef.current;
    if (ctx.state === "suspended") {
      ctx.resume();
    }

    const bufferSize = 2 * ctx.sampleRate;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);

    let lastOut = 0.0; // pink noise state variables
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0; // multi-pole filter states

    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      
      if (type === "white") {
        output[i] = white;
      } else if (type === "pink") {
        // Pink noise approximation (Voss-McCartney algorithm / filter approximation)
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        b3 = 0.86650 * b3 + white * 0.3104856;
        b4 = 0.55000 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.0168980;
        output[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
        output[i] *= 0.11; // scale to prevent clipping
        b6 = white * 0.115926;
      } else if (type === "brown") {
        // Brownian noise (integrate white noise, leaky integrator)
        output[i] = (lastOut + (0.02 * white)) / 1.02;
        lastOut = output[i];
        output[i] *= 3.5; // gain compensation
      }
    }

    const noiseSource = ctx.createBufferSource();
    noiseSource.buffer = noiseBuffer;
    noiseSource.loop = true;

    const gain = ctx.createGain();
    gain.gain.value = volume;

    noiseSource.connect(gain);
    gain.connect(ctx.destination);

    noiseSource.start(0);

    noiseNodeRef.current = noiseSource;
    gainNodeRef.current = gain;
    setSoundType(type);
  };

  const stopAmbientNoise = () => {
    if (noiseNodeRef.current) {
      try {
        noiseNodeRef.current.stop();
      } catch (err) {
        // Ignore errors
      }
      noiseNodeRef.current.disconnect();
      noiseNodeRef.current = null;
    }
    if (gainNodeRef.current) {
      gainNodeRef.current.disconnect();
      gainNodeRef.current = null;
    }
    setSoundType("none");
  };

  const handleVolumeChange = (newVol: number) => {
    setVolume(newVol);
    if (gainNodeRef.current) {
      gainNodeRef.current.gain.value = newVol;
    }
  };

  return (
    <div id="pomodoro-timer" className="p-5 rounded-2xl border border-white/5 bg-[#0C0C18] relative overflow-hidden shadow-xl">
      <div className="absolute top-0 right-0 h-32 w-32 bg-indigo-500/5 blur-3xl pointer-events-none rounded-full" />
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 border-b border-white/5 pb-3">
        <div className="flex items-center space-x-2">
          {mode === "focus" ? (
            <Flame className="h-5 w-5 text-indigo-400 animate-pulse" />
          ) : (
            <Coffee className="h-5 w-5 text-emerald-400" />
          )}
          <span className="font-semibold text-sm tracking-wide capitalize text-slate-200">
            {isFocusSprint ? "✨ Focus Sprint Mode" : mode === "focus" ? "Deep Focus Session" : mode === "short-break" ? "Short Break" : "Long Break"}
          </span>
        </div>
        <div className="flex items-center space-x-2">
          {/* Focus Sprint toggle button */}
          <button
            onClick={() => {
              setIsFocusSprint(!isFocusSprint);
              if (!isFocusSprint) {
                // Default to focus, 25 minutes
                setMode("focus");
                setTimeLeft(25 * 60);
              }
            }}
            className={`text-[9px] px-2 py-1 rounded font-mono font-bold transition-all border ${
              isFocusSprint
                ? "bg-indigo-500/10 border-indigo-500/30 text-indigo-400"
                : "bg-transparent border-white/5 text-white/40 hover:text-white"
            }`}
          >
            {isFocusSprint ? "Sprint ON" : "Sprint OFF"}
          </button>

          <div className="flex space-x-1 bg-[#05050A] p-0.5 rounded-lg border border-white/5">
            <button
              id="pomo-focus-btn"
              onClick={() => changeMode("focus")}
              className={`text-[9px] px-1.5 py-0.5 rounded font-medium transition-all ${
                mode === "focus" ? "bg-indigo-600 text-white" : "text-white/40 hover:text-white"
              }`}
            >
              Focus
            </button>
            <button
              id="pomo-short-btn"
              onClick={() => changeMode("short-break")}
              className={`text-[9px] px-1.5 py-0.5 rounded font-medium transition-all ${
                mode === "short-break" ? "bg-emerald-600 text-white" : "text-white/40 hover:text-white"
              }`}
            >
              Break
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-col items-center justify-center my-6">
        <div className="text-4xl md:text-5xl font-mono font-bold text-white tracking-wider filter drop-shadow-[0_0_8px_rgba(99,102,241,0.3)]">
          {formatTime(timeLeft)}
        </div>
        <p className="text-[11px] text-white/40 mt-2 truncate max-w-xs text-center font-sans italic">
          {taskTitle ? `Focusing on: ${taskTitle}` : "Set a task and start the countdown"}
        </p>

        <div className="flex items-center space-x-3 mt-5">
          <button
            id="timer-play-pause"
            onClick={toggleTimer}
            className={`p-3 rounded-full transition-all flex items-center justify-center ${
              isActive ? "bg-indigo-600/20 text-indigo-400 border border-indigo-500/40 hover:bg-indigo-600/30" : "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20 hover:bg-indigo-500"
            }`}
          >
            {isActive ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 fill-current" />}
          </button>
          <button
            id="timer-reset"
            onClick={resetTimer}
            className="p-3 rounded-full bg-[#05050A] text-white/40 border border-white/5 hover:border-white/10 hover:text-white transition-colors"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* FOCUS SPRINT AUTOMATIC BREAK SUGGESTIONS */}
      {isFocusSprint && (
        <div className="p-3.5 rounded-xl bg-indigo-500/5 border border-indigo-500/10 mb-4 text-left">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold text-indigo-400 font-mono tracking-wide uppercase">
              ✨ Automatic Break Suggestions
            </span>
            <button
              onClick={() => setSuggestionIdx((prev) => (prev + 1) % BREAK_SUGGESTIONS.length)}
              className="text-[9px] text-indigo-400/70 hover:text-indigo-300 font-mono hover:underline bg-[#05050A] px-1.5 py-0.5 rounded border border-white/5"
            >
              Cycle Advice
            </button>
          </div>
          <p className="text-xs text-white/75 leading-relaxed font-sans">
            {BREAK_SUGGESTIONS[suggestionIdx]}
          </p>
        </div>
      )}

      {/* SYNTH WHITE NOISE GENERATOR */}
      <div className="border-t border-white/5 pt-4 mt-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-1.5 text-xs text-white/40">
            <Volume2 className="h-3.5 w-3.5 text-white/30" />
            <span className="font-sans">White Noise Focus Synthesizer</span>
          </div>
          {soundType !== "none" && (
            <button
              id="noise-stop-btn"
              onClick={stopAmbientNoise}
              className="text-[10px] text-red-400 flex items-center hover:underline"
            >
              <VolumeX className="h-3 w-3 mr-1" /> Mute
            </button>
          )}
        </div>

        <div className="grid grid-cols-3 gap-2 mt-2">
          <button
            id="synth-white-btn"
            onClick={() => playAmbientNoise("white")}
            className={`text-[10px] py-1.5 rounded border transition-all ${
              soundType === "white"
                ? "bg-indigo-500/20 border-indigo-500 text-indigo-400 font-semibold"
                : "bg-[#05050A] border border-white/5 hover:border-white/10 text-white/40"
            }`}
          >
            Pure White
          </button>
          <button
            id="synth-pink-btn"
            onClick={() => playAmbientNoise("pink")}
            className={`text-[10px] py-1.5 rounded border transition-all ${
              soundType === "pink"
                ? "bg-indigo-500/20 border-indigo-500 text-indigo-400 font-semibold"
                : "bg-[#05050A] border border-white/5 hover:border-white/10 text-white/40"
            }`}
          >
            Steady Pink
          </button>
          <button
            id="synth-brown-btn"
            onClick={() => playAmbientNoise("brown")}
            className={`text-[10px] py-1.5 rounded border transition-all ${
              soundType === "brown"
                ? "bg-indigo-500/20 border-indigo-500 text-indigo-400 font-semibold"
                : "bg-[#05050A] border border-white/5 hover:border-white/10 text-white/40"
            }`}
          >
            Deep Brown
          </button>
        </div>

        {soundType !== "none" && (
          <div className="flex items-center space-x-2 mt-3 p-1.5 rounded bg-[#05050A] border border-white/5">
            <span className="text-[10px] text-white/30 font-mono">Gain</span>
            <input
              id="synth-volume-slider"
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={volume}
              onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
              className="w-full h-1 bg-white/5 rounded-lg appearance-none cursor-pointer accent-indigo-500"
            />
          </div>
        )}
      </div>
    </div>
  );
}
