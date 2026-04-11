import type { Conversation } from "./types";

export interface ConversationDateGroup {
  title: string;
  data: Conversation[];
}

/**
 * Group conversations into "Today / Yesterday / Previous 7 Days / Older"
 * buckets using `updatedAt` and absolute midnight boundaries so the grouping
 * is consistent between platforms.
 *
 * Only non-empty groups are returned.
 */
export function groupConversationsByDate(
  conversations: Conversation[]
): ConversationDateGroup[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayMs = today.getTime();
  const yesterdayMs = todayMs - 86_400_000;
  const weekAgoMs = todayMs - 7 * 86_400_000;

  const todayItems: Conversation[] = [];
  const yesterdayItems: Conversation[] = [];
  const weekItems: Conversation[] = [];
  const olderItems: Conversation[] = [];

  for (const conv of conversations) {
    if (conv.updatedAt >= todayMs) todayItems.push(conv);
    else if (conv.updatedAt >= yesterdayMs) yesterdayItems.push(conv);
    else if (conv.updatedAt >= weekAgoMs) weekItems.push(conv);
    else olderItems.push(conv);
  }

  const groups: ConversationDateGroup[] = [];
  if (todayItems.length) groups.push({ title: "Today", data: todayItems });
  if (yesterdayItems.length) groups.push({ title: "Yesterday", data: yesterdayItems });
  if (weekItems.length) groups.push({ title: "Previous 7 Days", data: weekItems });
  if (olderItems.length) groups.push({ title: "Older", data: olderItems });
  return groups;
}

/**
 * Case-insensitive substring filter on conversation title.
 * Returns the full list when query is empty/whitespace.
 */
export function filterConversations(
  conversations: Conversation[],
  query: string
): Conversation[] {
  const q = query.trim().toLowerCase();
  if (!q) return conversations;
  return conversations.filter((c) =>
    (c.title ?? "").toLowerCase().includes(q)
  );
}
