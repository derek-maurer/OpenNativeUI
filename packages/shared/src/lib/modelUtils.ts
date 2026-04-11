import type { Model } from "./types";

/**
 * Filter a list of models by a search query against model name and owner.
 * Returns the full list when query is empty/whitespace.
 */
export function filterModels(models: Model[], query: string): Model[] {
  const q = query.trim().toLowerCase();
  if (!q) return models;
  return models.filter(
    (m) =>
      m.name.toLowerCase().includes(q) ||
      (m.owned_by ?? "").toLowerCase().includes(q)
  );
}
