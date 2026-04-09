import { useEffect, useState } from "react";
import {
  useAuthStore,
  useSettingsStore,
  useModelStore,
  useConversationStore,
  useChatStore,
  disconnectSocket,
} from "@opennative/shared";
import { X, ChevronRight } from "lucide-react";
import { Toggle } from "../components/ui/Toggle";
import { ModelPickerOverlay } from "../components/chat/ModelSelector";
import { useToast } from "../components/ui/Toast";

const isMac = typeof navigator !== "undefined" && navigator.platform.startsWith("Mac");

function toElectronAccelerator(e: KeyboardEvent): string | null {
  // Require at least one modifier (but not just Shift alone)
  if (!e.altKey && !e.ctrlKey && !e.metaKey) return null;
  // Ignore bare modifier-only presses
  if (["Alt", "Control", "Meta", "Shift"].includes(e.key)) return null;

  const parts: string[] = [];
  if (e.ctrlKey) parts.push("Control");
  if (e.altKey) parts.push("Alt");
  if (e.metaKey) parts.push("Command");
  if (e.shiftKey) parts.push("Shift");

  let key = e.key;
  if (e.code === "Space") key = "Space";
  else if (key.length === 1) key = key.toUpperCase();
  else if (key === "ArrowUp") key = "Up";
  else if (key === "ArrowDown") key = "Down";
  else if (key === "ArrowLeft") key = "Left";
  else if (key === "ArrowRight") key = "Right";

  parts.push(key);
  return parts.join("+");
}

function formatHotkey(accelerator: string): string {
  return accelerator
    .replace("Command", isMac ? "⌘" : "Win")
    .replace("Control", isMac ? "⌃" : "Ctrl")
    .replace("Alt", isMac ? "⌥" : "Alt")
    .replace("Option", isMac ? "⌥" : "Alt")
    .replace("Shift", "⇧")
    .replace(/\+/g, " ");
}

interface HotkeyRecorderProps {
  value: string;
  onChange: (hotkey: string) => Promise<void>;
}

function HotkeyRecorder({ value, onChange }: HotkeyRecorderProps) {
  const [recording, setRecording] = useState(false);
  const [pending, setPending] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!recording) return;

    const onKeyDown = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const accel = toElectronAccelerator(e);
      if (!accel) return;
      setPending(accel);
      setRecording(false);
    };

    document.addEventListener("keydown", onKeyDown, true);
    return () => document.removeEventListener("keydown", onKeyDown, true);
  }, [recording]);

  const handleSave = async () => {
    if (!pending) return;
    setSaving(true);
    await onChange(pending);
    setSaving(false);
    setPending(null);
  };

  const handleCancel = () => {
    setPending(null);
    setRecording(false);
  };

  const displayed = pending ?? value;

  return (
    <div className="flex items-center gap-2">
      <div
        className={`rounded-lg px-3 py-1.5 text-xs font-mono min-w-[100px] text-center transition-colors ${
          recording
            ? "bg-primary/20 border border-primary/50 text-primary animate-pulse"
            : "bg-surface border border-line-strong text-fg"
        }`}
      >
        {recording ? "Press keys…" : formatHotkey(displayed)}
      </div>

      {pending && !recording ? (
        <div className="flex items-center gap-1.5">
          <button
            onClick={handleSave}
            disabled={saving}
            className="text-xs text-primary hover:text-primary/80 disabled:opacity-50 transition-colors"
          >
            {saving ? "Saving…" : "Save"}
          </button>
          <span className="text-dim">·</span>
          <button
            onClick={handleCancel}
            className="text-xs text-muted hover:text-secondary transition-colors"
          >
            Cancel
          </button>
        </div>
      ) : !recording ? (
        <button
          onClick={() => { setPending(null); setRecording(true); }}
          className="text-xs text-muted hover:text-secondary transition-colors"
        >
          Change
        </button>
      ) : (
        <button
          onClick={handleCancel}
          className="text-xs text-muted hover:text-secondary transition-colors"
        >
          Cancel
        </button>
      )}
    </div>
  );
}

interface SettingsScreenProps {
  onClose: () => void;
}

