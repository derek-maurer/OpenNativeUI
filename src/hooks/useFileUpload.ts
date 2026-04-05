import { useCallback } from "react";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
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

  const uploadAsset = useCallback(
    async (uri: string, name: string, mimeType: string, size: number) => {
      const tempId = Crypto.randomUUID();

      addPendingFile({
        id: tempId,
        name,
        size,
        status: "uploading",
      });

      try {
        const { id: fileId } = await uploadFile(uri, name, mimeType);

        removePendingFile(tempId);
        addPendingFile({
          id: fileId,
          name,
          size,
          status: "processing",
        });

        await pollUntilReady(fileId);
        updateFileStatus(fileId, "ready");
      } catch {
        updateFileStatus(tempId, "error");
      }
    },
    []
  );

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
      await uploadAsset(
        asset.uri,
        asset.name,
        asset.mimeType ?? "application/octet-stream",
        asset.size ?? 0
      );
    } catch {
      // User cancelled or picker error
    }
  }, []);

  const pickPhotoAndUpload = useCallback(async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        quality: 0.8,
      });

      if (result.canceled || !result.assets?.[0]) return;

      const asset = result.assets[0];
      const filename =
        asset.fileName ?? `photo_${Date.now()}.${asset.type === "image" ? "jpg" : "mp4"}`;
      await uploadAsset(
        asset.uri,
        filename,
        asset.mimeType ?? "image/jpeg",
        asset.fileSize ?? 0
      );
    } catch {
      // User cancelled or picker error
    }
  }, []);

  return { pickAndUpload, pickPhotoAndUpload, removePendingFile };
}
