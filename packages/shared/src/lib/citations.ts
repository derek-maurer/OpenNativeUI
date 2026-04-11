import type { MessageSource } from "./types";

export interface Citation {
  url: string;
  title: string;
}

/**
 * Flatten Open WebUI's nested source bundles into a flat citation list.
 *
 * The model writes `[N]` tokens against the flat concatenation of
 * `sources[i].metadata[]` across all bundles, so e.g. with two bundles of
 * 3 docs each, `[4]` refers to the first doc of the second bundle.
 *
 * Bundles without per-doc URLs (`metadata[j].source`) fall back to the
 * bundle-level `source.urls[j]` so RAG/file sources still resolve when
 * possible. Entries without any usable URL are dropped.
 */
export function flattenCitations(sources: MessageSource[] | undefined): Citation[] {
  if (!sources || sources.length === 0) return [];
  const out: Citation[] = [];
  for (const bundle of sources) {
    const docs = bundle.document ?? [];
    const meta = bundle.metadata ?? [];
    const fallbackUrls = bundle.source?.urls ?? [];
    const count = Math.max(docs.length, meta.length);
    for (let j = 0; j < count; j++) {
      const m = meta[j];
      const url = m?.source ?? fallbackUrls[j];
      if (!url) continue;
      out.push({
        url,
        title: m?.title ?? docs[j] ?? url,
      });
    }
  }
  return out;
}

export function getDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

/** Returns a Google S2 favicon URL for the given page URL. */
export function getFaviconUrl(url: string, size = 64): string {
  return `https://www.google.com/s2/favicons?domain=${getDomain(url)}&sz=${size}`;
}
