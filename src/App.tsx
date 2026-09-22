import { useState, useEffect, useRef } from "react";

const LANGUAGES = [
  { label: "Русский", value: "ru-RU" },
  { label: "English (US)", value: "en-US" },
  { label: "English (UK)", value: "en-GB" },
  { label: "Deutsch", value: "de-DE" },
  { label: "Français", value: "fr-FR" },
  { label: "Español", value: "es-ES" },
  { label: "Italiano", value: "it-IT" },
  { label: "日本語", value: "ja-JP" },
  { label: "中文", value: "zh-CN" },
  { label: "한국어", value: "ko-KR" },
];

type Status = "idle" | "speaking" | "paused";

export default function App() {
  const [text, setText] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [rate, setRate] = useState(1);
  const [pitch, setPitch] = useState(1);
  const [volume, setVolume] = useState(1);
  const [lang, setLang] = useState("ru-RU");
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<string>("");
  const [progress, setProgress] = useState(0);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const charIndexRef = useRef(0);

  const supported = "speechSynthesis" in window;

  // Load voices
  useEffect(() => {
    const loadVoices = () => {
      const v = window.speechSynthesis.getVoices();
      setVoices(v);
    };
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
    return () => {
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, []);

  // Filter voices by lang
  const filteredVoices = voices.filter((v) => v.lang.startsWith(lang.slice(0, 2)));

  useEffect(() => {
    setSelectedVoice("");
  }, [lang]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      window.speechSynthesis.cancel();
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    };
  }, []);

  const startProgress = (totalLen: number) => {
    if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    progressIntervalRef.current = setInterval(() => {
      const idx = charIndexRef.current;
      const pct = totalLen > 0 ? Math.min((idx / totalLen) * 100, 100) : 0;
      setProgress(pct);
    }, 100);
  };

  const stopProgress = () => {
    if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    progressIntervalRef.current = null;
  };

  const speak = () => {
    if (!text.trim()) return;
    window.speechSynthesis.cancel();
    charIndexRef.current = 0;
    setProgress(0);

    const utter = new SpeechSynthesisUtterance(text);
    utter.rate = rate;
    utter.pitch = pitch;
    utter.volume = volume;
    utter.lang = lang;

    if (selectedVoice) {
      const voice = voices.find((v) => v.name === selectedVoice);
      if (voice) utter.voice = voice;
    }

    utter.onboundary = (e) => {
      if (e.name === "word" || e.name === "sentence") {
        charIndexRef.current = e.charIndex;
      }
    };

    utter.onstart = () => {
      setStatus("speaking");
      startProgress(text.length);
    };

    utter.onend = () => {
      setStatus("idle");
      setProgress(100);
      stopProgress();
      charIndexRef.current = 0;
    };

    utter.onerror = () => {
      setStatus("idle");
      stopProgress();
    };

    utteranceRef.current = utter;
    window.speechSynthesis.speak(utter);
  };

  const pause = () => {
    window.speechSynthesis.pause();
    setStatus("paused");
    stopProgress();
  };

  const resume = () => {
    window.speechSynthesis.resume();
    setStatus("speaking");
    startProgress(text.length);
  };

  const stop = () => {
    window.speechSynthesis.cancel();
    setStatus("idle");
    setProgress(0);
    charIndexRef.current = 0;
    stopProgress();
  };

  const charCount = text.length;
  const maxChars = 5000;

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-slate-900 to-purple-950 flex items-center justify-center p-4">
      {/* Background blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-purple-600 opacity-20 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-indigo-600 opacity-20 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-violet-500 opacity-10 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-500 shadow-lg shadow-violet-500/30 mb-4">
            {/* Speaker icon */}
            <svg className="w-8 h-8 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
              <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
              <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
            </svg>
          </div>
          <h1 className="text-4xl font-bold text-white tracking-tight">
            Text to Speech
          </h1>
          <p className="text-slate-400 mt-2 text-sm">Введите текст и нажмите воспроизвести</p>
        </div>

        {/* Main card */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-2xl space-y-5">

          {!supported && (
            <div className="bg-red-500/20 border border-red-400/30 rounded-xl p-4 text-red-300 text-sm text-center">
              ⚠️ Ваш браузер не поддерживает Web Speech API. Попробуйте Chrome или Edge.
            </div>
          )}

          {/* Text area */}
          <div className="relative">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value.slice(0, maxChars))}
              placeholder="Введите или вставьте текст здесь..."
              rows={6}
              className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white placeholder-slate-500 resize-none focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 transition-all text-base leading-relaxed"
            />
            <div className={`absolute bottom-3 right-4 text-xs font-medium transition-colors ${charCount > maxChars * 0.9 ? "text-orange-400" : "text-slate-500"}`}>
              {charCount}/{maxChars}
            </div>
          </div>

          {/* Progress bar */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs text-slate-500">
              <span>Прогресс воспроизведения</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <div className="h-2 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-violet-500 to-indigo-400 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Settings grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Language */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Язык</label>
              <select
                value={lang}
                onChange={(e) => setLang(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50 cursor-pointer"
              >
                {LANGUAGES.map((l) => (
                  <option key={l.value} value={l.value} className="bg-slate-800 text-white">
                    {l.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Voice */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Голос</label>
              <select
                value={selectedVoice}
                onChange={(e) => setSelectedVoice(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50 cursor-pointer"
              >
                <option value="" className="bg-slate-800">— По умолчанию —</option>
                {filteredVoices.map((v) => (
                  <option key={v.name} value={v.name} className="bg-slate-800">
                    {v.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Sliders */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Speed */}
            <SliderControl
              label="Скорость"
              value={rate}
              min={0.5}
              max={2}
              step={0.1}
              display={`${rate.toFixed(1)}x`}
              onChange={setRate}
              color="from-violet-500 to-indigo-400"
            />
            {/* Pitch */}
            <SliderControl
              label="Тон"
              value={pitch}
              min={0}
              max={2}
              step={0.1}
              display={pitch.toFixed(1)}
              onChange={setPitch}
              color="from-pink-500 to-rose-400"
            />
            {/* Volume */}
            <SliderControl
              label="Громкость"
              value={volume}
              min={0}
              max={1}
              step={0.05}
              display={`${Math.round(volume * 100)}%`}
              onChange={setVolume}
              color="from-emerald-500 to-teal-400"
            />
          </div>

          {/* Controls */}
          <div className="flex gap-3 pt-1">
            {/* Play / Resume */}
            {status === "idle" && (
              <button
                onClick={speak}
                disabled={!text.trim() || !supported}
                className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold rounded-2xl py-3.5 transition-all shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 hover:scale-[1.02] active:scale-[0.98]"
              >
                <PlayIcon />
                Воспроизвести
              </button>
            )}

            {status === "speaking" && (
              <>
                <button
                  onClick={pause}
                  className="flex-1 flex items-center justify-center gap-2 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/30 text-amber-300 font-semibold rounded-2xl py-3.5 transition-all"
                >
                  <PauseIcon />
                  Пауза
                </button>
                <button
                  onClick={stop}
                  className="flex items-center justify-center gap-2 bg-red-500/20 hover:bg-red-500/30 border border-red-400/30 text-red-300 font-semibold rounded-2xl px-5 py-3.5 transition-all"
                >
                  <StopIcon />
                  Стоп
                </button>
              </>
            )}

            {status === "paused" && (
              <>
                <button
                  onClick={resume}
                  className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-semibold rounded-2xl py-3.5 transition-all shadow-lg shadow-violet-500/25"
                >
                  <PlayIcon />
                  Продолжить
                </button>
                <button
                  onClick={stop}
                  className="flex items-center justify-center gap-2 bg-red-500/20 hover:bg-red-500/30 border border-red-400/30 text-red-300 font-semibold rounded-2xl px-5 py-3.5 transition-all"
                >
                  <StopIcon />
                  Стоп
                </button>
              </>
            )}
          </div>

          {/* Status indicator */}
          <div className="flex items-center justify-center gap-2 pt-1">
            <div className={`w-2 h-2 rounded-full ${
              status === "speaking"
                ? "bg-green-400 animate-pulse"
                : status === "paused"
                ? "bg-amber-400"
                : "bg-slate-600"
            }`} />
            <span className="text-xs text-slate-500">
              {status === "speaking" ? "Воспроизведение..." : status === "paused" ? "На паузе" : "Готово"}
            </span>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-slate-600 text-xs mt-6">
          Работает на основе Web Speech API · Поддерживается в Chrome, Edge, Safari
        </p>
      </div>
    </div>
  );
}

/* ── Sub-components ── */

function SliderControl({
  label,
  value,
  min,
  max,
  step,
  display,
  onChange,
  color,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  display: string;
  onChange: (v: number) => void;
  color: string;
}) {
  const pct = ((value - min) / (max - min)) * 100;

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{label}</label>
        <span className={`text-xs font-bold bg-gradient-to-r ${color} bg-clip-text text-transparent`}>{display}</span>
      </div>
      <div className="relative h-2 bg-white/10 rounded-full">
        <div
          className={`absolute h-full bg-gradient-to-r ${color} rounded-full`}
          style={{ width: `${pct}%` }}
        />
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          className="absolute inset-0 w-full opacity-0 cursor-pointer h-full"
        />
      </div>
    </div>
  );
}

function PlayIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
      <polygon points="5 3 19 12 5 21 5 3" />
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
      <rect x="6" y="4" width="4" height="16" />
      <rect x="14" y="4" width="4" height="16" />
    </svg>
  );
}

function StopIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
      <rect x="3" y="3" width="18" height="18" rx="2" />
    </svg>
  );
}
