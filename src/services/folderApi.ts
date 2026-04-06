import { apiGet, apiPost, apiDelete } from "@/services/api";
import { API_PATHS } from "@/lib/constants";
import type { Folder } from "@/lib/types";

export async function fetchFolders(): Promise<Folder[]> {
  return apiGet<Folder[]>(API_PATHS.FOLDERS);
}

export async function createFolder(name: string): Promise<Folder> {
  return apiPost<Folder>(API_PATHS.FOLDERS, { name });
}

export async function updateFolderName(
  id: string,
  name: string
): Promise<Folder> {
  return apiPost<Folder>(API_PATHS.FOLDER_UPDATE(id), { name });
}

export async function updateFolderParent(
  id: string,
  parentId: string | null
): Promise<Folder> {
  return apiPost<Folder>(API_PATHS.FOLDER_UPDATE_PARENT(id), {
    parent_id: parentId,
  });
}

export async function updateFolderExpanded(
  id: string,
  isExpanded: boolean
): Promise<Folder> {
  return apiPost<Folder>(API_PATHS.FOLDER_UPDATE_EXPANDED(id), {
    is_expanded: isExpanded,
  });
}

export async function deleteFolder(id: string): Promise<void> {
  await apiDelete(API_PATHS.FOLDER_BY_ID(id));
}

export async function assignChatToFolder(
  chatId: string,
  folderId: string | null
): Promise<void> {
  await apiPost(API_PATHS.CHAT_FOLDER(chatId), { folder_id: folderId });
}

/**
 * Fetch IDs of chats that belong to a folder. Uses the full
 * `/api/v1/chats/folder/{folder_id}` endpoint — we only care about IDs,
 * so we discard the rest of the payload. Server-side this recursively
 * includes chats from nested child folders; for our flat-folder model
 * that's a no-op.
 */
export async function fetchChatIdsInFolder(
  folderId: string
): Promise<string[]> {
  const chats = await apiGet<Array<{ id: string }>>(
    API_PATHS.CHATS_IN_FOLDER(folderId)
  );
  return chats.map((c) => c.id);
}
