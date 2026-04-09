import { useEffect, useRef, useState } from "react";
import { useChatStore } from "@opennative/shared";
import { Plus, ArrowUp, Square } from "lucide-react";
import { ModelSelectorTrigger, ModelPickerOverlay } from "./ModelSelector";
import { ChatOptionsPanel } from "./ChatOptionsPanel";
import { FileUploadProgress } from "./FileUploadProgress";
import { FolderPicker } from "../folders/FolderPicker";
import { useFileUpload } from "../../hooks/useFileUpload";

interface InputComposerProps {
  onSend: (content: string) => void;
  onAbort: () => void;
  disabled?: boolean;
}

export function InputComposer({ onSend, onAbort, disabled }: InputComposerProps) {
  const [text, setText] = useState("");
  const [showOptions, setShowOptions] = useState(false);
  const [showModelPicker, setShowModelPicker] = useState(false);
  const [showFolderPicker, setShowFolderPicker] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { textareaRef.current?.focus(); }, []);

  const isStreaming = useChatStore((s) => s.isStreaming);
  const webSearchEnabled = useChatStore((s) => s.webSearchEnabled);
  const { uploadFile } = useFileUpload();

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    // Auto-resize
    const el = e.target;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed || isStreaming || disabled) return;
    setText("");
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
    onSend(trimmed);
  };

  const handleAttachFile = async () => {
    await uploadFile();
  };

  const plusActive = webSearchEnabled;

  return (
    <div className="relative border-t border-neutral-800 bg-[#0d0d0d]">
      <FileUploadProgress />

      <div className="flex items-end gap-2 px-4 py-3">
        {/* Options toggle */}
        <div className="relative">
          <button
            onClick={() => setShowOptions((v) => !v)}
            className={`flex h-8 w-8 items-center justify-center rounded-full border transition-colors ${
              plusActive || showOptions
                ? "border-primary bg-primary/20 text-primary"
                : "border-neutral-700 text-neutral-400 hover:border-neutral-600 hover:text-white"
            }`}
          >
            <Plus size={16} />
          </button>
          <ChatOptionsPanel
            visible={showOptions}
            onClose={() => setShowOptions(false)}
            onAttachFile={handleAttachFile}
            onOpenFolderPicker={() => setShowFolderPicker(true)}
          />
        </div>

        {/* Unified text input + model selector container */}
        <div className="flex flex-1 items-end rounded-xl bg-[#1a1a1a] border border-neutral-700 focus-within:border-neutral-600 transition-colors">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            placeholder="Message…"
            maxLength={10000}
            rows={1}
            disabled={disabled}
            className="flex-1 resize-none bg-transparent px-3 py-2 text-sm text-white placeholder-neutral-500 focus:outline-none disabled:opacity-50"
            style={{ minHeight: "36px", maxHeight: "160px" }}
          />
          <div className="flex items-center self-end px-1 pb-1">
            <ModelSelectorTrigger inline onPress={() => setShowModelPicker(true)} />
          </div>
        </div>

        {/* Send / Stop */}
        {isStreaming ? (
          <button
            onClick={onAbort}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-600 text-white hover:bg-red-700 transition-colors"
          >
            <Square size={14} />
          </button>
        ) : (
          <button
            onClick={handleSend}
            disabled={!text.trim() || disabled}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-white hover:bg-emerald-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <ArrowUp size={16} />
          </button>
        )}
      </div>

      {/* Model picker modal */}
      <ModelPickerOverlay
        visible={showModelPicker}
        onClose={() => setShowModelPicker(false)}
      />

      {/* Folder picker modal */}
      <FolderPicker
        visible={showFolderPicker}
        onClose={() => setShowFolderPicker(false)}
      />
    </div>
  );
}
