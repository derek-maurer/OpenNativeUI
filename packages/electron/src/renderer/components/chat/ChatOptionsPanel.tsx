import { useEffect, useRef } from "react";
import { Globe, Lightbulb, Paperclip, FolderOpen } from "lucide-react";
import { useChatStore, useModelStore } from "@opennative/shared";
import { getThinkingProfile, resolveEffectiveThinkingValue } from "@opennative/shared";
import { useModelPreferencesStore } from "@opennative/shared";
import { Toggle } from "../ui/Toggle";
import type { ThinkingValue } from "@opennative/shared";

interface ChatOptionsPanelProps {
  visible: boolean;
  onClose: () => void;
  onAttachFile: () => void;
  onOpenFolderPicker: () => void;
}

export function ChatOptionsPanel({
  visible,
  onClose,
  onAttachFile,
  onOpenFolderPicker,
}: ChatOptionsPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const webSearchEnabled = useChatStore((s) => s.webSearchEnabled);
  const toggleWebSearch = useChatStore((s) => s.toggleWebSearch);
  const selectedModelId = useModelStore((s) => s.selectedModelId);
  const thinkingByModel = useModelPreferencesStore((s) => s.thinkingByModel);
  const setThinkingForModel = useModelPreferencesStore((s) => s.setThinkingForModel);

  const profile = selectedModelId ? getThinkingProfile(selectedModelId) : null;
  const currentThinking: ThinkingValue = selectedModelId
    ? (thinkingByModel[selectedModelId] ?? null)
    : null;

  // Dismiss on outside click
  useEffect(() => {
    if (!visible) return;
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [visible, onClose]);

  if (!visible) return null;

  return (
    <div
      ref={panelRef}
      className="absolute bottom-full left-0 mb-2 w-72 rounded-2xl bg-surface border border-line-strong shadow-2xl p-3 flex flex-col gap-1 z-20"
    >
      {/* Web Search */}
      <div className="flex items-center justify-between rounded-xl px-3 py-2.5 hover:bg-hover transition-colors">
        <div className="flex items-center gap-2.5">
          <Globe size={16} className="text-secondary" />
          <span className="text-sm text-fg">Web Search</span>
        </div>
        <Toggle value={webSearchEnabled} onChange={toggleWebSearch} />
      </div>

      {/* Thinking (if model supports it) */}
      {profile && (
        <div className="flex flex-col gap-1.5 rounded-xl px-3 py-2.5">
          {profile.offValue !== undefined ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Lightbulb size={16} className="text-secondary" />
                <span className="text-sm text-fg">Thinking</span>
              </div>
              <Toggle
                value={resolveEffectiveThinkingValue(profile, currentThinking) !== profile.offValue}
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
            <>
              <div className="flex items-center gap-2.5">
                <Lightbulb size={16} className="text-secondary" />
                <span className="text-sm text-fg">Thinking</span>
              </div>
              <div className="flex gap-1.5 flex-wrap mt-1">
                {profile.options?.map((opt) => {
                  const resolved = resolveEffectiveThinkingValue(profile, currentThinking);
                  const isSelected = resolved === opt.value;
                  return (
                    <button
                      key={String(opt.value)}
                      onClick={() => selectedModelId && setThinkingForModel(selectedModelId, opt.value)}
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

      {/* Divider */}
      <div className="h-px bg-line-strong my-0.5" />

      {/* Attach File */}
      <button
        onClick={() => { onAttachFile(); onClose(); }}
        className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 hover:bg-hover transition-colors text-left"
      >
        <Paperclip size={16} className="text-secondary" />
        <span className="text-sm text-fg">Attach File</span>
      </button>

      {/* Assign to Folder */}
      <button
        onClick={() => { onOpenFolderPicker(); onClose(); }}
        className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 hover:bg-hover transition-colors text-left"
      >
        <FolderOpen size={16} className="text-secondary" />
        <span className="text-sm text-fg">Add to Folder</span>
      </button>
    </div>
  );
}
