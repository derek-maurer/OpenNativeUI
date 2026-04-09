import { useEffect, useRef, useState } from "react";
import { useModelStore } from "@opennative/shared";
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

  const filtered = query.trim()
    ? models.filter(
        (m) =>
          m.name.toLowerCase().includes(query.toLowerCase()) ||
          (m.owned_by ?? "").toLowerCase().includes(query.toLowerCase())
      )
    : models;

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
      <div className="px-4 py-3 border-b border-neutral-700">
        <h3 className="text-sm font-semibold text-white">Select Model</h3>
      </div>
      <div className="flex items-center gap-2.5 px-4 py-2.5 border-b border-neutral-800">
        <Search size={14} className="text-neutral-500 shrink-0" />
        <input
          ref={searchRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Filter models…"
          className="flex-1 bg-transparent text-sm text-white placeholder-neutral-600 focus:outline-none"
        />
      </div>
      <div className="max-h-80 overflow-y-auto p-2">
        {!query.trim() && (
          <button
            onClick={() => handleSelect(null)}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left hover:bg-neutral-700/50 transition-colors"
          >
            <span className="flex-1 text-sm text-neutral-400">None</span>
            {effectiveSelected === null && <Check size={14} className="text-primary" />}
          </button>
        )}
        {filtered.map((model) => (
          <button
            key={model.id}
            onClick={() => handleSelect(model.id)}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left hover:bg-neutral-700/50 transition-colors"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm text-white">{model.name}</p>
              {model.owned_by && (
                <p className="truncate text-xs text-neutral-400">{model.owned_by}</p>
              )}
            </div>
            {effectiveSelected === model.id && (
              <Check size={14} className="shrink-0 text-primary" />
            )}
          </button>
        ))}
        {filtered.length === 0 && (
          <p className="px-3 py-6 text-center text-xs text-neutral-600">No models match "{query}"</p>
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
          ? "flex items-center gap-1 rounded-md px-2 py-1 hover:bg-neutral-700/60 transition-colors max-w-[160px]"
          : "flex items-center gap-1 rounded-lg bg-neutral-700/50 border border-neutral-600 px-2.5 py-1 hover:bg-neutral-700 transition-colors max-w-[160px]"
      }
    >
      <span className="truncate text-xs text-neutral-300">{label}</span>
      <ChevronDown size={12} className="shrink-0 text-neutral-400" />
    </button>
  );
}
