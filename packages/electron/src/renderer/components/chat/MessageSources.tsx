import { useState } from "react";
import { ExternalLink, X } from "lucide-react";
import { Modal } from "../ui/Modal";
import { flattenCitations, getDomain, getFaviconUrl } from "@opennative/shared";
import type { MessageSource } from "@opennative/shared";
export { flattenCitations };

interface MessageSourcesProps {
  sources: MessageSource[];
}

export function MessageSources({ sources }: MessageSourcesProps) {
  const [modalVisible, setModalVisible] = useState(false);
  const citations = flattenCitations(sources);

  if (citations.length === 0) return null;

  const previewCount = Math.min(3, citations.length);

  return (
    <>
      <button
        onClick={() => setModalVisible(true)}
        className="mt-2 flex items-center gap-1.5 rounded-xl border border-line-strong bg-surface px-3 py-2 hover:bg-hover transition-colors"
      >
        {/* Stacked favicon preview */}
        <div className="flex -space-x-1.5">
          {citations.slice(0, previewCount).map((cite, i) => (
            <img
              key={i}
              src={getFaviconUrl(cite.url, 32)}
              alt=""
              className="h-4 w-4 rounded-sm border border-line bg-surface"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
          ))}
        </div>
        <span className="text-xs text-secondary">
          {citations.length} source{citations.length !== 1 ? "s" : ""}
        </span>
      </button>

      <Modal visible={modalVisible} onClose={() => setModalVisible(false)} width="max-w-md">
        <div className="flex items-center justify-between px-4 py-3 border-b border-line-strong">
          <h3 className="text-sm font-semibold text-fg">Sources</h3>
          <button
            onClick={() => setModalVisible(false)}
            className="text-secondary hover:text-fg transition-colors"
          >
            <X size={16} />
          </button>
        </div>
        <div className="max-h-96 overflow-y-auto p-4 flex flex-col gap-2">
          {citations.map((cite, i) => {
            const domain = getDomain(cite.url);
            return (
              <button
                key={i}
                onClick={() => window.electronAPI.openExternal(cite.url)}
                className="flex items-start gap-3 rounded-xl bg-surface border border-line-strong p-3 text-left hover:bg-hover transition-colors"
              >
                <span className="mt-0.5 shrink-0 flex h-5 w-5 items-center justify-center rounded text-[10px] font-bold text-secondary border border-line-strong">
                  {i + 1}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-fg truncate">{cite.title}</p>
                  {domain && (
                    <p className="text-xs text-secondary flex items-center gap-1 mt-0.5">
                      <img
                        src={getFaviconUrl(cite.url, 32)}
                        alt=""
                        className="h-3 w-3"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = "none";
                        }}
                      />
                      {domain}
                      <ExternalLink size={10} className="ml-1 opacity-60" />
                    </p>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </Modal>
    </>
  );
}
