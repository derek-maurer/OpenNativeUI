import { useState } from "react";
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

interface SettingsScreenProps {
  onClose: () => void;
}

export function SettingsScreen({ onClose }: SettingsScreenProps) {
  const { theme, setTheme, webSearchByDefault, setWebSearchByDefault } = useSettingsStore();
  const { serverUrl, user, logout } = useAuthStore();
  const { models, defaultModelId, setDefaultModel } = useModelStore();
  const clearAll = useConversationStore((s) => s.clearAll);
  const clearChat = useChatStore((s) => s.clearChat);
  const { showToast } = useToast();

  const [showDefaultModelPicker, setShowDefaultModelPicker] = useState(false);

  const defaultModel = models.find((m) => m.id === defaultModelId);

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
    <div className="flex h-full flex-col bg-[#0d0d0d] overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-neutral-800 px-6 pt-10 pb-4">
        <h1 className="text-lg font-semibold text-white">Settings</h1>
        <button
          onClick={onClose}
          className="rounded-lg p-1.5 text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
        >
          <X size={18} />
        </button>
      </div>

      <div className="flex-1 px-6 py-4 flex flex-col gap-6 max-w-lg">
        {/* Appearance */}
        <section>
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-neutral-500">
            Appearance
          </p>
          <div className="rounded-2xl bg-[#1a1a1a] border border-neutral-800 overflow-hidden divide-y divide-neutral-800">
            <div className="flex items-center justify-between px-4 py-3.5">
              <span className="text-sm text-white">Theme</span>
              <div className="flex gap-1">
                {themeOptions.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setTheme(opt.value)}
                    className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                      theme === opt.value
                        ? "bg-primary text-white"
                        : "text-neutral-400 hover:text-white"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Chat */}
        <section>
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-neutral-500">
            Chat
          </p>
          <div className="rounded-2xl bg-[#1a1a1a] border border-neutral-800 overflow-hidden divide-y divide-neutral-800">
            {/* Default model */}
            <button
              onClick={() => setShowDefaultModelPicker(true)}
              className="flex w-full items-center justify-between px-4 py-3.5 hover:bg-neutral-700/30 transition-colors"
            >
              <span className="text-sm text-white">Default Model</span>
              <div className="flex items-center gap-1.5 text-neutral-400">
                <span className="text-xs truncate max-w-[140px]">
                  {defaultModel?.name ?? "None"}
                </span>
                <ChevronRight size={14} />
              </div>
            </button>

            {/* Web search by default */}
            <div className="flex items-center justify-between px-4 py-3.5">
              <span className="text-sm text-white">Web Search by Default</span>
              <Toggle value={webSearchByDefault} onChange={setWebSearchByDefault} />
            </div>
          </div>
        </section>

        {/* Server */}
        <section>
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-neutral-500">
            Server
          </p>
          <div className="rounded-2xl bg-[#1a1a1a] border border-neutral-800 overflow-hidden divide-y divide-neutral-800">
            <div className="flex items-center justify-between px-4 py-3.5">
              <span className="text-sm text-neutral-400">URL</span>
              <span className="text-xs text-neutral-500 truncate max-w-[200px]">{serverUrl}</span>
            </div>
            <div className="flex items-center justify-between px-4 py-3.5">
              <span className="text-sm text-neutral-400">Account</span>
              <span className="text-xs text-neutral-500 truncate max-w-[200px]">{user?.email}</span>
            </div>
          </div>
        </section>

        {/* Data */}
        <section>
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-neutral-500">
            Data
          </p>
          <div className="rounded-2xl bg-[#1a1a1a] border border-neutral-800 overflow-hidden divide-y divide-neutral-800">
            <button
              onClick={handleClearHistory}
              className="flex w-full items-center px-4 py-3.5 text-left hover:bg-neutral-700/30 transition-colors"
            >
              <span className="text-sm text-red-400">Clear All History</span>
            </button>
          </div>
        </section>

        {/* Account */}
        <section>
          <div className="rounded-2xl bg-[#1a1a1a] border border-neutral-800 overflow-hidden">
            <button
              onClick={handleSignOut}
              className="flex w-full items-center px-4 py-3.5 text-left hover:bg-neutral-700/30 transition-colors"
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
