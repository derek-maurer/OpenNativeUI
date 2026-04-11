import type { Conversation, Folder } from "@opennative/shared";

/**
 * Rank folders by most recent activity — the max `updatedAt` across
 * conversations in the folder. Folders with no conversations fall back
 * to their own server-side `updated_at`. Returns top N.
 */
export function getRecentFolders(
  folders: Folder[],
  conversations: Conversation[],
  limit: number
): Array<{ folder: Folder; count: number }> {
  const stats = new Map<string, { count: number; lastActivity: number }>();

  for (const folder of folders) {
    stats.set(folder.id, {
      count: 0,
      lastActivity: (folder.updated_at ?? 0) * 1000,
    });
  }

  for (const conv of conversations) {
    if (!conv.folderId) continue;
    const entry = stats.get(conv.folderId);
    if (!entry) continue;
    entry.count += 1;
    if (conv.updatedAt > entry.lastActivity) {
      entry.lastActivity = conv.updatedAt;
    }
  }

  return folders
    .map((folder) => ({
      folder,
      count: stats.get(folder.id)?.count ?? 0,
      lastActivity: stats.get(folder.id)?.lastActivity ?? 0,
    }))
    .sort((a, b) => b.lastActivity - a.lastActivity)
    .slice(0, limit)
    .map(({ folder, count }) => ({ folder, count }));
}
