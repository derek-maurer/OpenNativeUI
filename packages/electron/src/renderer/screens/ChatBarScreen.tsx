import { useEffect, useRef, useState } from "react";
import {
  useAuthStore,
  useModelStore,
  useSettingsStore,
  useModelPreferencesStore,
  getThinkingProfile,
  resolveEffectiveThinkingValue,
} from "@opennative/shared";
import { ArrowUp, ChevronDown, Search, Check, Globe, Lightbulb } from "lucide-react";

export function ChatBarScreen() {
  const [query, setQuery] = useState("");
  const [showModelPicker, setShowModelPicker] = useState(false);
  const [modelSearch, setModelSearch] = useState("");
  const [webSearch, setWebSearch] = useState(false);

  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const models = useModelStore((s) => s.models);
  const selectedModelId = useModelStore((s) => s.selectedModelId);
  const setSelectedModel = useModelStore((s) => s.setSelectedModel);
  const fetchModels = useModelStore((s) => s.fetchModels);
  const defaultModelId = useModelStore((s) => s.defaultModelId);

  const thinkingByModel = useModelPreferencesStore((s) => s.thinkingByModel);
  const setThinkingForModel = useModelPreferencesStore((s) => s.setThinkingForModel);

  const inputRef = useRef<HTMLInputElement>(null);
  const modelSearchRef = useRef<HTMLInputElement>(null);

  const selectedModel = models.find((m) => m.id === selectedModelId);

  // Thinking profile for the currently selected model
  const thinkingProfile = selectedModelId ? getThinkingProfile(selectedModelId) : null;
  const currentThinking = selectedModelId ? (thinkingByModel[selectedModelId] ?? null) : null;
  const thinkingResolved = thinkingProfile
    ? resolveEffectiveThinkingValue(thinkingProfile, currentThinking)
    : null;

  const isThinkingOn = thinkingProfile
    ? (thinkingProfile.offValue !== undefined
        ? thinkingResolved !== thinkingProfile.offValue
        : true)
    : false;

  // Label for tiered thinking levels (e.g. "Low", "Medium", "High")
  const thinkingLabel = thinkingProfile && thinkingProfile.offValue === undefined
    ? (thinkingProfile.options.find((o) => o.value === thinkingResolved)?.label ?? null)
    : null;

  const handleThinkingClick = () => {
    if (!thinkingProfile || !selectedModelId) return;

    if (thinkingProfile.offValue !== undefined) {
      // Binary: toggle on/off
      const isOn = thinkingResolved !== thinkingProfile.offValue;
      setThinkingForModel(
        selectedModelId,
        isOn ? thinkingProfile.offValue : (thinkingProfile.options[0]?.value ?? true),
      );
    } else {
      // Tiered: cycle through options
      const idx = thinkingProfile.options.findIndex((o) => o.value === thinkingResolved);
      const nextIdx = (idx + 1) % thinkingProfile.options.length;
      setThinkingForModel(selectedModelId, thinkingProfile.options[nextIdx].value);
    }
  };

  const filteredModels = modelSearch.trim()
    ? models.filter((m) => m.name.toLowerCase().includes(modelSearch.toLowerCase()))
    : models;

  // Fetch models once authenticated
  useEffect(() => {
    if (isAuthenticated) {
      fetchModels();
    }
  }, [isAuthenticated]);

  // Auto-select default model when models load
  useEffect(() => {
    if (models.length > 0 && !selectedModelId && defaultModelId) {
      if (models.some((m) => m.id === defaultModelId)) {
        setSelectedModel(defaultModelId);
      }
    }
  }, [models.length]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // When the main process shows this window it sends chatbar:rehydrate so we
  // pick up any auth/settings changes that happened in the main window.
  useEffect(() => {
    window.electronAPI.onChatBarRehydrate(() => {
      useAuthStore.persist.rehydrate();
      useSettingsStore.persist.rehydrate();
      useModelStore.persist.rehydrate();
      useModelPreferencesStore.persist.rehydrate();
      // Apply web-search-by-default setting
      setWebSearch(useSettingsStore.getState().webSearchByDefault);
      // Focus the input every time the window is shown
      requestAnimationFrame(() => inputRef.current?.focus());
    });
    return () => window.electronAPI.removeChatBarRehydrateListener();
  }, []);

  // Handle willHide signal from main process (blur or hotkey toggle)
  useEffect(() => {
    window.electronAPI.onChatBarWillHide(() => {
      setShowModelPicker(false);
      setQuery("");
      setModelSearch("");
      setWebSearch(false);
      // Re-focus input so it's ready next time window appears
      requestAnimationFrame(() => inputRef.current?.focus());
    });
    return () => window.electronAPI.removeChatBarWillHideListener();
  }, []);

  const openModelPicker = () => {
    setModelSearch("");
    window.electronAPI.setChatBarHeight(380);
    setShowModelPicker(true);
    requestAnimationFrame(() => modelSearchRef.current?.focus());
  };

  const closeModelPicker = () => {
    setShowModelPicker(false);
    window.electronAPI.setChatBarHeight(72);
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  const handleSelectModel = (id: string) => {
    setSelectedModel(id);
    closeModelPicker();
  };

  const handleSubmit = () => {
    const q = query.trim();
    if (!q) return;
    window.electronAPI.submitFromChatBar(q, selectedModelId ?? "", webSearch);
    setQuery("");
    setWebSearch(false);
    setShowModelPicker(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
    if (e.key === "Escape") {
      if (showModelPicker) {
        closeModelPicker();
      } else {
        window.electronAPI.hideChatBar();
      }
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="h-full w-full flex items-center justify-center">
        <div className="rounded-2xl bg-surface border border-line px-5 py-3">
          <p className="text-sm text-secondary">Sign in to ONI to use Quick Chat</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full">
      <div className="flex flex-col h-full rounded-2xl bg-elevated border border-line overflow-hidden">

        {/* Input row */}
        <div className="flex items-center h-[72px] shrink-0 px-4 gap-3">
          {/* Quick toggles */}
          <div className="flex items-center gap-1 shrink-0">
            {thinkingProfile && (
              <button
                onClick={handleThinkingClick}
                title={`Thinking${thinkingLabel ? `: ${thinkingLabel}` : ""}`}
                className={`flex items-center gap-1 rounded-lg px-1.5 py-1.5 text-[11px] font-medium transition-colors ${
                  isThinkingOn
                    ? "bg-primary/15 text-primary"
                    : "text-muted hover:text-secondary hover:bg-hover"
                }`}
              >
                <Lightbulb size={14} />
                {thinkingLabel && <span>{thinkingLabel}</span>}
              </button>
            )}
            <button
              onClick={() => setWebSearch((v) => !v)}
              title="Web search"
              className={`flex items-center rounded-lg p-1.5 transition-colors ${
                webSearch
                  ? "bg-primary/15 text-primary"
                  : "text-muted hover:text-secondary hover:bg-hover"
              }`}
            >
              <Globe size={14} />
            </button>
          </div>

          {/* Text input */}
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="What can I help you with today?"
            className="flex-1 bg-transparent text-[13px] text-fg placeholder:text-muted outline-none"
            autoComplete="off"
            spellCheck={false}
          />

          {/* Model selector */}
          <button
            onClick={showModelPicker ? closeModelPicker : openModelPicker}
            className="shrink-0 flex items-center gap-1 text-secondary hover:text-fg text-xs px-2 py-1.5 rounded-lg hover:bg-hover transition-colors max-w-[140px]"
          >
            <span className="truncate">{selectedModel?.name ?? "Model"}</span>
            <ChevronDown
              size={12}
              className={`shrink-0 transition-transform duration-150 ${showModelPicker ? "rotate-180" : ""}`}
            />
          </button>

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={!query.trim()}
            className="shrink-0 w-8 h-8 rounded-xl bg-primary flex items-center justify-center disabled:opacity-25 hover:opacity-90 transition-opacity"
          >
            <ArrowUp size={15} className="text-white" />
          </button>
        </div>

        {/* Model picker panel */}
        {showModelPicker && (
          <div className="flex flex-col border-t border-line flex-1 overflow-hidden">
            {/* Search */}
            <div className="flex items-center gap-2 px-4 py-2.5 border-b border-line">
              <Search size={13} className="shrink-0 text-muted" />
              <input
                ref={modelSearchRef}
                value={modelSearch}
                onChange={(e) => setModelSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") closeModelPicker();
                }}
                placeholder="Filter models…"
                className="flex-1 bg-transparent text-xs text-fg placeholder:text-dim outline-none"
                autoComplete="off"
              />
            </div>

            {/* Model list */}
            <div className="overflow-y-auto flex-1 p-1.5">
              {filteredModels.map((model) => (
                <button
                  key={model.id}
                  onClick={() => handleSelectModel(model.id)}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left hover:bg-hover transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-fg">{model.name}</p>
                    {model.owned_by && (
                      <p className="truncate text-xs text-muted">{model.owned_by}</p>
                    )}
                  </div>
                  {selectedModelId === model.id && (
                    <Check size={13} className="shrink-0 text-primary" />
                  )}
                </button>
              ))}
              {filteredModels.length === 0 && (
                <p className="px-3 py-4 text-center text-xs text-dim">
                  No models match &ldquo;{modelSearch}&rdquo;
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
