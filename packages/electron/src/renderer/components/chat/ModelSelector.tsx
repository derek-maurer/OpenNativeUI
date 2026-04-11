import { useEffect, useRef, useState } from "react";
import { useModelStore, filterModels } from "@opennative/shared";
import { ChevronDown, Check, Search } from "lucide-react";
import { Modal } from "../ui/Modal";

interface ModelPickerOverlayProps {
  visible: boolean;
  onClose: () => void;
  onSelect?: (modelId: string | null) => void;
  selectedModelId?: string | null;
}

export function ModelPickerOverlay({
  visible,
  onClose,
  onSelect,
  selectedModelId,
}: ModelPickerOverlayProps) {
  const models = useModelStore((s) => s.models);
  const storeSelectedId = useModelStore((s) => s.selectedModelId);
  const setSelectedModel = useModelStore((s) => s.setSelectedModel);
  const [query, setQuery] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);

  const effectiveSelected = selectedModelId !== undefined ? selectedModelId : storeSelectedId;

  const filtered = filterModels(models, query);

  // Reset search and focus input when opened
  useEffect(() => {
    if (visible) {
      setQuery("");
      requestAnimationFrame(() => searchRef.current?.focus());
    }
  }, [visible]);

  const handleSelect = (id: string | null) => {
    if (onSelect) {
      onSelect(id);
    } else {
      setSelectedModel(id);
    }
    onClose();
  };

  return (
    <Modal visible={visible} onClose={onClose} width="max-w-[360px]">
      <div className="px-4 py-3 border-b border-line-strong">
        <h3 className="text-sm font-semibold text-fg">Select Model</h3>
      </div>
      <div className="flex items-center gap-2.5 px-4 py-2.5 border-b border-line">
        <Search size={14} className="text-muted shrink-0" />
        <input
          ref={searchRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Filter models…"
          className="flex-1 bg-transparent text-sm text-fg placeholder-dim focus:outline-none"
        />
      </div>
      <div className="max-h-80 overflow-y-auto p-2">
        {!query.trim() && (
          <button
            onClick={() => handleSelect(null)}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left hover:bg-hover transition-colors"
          >
            <span className="flex-1 text-sm text-secondary">None</span>
            {effectiveSelected === null && <Check size={14} className="text-primary" />}
          </button>
        )}
        {filtered.map((model) => (
          <button
            key={model.id}
            onClick={() => handleSelect(model.id)}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left hover:bg-hover transition-colors"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm text-fg">{model.name}</p>
              {model.owned_by && (
                <p className="truncate text-xs text-secondary">{model.owned_by}</p>
              )}
            </div>
            {effectiveSelected === model.id && (
              <Check size={14} className="shrink-0 text-primary" />
            )}
          </button>
        ))}
        {filtered.length === 0 && (
          <p className="px-3 py-6 text-center text-xs text-dim">No models match "{query}"</p>
        )}
      </div>
    </Modal>
  );
}

interface ModelSelectorTriggerProps {
  onPress: () => void;
  inline?: boolean;
}

export function ModelSelectorTrigger({ onPress, inline }: ModelSelectorTriggerProps) {
  const selectedModelId = useModelStore((s) => s.selectedModelId);
  const models = useModelStore((s) => s.models);
  const isLoading = useModelStore((s) => s.isLoading);

  const selectedModel = models.find((m) => m.id === selectedModelId);
  const label = isLoading
    ? "Loading…"
    : selectedModel?.name ?? (selectedModelId ? selectedModelId : "Select model");

  return (
    <button
      onClick={onPress}
      className={
        inline
          ? "flex items-center gap-1 rounded-md px-2 py-1 hover:bg-hover transition-colors max-w-[160px]"
          : "flex items-center gap-1 rounded-lg bg-hover border border-line px-2.5 py-1 hover:bg-hover transition-colors max-w-[160px]"
      }
    >
      <span className="truncate text-xs text-fg">{label}</span>
      <ChevronDown size={12} className="shrink-0 text-secondary" />
    </button>
  );
}
