import { useEffect, useRef } from "react";
import { Lightbulb, RefreshCw } from "lucide-react";
import {
  useModelStore,
  useModelPreferencesStore,
  getThinkingProfile,
  resolveEffectiveThinkingValue,
  type ThinkingValue,
} from "@opennative/shared";
import { Toggle } from "../ui/Toggle";

interface RetryPopoverProps {
  open: boolean;
  onClose: () => void;
  onRetry: () => void;
}

export function RetryPopover({ open, onClose, onRetry }: RetryPopoverProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const selectedModelId = useModelStore((s) => s.selectedModelId);
  const thinkingByModel = useModelPreferencesStore((s) => s.thinkingByModel);
  const setThinkingForModel = useModelPreferencesStore((s) => s.setThinkingForModel);

  const profile = selectedModelId ? getThinkingProfile(selectedModelId) : null;
  const currentThinking: ThinkingValue = selectedModelId
    ? (thinkingByModel[selectedModelId] ?? null)
    : null;

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      ref={containerRef}
      className="absolute left-0 top-7 z-50 w-64 rounded-2xl bg-surface border border-line-strong shadow-2xl p-3 flex flex-col gap-2"
    >
      <span className="text-xs font-semibold text-fg px-1">Retry</span>

      {/* Thinking controls (if model supports it) */}
      {profile && (
        <div className="flex flex-col gap-1.5 rounded-xl px-2 py-1.5">
          {profile.offValue !== undefined ? (
            /* Binary toggle */
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Lightbulb size={14} className="text-secondary" />
                <span className="text-sm text-fg">{profile.label}</span>
              </div>
              <Toggle
                value={
                  resolveEffectiveThinkingValue(profile, currentThinking) !== profile.offValue
                }
                onChange={(v) => {
                  if (selectedModelId) {
                    setThinkingForModel(
                      selectedModelId,
                      v ? (profile.options[0]?.value ?? true) : (profile.offValue ?? null),
                    );
                  }
                }}
              />
            </div>
          ) : (
            /* Tiered chips */
            <>
              <div className="flex items-center gap-2">
                <Lightbulb size={14} className="text-secondary" />
                <span className="text-sm text-fg">{profile.label}</span>
              </div>
              <div className="flex gap-1.5 flex-wrap mt-0.5">
                {profile.options?.map((opt) => {
                  const resolved = resolveEffectiveThinkingValue(profile, currentThinking);
                  const isSelected = resolved === opt.value;
                  return (
                    <button
                      key={String(opt.value)}
                      onClick={() =>
                        selectedModelId &&
                        setThinkingForModel(selectedModelId, isSelected ? null : opt.value)
                      }
                      className={`rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors ${
                        isSelected
                          ? "border-primary bg-primary/20 text-primary"
                          : "border-line-strong text-secondary hover:border-muted"
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}

      {/* Retry button */}
      <button
        onClick={() => { onRetry(); onClose(); }}
        className="flex items-center justify-center gap-2 rounded-xl bg-primary px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-500 transition-colors"
      >
        <RefreshCw size={14} />
        Retry
      </button>
    </div>
  );
}
