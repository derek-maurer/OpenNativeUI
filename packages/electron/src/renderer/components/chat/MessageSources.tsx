import { useState } from "react";
import { ExternalLink, X } from "lucide-react";
import { Modal } from "../ui/Modal";
import type { MessageSource, MessageSourceMetadata } from "@opennative/shared";

interface MessageSourcesProps {
  sources: MessageSource[];
}

function getDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function faviconUrl(url: string): string {
  try {
    const origin = new URL(url).origin;
    return `https://www.google.com/s2/favicons?domain=${origin}&sz=32`;
  } catch {
    return "";
  }
}

export function flattenCitations(sources: MessageSource[]): MessageSourceMetadata[] {
  return sources.flatMap((s) => s.metadata ?? []);
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
        className="mt-2 flex items-center gap-1.5 rounded-xl border border-neutral-700 bg-neutral-800/50 px-3 py-2 hover:bg-neutral-700/50 transition-colors"
      >
        {/* Stacked favicon preview */}
        <div className="flex -space-x-1.5">
          {citations.slice(0, previewCount).map((cite, i) => {
            const url = cite.source ?? "";
            return (
              <img
                key={i}
                src={faviconUrl(url)}
                alt=""
                className="h-4 w-4 rounded-sm border border-neutral-700 bg-neutral-800"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
            );
          })}
        </div>
        <span className="text-xs text-neutral-400">
          {citations.length} source{citations.length !== 1 ? "s" : ""}
        </span>
      </button>

      <Modal visible={modalVisible} onClose={() => setModalVisible(false)} width="max-w-md">
        <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-700">
          <h3 className="text-sm font-semibold text-white">Sources</h3>
          <button
            onClick={() => setModalVisible(false)}
            className="text-neutral-400 hover:text-white transition-colors"
          >
            <X size={16} />
          </button>
        </div>
        <div className="max-h-96 overflow-y-auto p-4 flex flex-col gap-2">
          {citations.map((cite, i) => {
            const url = cite.source ?? "";
            const title = cite.title ?? getDomain(url) ?? `Source ${i + 1}`;
            const domain = getDomain(url);
            return (
              <button
                key={i}
                onClick={() => url && window.open(url, "_blank")}
                disabled={!url}
                className="flex items-start gap-3 rounded-xl bg-neutral-800 border border-neutral-700 p-3 text-left hover:bg-neutral-700 transition-colors disabled:opacity-50 disabled:cursor-default"
              >
                <span className="mt-0.5 shrink-0 flex h-5 w-5 items-center justify-center rounded text-[10px] font-bold text-neutral-400 border border-neutral-600">
                  {i + 1}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-white truncate">{title}</p>
                  {domain && (
                    <p className="text-xs text-neutral-400 flex items-center gap-1 mt-0.5">
                      <img
                        src={faviconUrl(url)}
                        alt=""
                        className="h-3 w-3"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = "none";
                        }}
                      />
                      {domain}
                      {url && <ExternalLink size={10} className="ml-1 opacity-60" />}
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
