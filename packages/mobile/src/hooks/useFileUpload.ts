import { useCallback } from "react";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import { File as ExpoFile } from "expo-file-system";
import * as Crypto from "expo-crypto";

import { useChatStore, uploadFile, waitUntilProcessed, IMAGE_RESIZE_MAX_EDGE } from "@opennative/shared";

export function useFileUpload() {
  const addPendingFile = useChatStore((s) => s.addPendingFile);
  const updateFileStatus = useChatStore((s) => s.updateFileStatus);
  const removePendingFile = useChatStore((s) => s.removePendingFile);

  /** Upload a document (non-image) to the server. */
  const uploadDocument = useCallback(
    async (uri: string, name: string, mimeType: string, size: number) => {
      const tempId = Crypto.randomUUID();

      addPendingFile({
        id: tempId,
        name,
        size,
        status: "uploading",
        uri,
        mimeType,
      });

      let fileId: string | undefined;
      try {
        console.log(`[useFileUpload] uploading "${name}" (${mimeType}, ${size}B)`);
        const result = await uploadFile(uri, name, mimeType);
        fileId = result.id;
        console.log(`[useFileUpload] "${name}" uploaded, fileId=${fileId} — waiting for processing`);

        removePendingFile(tempId);
        addPendingFile({
          id: fileId,
          name,
          size,
          status: "uploading",
          uri,
          mimeType,
        });

        await waitUntilProcessed(fileId);
        updateFileStatus(fileId, "ready");
        console.log(`[useFileUpload] "${name}" processed and ready`);
      } catch (err) {
        console.error(`[useFileUpload] failed for "${name}":`, err);
        updateFileStatus(fileId ?? tempId, "error");
      }
    },
    []
  );

  /**
   * Prepare an image for sending:
   * 1. Convert to base64 data URL (used inline in the chat completion request)
   * 2. Upload to server (so the image is visible in the Open WebUI web client)
   */
  const prepareImage = useCallback(
    async (uri: string, name: string, mimeType: string, size: number) => {
      const tempId = Crypto.randomUUID();

      addPendingFile({
        id: tempId,
        name,
        size,
        status: "uploading",
        uri,
        mimeType,
      });

      try {
        // Read file as base64 for the chat completion request
        const file = new ExpoFile(uri);
        const base64 = await file.base64();
        const dataUrl = `data:${mimeType};base64,${base64}`;

        // Upload to server for web UI persistence
        let serverId: string | undefined;
        try {
          const result = await uploadFile(uri, name, mimeType);
          serverId = result.id;
        } catch (err) {
          console.warn("[useFileUpload] server upload failed, image will still work locally:", err);
        }

        removePendingFile(tempId);
        addPendingFile({
          id: serverId ?? tempId,
          name,
          size,
          status: "ready",
          uri,
          mimeType,
          dataUrl,
        });
      } catch (err) {
        console.error("[useFileUpload] image prepare failed:", err);
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
      await uploadDocument(
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

      // Downscale large photos and convert to JPEG (avoids HEIC issues and
      // keeps the inline base64 payload sent to the model from ballooning).
      const MAX_EDGE = IMAGE_RESIZE_MAX_EDGE;
      const longEdge = Math.max(asset.width ?? 0, asset.height ?? 0);
      const actions: ImageManipulator.Action[] =
        longEdge > MAX_EDGE
          ? [
              {
                resize:
                  (asset.width ?? 0) >= (asset.height ?? 0)
                    ? { width: MAX_EDGE }
                    : { height: MAX_EDGE },
              },
            ]
          : [];

      const manipulated = await ImageManipulator.manipulateAsync(
        asset.uri,
        actions,
        { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
      );

      const rawName = asset.fileName ?? `photo_${Date.now()}`;
      const filename = rawName.replace(/\.\w+$/, "") + ".jpg";
      await prepareImage(
        manipulated.uri,
        filename,
        "image/jpeg",
        asset.fileSize ?? 0
      );
    } catch {
      // User cancelled or picker error
    }
  }, []);

  return { pickAndUpload, pickPhotoAndUpload, removePendingFile };
}
