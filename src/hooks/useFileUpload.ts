import { useCallback } from "react";
import * as DocumentPicker from "expo-document-picker";
import * as Crypto from "expo-crypto";

import { useChatStore } from "@/stores/chatStore";
import {
  uploadFile,
  pollUntilReady,
} from "@/services/fileUpload";

export function useFileUpload() {
  const addPendingFile = useChatStore((s) => s.addPendingFile);
  const updateFileStatus = useChatStore((s) => s.updateFileStatus);
  const removePendingFile = useChatStore((s) => s.removePendingFile);

  const pickAndUpload = useCallback(async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          "application/pdf",
          "text/plain",
          "text/markdown",
          "text/csv",
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        ],
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets?.[0]) return;

      const asset = result.assets[0];
      const tempId = Crypto.randomUUID();

      addPendingFile({
        id: tempId,
        name: asset.name,
        size: asset.size ?? 0,
        status: "uploading",
      });

      try {
        const { id: fileId } = await uploadFile(
          asset.uri,
          asset.name,
          asset.mimeType ?? "application/octet-stream"
        );

        // Update with real file ID from server
        removePendingFile(tempId);
        addPendingFile({
          id: fileId,
          name: asset.name,
          size: asset.size ?? 0,
          status: "processing",
        });

        // Poll until ready
        await pollUntilReady(fileId);
        updateFileStatus(fileId, "ready");
      } catch {
        updateFileStatus(tempId, "error");
      }
    } catch {
      // User cancelled or picker error
    }
  }, []);

  return { pickAndUpload, removePendingFile };
}