export function SettingsScreen({ onClose }: SettingsScreenProps) {
  const { theme, setTheme, webSearchByDefault, setWebSearchByDefault, chimeOnComplete, setChimeOnComplete } = useSettingsStore();
  const { serverUrl, user, logout } = useAuthStore();
  const { models, defaultModelId, setDefaultModel } = useModelStore();
  const clearAll = useConversationStore((s) => s.clearAll);
  const clearChat = useChatStore((s) => s.clearChat);
  const { showToast } = useToast();

  const [showDefaultModelPicker, setShowDefaultModelPicker] = useState(false);
  const [chatBarHotkey, setChatBarHotkey] = useState("Alt+Space");

  const defaultModel = models.find((m) => m.id === defaultModelId);

  // Load current hotkey from main process
  useEffect(() => {
    window.electronAPI.getChatBarHotkey().then(setChatBarHotkey);
  }, []);

  const handleSetHotkey = async (hotkey: string) => {
    const result = await window.electronAPI.setChatBarHotkey(hotkey);
    if (result.success) {
      setChatBarHotkey(hotkey);
      showToast("Hotkey updated", "success");
    } else {
      showToast(result.error ?? "Failed to set hotkey", "error");
    }
  };

  const handleClearHistory = async () => {
    if (!window.confirm("Clear all conversation history? This cannot be undone.")) return;
    try {
      await clearAll();
      clearChat();
      showToast("History cleared", "success");
    } catch {
      showToast("Failed to clear history", "error");
    }
  };

  const handleSignOut = () => {
    if (!window.confirm("Sign out?")) return;
    disconnectSocket();
    logout();
  };

  const themeOptions = [
    { value: "system", label: "System" },
    { value: "light", label: "Light" },
    { value: "dark", label: "Dark" },
  ] as const;

  return (
    <div className="flex h-full flex-col bg-base overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-line px-6 pt-10 pb-4">
        <h1 className="text-lg font-semibold text-fg">Settings</h1>
        <button
          onClick={onClose}
          className="rounded-lg p-1.5 text-secondary hover:text-fg hover:bg-hover transition-colors"
        >
          <X size={18} />
        </button>
      </div>

      <div className="flex-1 px-6 py-4 flex flex-col gap-6 max-w-lg">
        {/* Appearance */}
        <section>
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted">
            Appearance
          </p>
          <div className="rounded-2xl bg-surface border border-line overflow-hidden divide-y divide-line">
            <div className="flex items-center justify-between px-4 py-3.5">
              <span className="text-sm text-fg">Theme</span>
              <div className="flex gap-1">
                {themeOptions.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setTheme(opt.value)}
                    className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                      theme === opt.value
                        ? "bg-primary text-white"
                        : "text-secondary hover:text-fg"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Quick Access */}
        <section>
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted">
            Quick Access
          </p>
          <div className="rounded-2xl bg-surface border border-line overflow-hidden divide-y divide-line">
            <div className="flex items-center justify-between px-4 py-3.5">
              <div>
                <span className="text-sm text-fg">Chat Bar Hotkey</span>
                <p className="text-xs text-muted mt-0.5">
                  Open the floating chat bar from anywhere
                </p>
              </div>
              <HotkeyRecorder value={chatBarHotkey} onChange={handleSetHotkey} />
            </div>
          </div>
        </section>

        {/* Chat */}
        <section>
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted">
            Chat
          </p>
          <div className="rounded-2xl bg-surface border border-line overflow-hidden divide-y divide-line">
            {/* Default model */}
            <button
              onClick={() => setShowDefaultModelPicker(true)}
              className="flex w-full items-center justify-between px-4 py-3.5 hover:bg-hover transition-colors"
            >
              <span className="text-sm text-fg">Default Model</span>
              <div className="flex items-center gap-1.5 text-secondary">
                <span className="text-xs truncate max-w-[140px]">
                  {defaultModel?.name ?? "None"}
                </span>
                <ChevronRight size={14} />
              </div>
            </button>

            {/* Web search by default */}
            <div className="flex items-center justify-between px-4 py-3.5">
              <span className="text-sm text-fg">Web Search by Default</span>
              <Toggle value={webSearchByDefault} onChange={setWebSearchByDefault} />
            </div>

            {/* Chime on response */}
            <div className="flex items-center justify-between px-4 py-3.5">
              <span className="text-sm text-fg">Chime on Response</span>
              <Toggle value={chimeOnComplete} onChange={setChimeOnComplete} />
            </div>
          </div>
        </section>

        {/* Server */}
        <section>
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted">
            Server
          </p>
          <div className="rounded-2xl bg-surface border border-line overflow-hidden divide-y divide-line">
            <div className="flex items-center justify-between px-4 py-3.5">
              <span className="text-sm text-secondary">URL</span>
              <span className="text-xs text-muted truncate max-w-[200px]">{serverUrl}</span>
            </div>
            <div className="flex items-center justify-between px-4 py-3.5">
              <span className="text-sm text-secondary">Account</span>
              <span className="text-xs text-muted truncate max-w-[200px]">{user?.email}</span>
            </div>
          </div>
        </section>

        {/* Data */}
        <section>
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted">
            Data
          </p>
          <div className="rounded-2xl bg-surface border border-line overflow-hidden divide-y divide-line">
            <button
              onClick={handleClearHistory}
              className="flex w-full items-center px-4 py-3.5 text-left hover:bg-hover transition-colors"
            >
              <span className="text-sm text-red-400">Clear All History</span>
            </button>
          </div>
        </section>

        {/* Account */}
        <section>
          <div className="rounded-2xl bg-surface border border-line overflow-hidden">
            <button
              onClick={handleSignOut}
              className="flex w-full items-center px-4 py-3.5 text-left hover:bg-hover transition-colors"
            >
              <span className="text-sm text-red-400">Sign Out</span>
            </button>
          </div>
        </section>
      </div>

      {/* Default model picker */}
      <ModelPickerOverlay
        visible={showDefaultModelPicker}
        onClose={() => setShowDefaultModelPicker(false)}
        selectedModelId={defaultModelId}
        onSelect={(id) => setDefaultModel(id)}
      />
    </div>
  );
}
