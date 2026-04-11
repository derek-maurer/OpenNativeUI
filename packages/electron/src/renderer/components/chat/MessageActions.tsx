import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { Copy, Check, Volume2, VolumeX, Info, X, RotateCcw } from "lucide-react";
import {
  getThinkingProfile,
  useModelStore,
  extractPlainContent,
  stripMarkdownForSpeech,
  type MessageInfo,
} from "@opennative/shared";
import { RetryPopover } from "./RetryPopover";

interface MessageActionsProps {
  content: string;
  info?: MessageInfo;
  onRetry?: () => void;
}

export function MessageActions({ content, info, onRetry }: MessageActionsProps) {
  const [copied, setCopied] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const [retryPopoverOpen, setRetryPopoverOpen] = useState(false);
  const infoRef = useRef<HTMLDivElement>(null);
  const selectedModelId = useModelStore((s) => s.selectedModelId);

  // Strip reasoning blocks so copy matches what the user sees
  const plainContent = useMemo(() => extractPlainContent(content), [content]);

  // Close info popover on outside click
  useEffect(() => {
    if (!infoOpen) return;
    const handler = (e: MouseEvent) => {
      if (infoRef.current && !infoRef.current.contains(e.target as Node)) {
        setInfoOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [infoOpen]);

  // Stop speech when component unmounts
  useEffect(() => {
    return () => {
      if (isSpeaking) window.speechSynthesis?.cancel();
    };
  }, [isSpeaking]);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(plainContent).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }, [plainContent]);

  const handleSpeak = useCallback(() => {
    const synth = window.speechSynthesis;
    if (!synth) return;

    if (isSpeaking) {
      synth.cancel();
      setIsSpeaking(false);
      return;
    }

    const plain = stripMarkdownForSpeech(content);

    const utterance = new SpeechSynthesisUtterance(plain);

    // Prefer a high-quality local en-US voice over the robotic default.
    // On macOS/Electron the system voices (Samantha, Alex, etc.) are far
    // better than the fallback eSpeak/espeak-ng voice.
    const voices = synth.getVoices();
    const preferred = pickBestVoice(voices);
    if (preferred) utterance.voice = preferred;

    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    setIsSpeaking(true);
    synth.speak(utterance);
  }, [content, isSpeaking]);

  const handleRetryPress = useCallback(() => {
    if (!onRetry) return;
    const profile = getThinkingProfile(selectedModelId);
    if (profile) {
      setRetryPopoverOpen(true);
    } else {
      onRetry();
    }
  }, [onRetry, selectedModelId]);

  return (
    <div className="flex items-center gap-1 mt-2">
      {info && (
        <div className="relative" ref={infoRef}>
          <ActionButton
            onClick={() => setInfoOpen((v) => !v)}
            title="Message info"
            active={infoOpen}
          >
            <Info size={14} />
          </ActionButton>

          {infoOpen && (
            <div className="absolute left-0 top-7 z-50 w-52 rounded-xl border border-line-strong bg-surface shadow-xl p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-fg">
                  Message Info
                </span>
                <button
                  onClick={() => setInfoOpen(false)}
                  className="text-muted hover:text-fg transition-colors"
                >
                  <X size={12} />
                </button>
              </div>
              <InfoRow label="Model" value={info.model} />
              <InfoRow label="Output tokens" value={`~${info.outputTokens}`} />
              <InfoRow
                label="Duration"
                value={`${info.totalDuration.toFixed(1)}s`}
              />
              <InfoRow
                label="Tokens/sec"
                value={info.tokensPerSecond.toFixed(1)}
              />
            </div>
          )}
        </div>
      )}

      <ActionButton onClick={handleCopy} title={copied ? "Copied!" : "Copy"}>
        {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
      </ActionButton>

      <ActionButton
        onClick={handleSpeak}
        title={isSpeaking ? "Stop speaking" : "Speak message"}
        active={isSpeaking}
      >
        {isSpeaking ? (
          <VolumeX size={14} className="text-primary" />
        ) : (
          <Volume2 size={14} />
        )}
      </ActionButton>

      {onRetry && (
        <div className="relative">
          <ActionButton onClick={handleRetryPress} title="Retry">
            <RotateCcw size={14} />
          </ActionButton>
          <RetryPopover
            open={retryPopoverOpen}
            onClose={() => setRetryPopoverOpen(false)}
            onRetry={() => {
              setRetryPopoverOpen(false);
              onRetry();
            }}
          />
        </div>
      )}
    </div>
  );
}

function ActionButton({
  children,
  onClick,
  title,
  active,
}: {
  children: React.ReactNode;
  onClick: () => void;
  title?: string;
  active?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={[
        "flex items-center justify-center rounded-md p-1 transition-colors",
        active
          ? "text-primary bg-primary/10"
          : "text-muted hover:text-fg hover:bg-hover",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

// Ranked preference list — first match wins.
// macOS ships "Samantha" and "Alex" as high-quality local TTS voices.
// Other platforms (Windows, Linux) have their own naming conventions so
// we fall back progressively to any local en-US voice, then any en voice.
const PREFERRED_VOICES = ["Samantha", "Alex", "Google US English", "Microsoft Zira"];

function pickBestVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  for (const name of PREFERRED_VOICES) {
    const match = voices.find((v) => v.name === name);
    if (match) return match;
  }
  // Any local en-US voice
  const localEnUS = voices.find((v) => v.lang === "en-US" && v.localService);
  if (localEnUS) return localEnUS;
  // Any en-US voice
  const enUS = voices.find((v) => v.lang === "en-US");
  if (enUS) return enUS;
  // Any local English voice
  return voices.find((v) => v.lang.startsWith("en") && v.localService) ?? null;
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center py-1.5 border-b border-line last:border-0">
      <span className="text-xs text-muted">{label}</span>
      <span className="text-xs font-medium text-fg">{value}</span>
    </div>
  );
}
