import { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@react-navigation/native";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";

import { BottomSheet } from "@/components/common/BottomSheet";
import {
  uploadFile,
  waitUntilProcessed,
  useFolderStore,
  IMAGE_RESIZE_MAX_EDGE,
  type Folder,
  type FolderFileRef,
} from "@opennative/shared";

interface FolderEditSheetProps {
  visible: boolean;
  onClose: () => void;
  folder: Folder | undefined;
}

type PendingFile = FolderFileRef & {
  /** True while the file is uploading or processing on the server. */
  pending?: boolean;
  /** True if the upload failed; user can retry by re-picking. */
  error?: boolean;
};

export function FolderEditSheet({ visible, onClose, folder }: FolderEditSheetProps) {
  const { dark, colors } = useTheme();
  const renameFolder = useFolderStore((s) => s.renameFolder);
  const updateFolderData = useFolderStore((s) => s.updateFolderData);

  const [name, setName] = useState("");
  const [systemPrompt, setSystemPrompt] = useState("");
  const [files, setFiles] = useState<PendingFile[]>([]);
  const [saving, setSaving] = useState(false);

  // Hydrate from the folder whenever the sheet opens or the folder changes.
  useEffect(() => {
    if (!visible || !folder) return;
    setName(folder.name);
    setSystemPrompt(folder.data?.system_prompt ?? "");
    setFiles(folder.data?.files ?? []);
  }, [visible, folder]);

  const sheetBg = dark ? "#1a1a1a" : "#fff";
  const fieldBg = dark ? "#262626" : "#f5f5f5";
  const subtleText = "#737373";
  const accent = "#10a37f";

  const hasPendingUploads = files.some((f) => f.pending);

  const handleUploadDocument = useCallback(async () => {
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
      const placeholderId = `local-${Date.now()}`;
      setFiles((prev) => [
        ...prev,
        { type: "file", id: placeholderId, name: asset.name, pending: true },
      ]);

      try {
        const { id: serverId } = await uploadFile(
          asset.uri,
          asset.name,
          asset.mimeType ?? "application/octet-stream"
        );
        // Replace placeholder with the real file id, still pending until processed.
        setFiles((prev) =>
          prev.map((f) =>
            f.id === placeholderId
              ? { type: "file", id: serverId, name: asset.name, pending: true }
              : f
          )
        );
        await waitUntilProcessed(serverId);
        setFiles((prev) =>
          prev.map((f) =>
            f.id === serverId ? { ...f, pending: false } : f
          )
        );
      } catch (err) {
        console.error("[FolderEditSheet] document upload failed:", err);
        setFiles((prev) =>
          prev.map((f) =>
            f.id === placeholderId
              ? { ...f, pending: false, error: true }
              : f
          )
        );
      }
    } catch {
      // picker cancelled
    }
  }, []);

  const handleUploadPhoto = useCallback(async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        quality: 0.8,
      });
      if (result.canceled || !result.assets?.[0]) return;
      const asset = result.assets[0];

      // Downscale + JPEG-convert to keep payloads sane (matches the chat
      // composer's image flow).
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

      const placeholderId = `local-${Date.now()}`;
      setFiles((prev) => [
        ...prev,
        { type: "file", id: placeholderId, name: filename, pending: true },
      ]);

      try {
        const { id: serverId } = await uploadFile(
          manipulated.uri,
          filename,
          "image/jpeg"
        );
        // Images can't be RAG-indexed so Open WebUI marks their processing
        // status as "failed" immediately — skip pollUntilReady, the file
        // is usable as soon as the upload returns a server id.
        setFiles((prev) =>
          prev.map((f) =>
            f.id === placeholderId
              ? { type: "file", id: serverId, name: filename, pending: false }
              : f
          )
        );
      } catch (err) {
        console.error("[FolderEditSheet] photo upload failed:", err);
        setFiles((prev) =>
          prev.map((f) =>
            f.id === placeholderId
              ? { ...f, pending: false, error: true }
              : f
          )
        );
      }
    } catch {
      // picker cancelled
    }
  }, []);

  const handleRemoveFile = useCallback((id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  }, []);

  const handleSave = useCallback(async () => {
    if (!folder) return;
    if (hasPendingUploads) {
      Alert.alert("Uploads in progress", "Wait for files to finish uploading before saving.");
      return;
    }

    setSaving(true);
    try {
      // Rename if changed.
      const trimmedName = name.trim();
      if (trimmedName && trimmedName !== folder.name) {
        await renameFolder(folder.id, trimmedName);
      }

      // Build the data patch. Only include `system_prompt` if non-empty —
      // sending "" hits an upstream bug where it overrides the model default.
      const cleanFiles: FolderFileRef[] = files
        .filter((f) => !f.error && !f.pending)
        .map(({ type, id, name }) => ({ type, id, name }));

      const trimmedPrompt = systemPrompt.trim();
      const dataPatch: { system_prompt?: string; files: FolderFileRef[] } = {
        files: cleanFiles,
      };
      if (trimmedPrompt) {
        dataPatch.system_prompt = trimmedPrompt;
      }

      await updateFolderData(folder.id, dataPatch);
      onClose();
    } catch (err) {
      console.error("[FolderEditSheet] save failed:", err);
      Alert.alert("Save failed", "Could not update the folder. Please try again.");
    } finally {
      setSaving(false);
    }
  }, [folder, name, systemPrompt, files, hasPendingUploads, renameFolder, updateFolderData, onClose]);

  if (!folder) return null;

  return (
    <BottomSheet visible={visible} onClose={onClose} backgroundColor={sheetBg} maxHeight="90%">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 24 : 0}
      >
        <View style={styles.headerRow}>
          <Text style={[styles.title, { color: colors.text }]}>Edit Folder</Text>
          <Pressable onPress={onClose} hitSlop={8}>
            <Ionicons name="close" size={22} color={colors.text} />
          </Pressable>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Folder name */}
          <Text style={[styles.label, { color: subtleText }]}>Folder Name</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Folder name"
            placeholderTextColor={subtleText}
            style={[
              styles.input,
              { backgroundColor: fieldBg, color: colors.text },
            ]}
          />

          {/* System prompt */}
          <Text style={[styles.label, { color: subtleText, marginTop: 18 }]}>
            System Prompt
          </Text>
          <TextInput
            value={systemPrompt}
            onChangeText={setSystemPrompt}
            placeholder="Write your model system prompt content here..."
            placeholderTextColor={subtleText}
            multiline
            textAlignVertical="top"
            style={[
              styles.input,
              styles.multiline,
              { backgroundColor: fieldBg, color: colors.text },
            ]}
          />

          {/* Files */}
          <Text style={[styles.label, { color: subtleText, marginTop: 18 }]}>
            Files
          </Text>
          {files.length === 0 ? (
            <Text style={[styles.emptyHint, { color: subtleText }]}>
              No files attached. Upload a document or photo below.
            </Text>
          ) : (
            <View style={{ marginTop: 4 }}>
              {files.map((file) => (
                <View
                  key={file.id}
                  style={[styles.fileRow, { backgroundColor: fieldBg }]}
                >
                  <Ionicons
                    name={
                      file.type === "collection"
                        ? "library-outline"
                        : "document-outline"
                    }
                    size={18}
                    color={file.error ? "#ef4444" : subtleText}
                    style={{ marginRight: 10 }}
                  />
                  <Text
                    style={[
                      styles.fileName,
                      { color: file.error ? "#ef4444" : colors.text },
                    ]}
                    numberOfLines={1}
                  >
                    {file.name ?? file.id}
                  </Text>
                  {file.pending ? (
                    <ActivityIndicator size="small" color={accent} style={{ marginLeft: 8 }} />
                  ) : (
                    <Pressable onPress={() => handleRemoveFile(file.id)} hitSlop={8}>
                      <Ionicons name="close-circle" size={20} color={subtleText} />
                    </Pressable>
                  )}
                </View>
              ))}
            </View>
          )}

          {/* Upload buttons */}
          <View style={styles.uploadRow}>
            <Pressable
              onPress={handleUploadDocument}
              style={[styles.uploadBtn, { borderColor: colors.border }]}
            >
              <Ionicons name="document-attach-outline" size={18} color={colors.text} />
              <Text style={[styles.uploadBtnLabel, { color: colors.text }]}>
                Upload File
              </Text>
            </Pressable>
            <Pressable
              onPress={handleUploadPhoto}
              style={[styles.uploadBtn, { borderColor: colors.border }]}
            >
              <Ionicons name="image-outline" size={18} color={colors.text} />
              <Text style={[styles.uploadBtnLabel, { color: colors.text }]}>
                Add Photo
              </Text>
            </Pressable>
          </View>
        </ScrollView>

        {/* Save */}
        <View style={[styles.footer, { borderTopColor: colors.border }]}>
          <Pressable
            onPress={handleSave}
            disabled={saving || hasPendingUploads}
            style={[
              styles.saveBtn,
              { backgroundColor: accent, opacity: saving || hasPendingUploads ? 0.5 : 1 },
            ]}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.saveLabel}>Save</Text>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
  },
  scroll: {
    maxHeight: 480,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: "500",
    marginBottom: 6,
  },
  input: {
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
  },
  multiline: {
    minHeight: 110,
    paddingTop: 12,
  },
  emptyHint: {
    fontSize: 13,
    paddingVertical: 8,
  },
  fileRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 8,
  },
  fileName: {
    flex: 1,
    fontSize: 15,
  },
  uploadRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 14,
  },
  uploadBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
  },
  uploadBtnLabel: {
    fontSize: 15,
    fontWeight: "500",
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 28,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  saveBtn: {
    paddingVertical: 14,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  saveLabel: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
