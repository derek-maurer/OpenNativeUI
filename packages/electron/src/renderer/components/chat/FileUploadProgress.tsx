import { useChatStore } from "@opennative/shared";
import { X, File, Loader2, AlertCircle } from "lucide-react";

export function FileUploadProgress() {
  const pendingFiles = useChatStore((s) => s.pendingFiles);
  const removePendingFile = useChatStore((s) => s.removePendingFile);

  if (pendingFiles.length === 0) return null;

  return (
    <div className="flex gap-2 overflow-x-auto px-4 py-2">
      {pendingFiles.map((file) => (
        <div
          key={file.id}
          className="flex shrink-0 items-center gap-2 rounded-xl border border-line-strong bg-surface px-3 py-2 max-w-[200px]"
        >
          {/* Preview or icon */}
          {file.dataUrl ? (
            <img
              src={file.dataUrl}
              alt={file.name}
              className="h-8 w-8 rounded-lg object-cover shrink-0"
            />
          ) : (
            <File size={16} className="shrink-0 text-secondary" />
          )}

          <div className="min-w-0 flex-1">
            <p className="truncate text-xs text-fg">{file.name}</p>
            <p className="text-[10px] text-secondary">
              {file.status === "uploading"
                ? "Uploading…"
                : file.status === "processing"
                ? "Processing…"
                : file.status === "error"
                ? "Error"
                : "Ready"}
            </p>
          </div>

          {/* Status icon */}
          {file.status === "uploading" || file.status === "processing" ? (
            <Loader2 size={12} className="shrink-0 animate-spin text-secondary" />
          ) : file.status === "error" ? (
            <AlertCircle size={12} className="shrink-0 text-red-400" />
          ) : null}

          {/* Remove */}
          {(file.status === "ready" || file.status === "error") && (
            <button
              onClick={() => removePendingFile(file.id)}
              className="shrink-0 text-muted hover:text-fg transition-colors"
            >
              <X size={12} />
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
