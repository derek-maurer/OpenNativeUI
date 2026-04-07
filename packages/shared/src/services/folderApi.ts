import { apiGet, apiPost, apiDelete } from "./api";
import { API_PATHS } from "../lib/constants";
import type { Folder, FolderData } from "../lib/types";

export async function fetchFolders(): Promise<Folder[]> {
  return apiGet<Folder[]>(API_PATHS.FOLDERS);
}

/**
 * Fetch a single folder including its `data` blob (system_prompt, files).
 * The list endpoint omits these fields, so call this when entering the
 * folder detail screen.
 */
export async function fetchFolderById(id: string): Promise<Folder> {
  return apiGet<Folder>(API_PATHS.FOLDER_BY_ID(id));
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

/**
 * Patch the folder's `data` blob (system_prompt and/or files).
 * The server shallow-merges top-level keys, so omitted keys are preserved
 * but nested arrays/objects (e.g. `files`) are replaced wholesale — always
 * send the full intended `files` array when changing it.
 */
export async function updateFolderData(
  id: string,
  data: FolderData
): Promise<Folder> {
  return apiPost<Folder>(API_PATHS.FOLDER_UPDATE(id), { data });
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
