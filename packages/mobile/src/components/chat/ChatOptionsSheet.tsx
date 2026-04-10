import { useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@react-navigation/native";
import { useChatStore } from "@opennative/shared";
import { useAuthStore } from "@opennative/shared";
import { useModelStore } from "@opennative/shared";
import { useModelPreferencesStore } from "@opennative/shared";
import { useFolderStore } from "@opennative/shared";
import { useConversationStore } from "@opennative/shared";
import { useFileUpload } from "@/hooks/useFileUpload";
import { BottomSheet } from "@/components/common/BottomSheet";
import { FolderPickerSheet } from "@/components/folders/FolderPickerSheet";
import { getThinkingProfile, resolveEffectiveThinkingValue } from "@opennative/shared";
import type { ThinkingValue } from "@opennative/shared";

interface ChatOptionsSheetProps {
  visible: boolean;
  onClose: () => void;
}

export function ChatOptionsSheet({ visible, onClose }: ChatOptionsSheetProps) {
  const { dark, colors } = useTheme();
  const webSearchEnabled = useChatStore((s) => s.webSearchEnabled);
  const toggleWebSearch = useChatStore((s) => s.toggleWebSearch);
  const webSearchAvailable = useAuthStore((s) => s.webSearchAvailable);
  const currentConversationId = useChatStore((s) => s.currentConversationId);
  const pendingFolderId = useChatStore((s) => s.pendingFolderId);
  const setPendingFolderId = useChatStore((s) => s.setPendingFolderId);
  const selectedModelId = useModelStore((s) => s.selectedModelId);
  const thinkingValue = useModelPreferencesStore((s) =>
    selectedModelId ? (s.thinkingByModel[selectedModelId] ?? null) : null,
  );
  const setThinkingForModel = useModelPreferencesStore(
    (s) => s.setThinkingForModel,
  );
  const folders = useFolderStore((s) => s.folders);
  const activeConversation = useConversationStore((s) =>
    currentConversationId
      ? s.conversations.find((c) => c.id === currentConversationId)
      : undefined,
  );
  const moveConversationToFolder = useConversationStore(
    (s) => s.moveConversationToFolder,
  );
  const { pickAndUpload, pickPhotoAndUpload } = useFileUpload();

  const [folderPickerVisible, setFolderPickerVisible] = useState(false);

  const thinkingProfile = getThinkingProfile(selectedModelId);
  // The "effective" value is what the UI should reflect: explicit user
  // choice if any, otherwise the profile's defaultValue (or offValue) from
  // thinkingModels.json. Drives both the active-chip / toggle-on state
  // here AND the wire payload in useStreamingChat — same resolver, so the
  // visible state always matches what gets sent.
  const effectiveThinkingValue = resolveEffectiveThinkingValue(
    thinkingProfile,
    thinkingValue,
  );
  // A profile with exactly one option is rendered as a toggle row; anything
  // larger is rendered as a chip group. The single option's value is what
  // we send when the toggle flips on; `offValue` (if set) is what we send
  // when it flips off — needed for backends whose default is "on".
  const isBinaryToggle = thinkingProfile?.options.length === 1;
  const onValue = thinkingProfile?.options[0]?.value;
  const isThinkingOn =
    isBinaryToggle && onValue !== undefined && effectiveThinkingValue === onValue;

  // For an existing chat, use its persisted folderId. For a new unsent
  // chat, use pendingFolderId from the chat store — it will be applied
  // right after the chat is created on the server.
  const currentFolderId = currentConversationId
    ? (activeConversation?.folderId ?? null)
    : pendingFolderId;
  const currentFolderName =
    currentFolderId
      ? (folders.find((f) => f.id === currentFolderId)?.name ?? "Unknown")
      : "None";

  const handleFolderSelect = async (folderId: string | null) => {
    if (currentConversationId) {
      try {
        await moveConversationToFolder(currentConversationId, folderId);
      } catch (e) {
        console.error("[chat:options] folder move failed", {
          conversationId: currentConversationId,
          folderId,
          error: e instanceof Error ? e.message : String(e),
        });
      }
    } else {
      setPendingFolderId(folderId);
    }
  };

  const setThinking = (value: ThinkingValue | null) => {
    if (!selectedModelId) return;
    console.log("[chat:thinking] store", {
      modelId: selectedModelId,
      value,
      valueType: typeof value,
      profileId: thinkingProfile?.id,
      paramName: thinkingProfile?.paramName,
    });
    setThinkingForModel(selectedModelId, value);
  };

  const handlePickFile = async () => {
    onClose();
    // Allow the Modal to fully dismiss before presenting the system picker
    await new Promise((resolve) => setTimeout(resolve, 500));
    await pickAndUpload();
  };

  const handlePickPhoto = async () => {
    onClose();
    // Allow the Modal to fully dismiss before presenting the system picker
    await new Promise((resolve) => setTimeout(resolve, 500));
    await pickPhotoAndUpload();
  };

  const sheetBg = dark ? "#1a1a1a" : "#fff";
  const rowBg = dark ? "#262626" : "#f5f5f5";

  return (
    <BottomSheet visible={visible} onClose={onClose} backgroundColor={sheetBg}>
      <View style={styles.content}>
        <Text style={[styles.title, { color: colors.text }]}>Options</Text>

        {/* Web Search — only shown when the server has it enabled */}
        {webSearchAvailable && (
          <Pressable
            onPress={toggleWebSearch}
            style={[styles.row, { backgroundColor: rowBg }]}
          >
            <View style={styles.rowIcon}>
              <Ionicons
                name="globe-outline"
                size={22}
                color={webSearchEnabled ? "#10a37f" : "#737373"}
              />
            </View>
            <Text style={[styles.rowLabel, { color: colors.text }]}>
              Web Search
            </Text>
            <View
              style={[
                styles.toggle,
                webSearchEnabled
                  ? styles.toggleOn
                  : { backgroundColor: dark ? "#404040" : "#d4d4d4" },
              ]}
            >
              <View
                style={[
                  styles.toggleThumb,
                  webSearchEnabled && styles.toggleThumbOn,
                ]}
              />
            </View>
          </Pressable>
        )}

        {/* Folder */}
        <Pressable
          onPress={() => setFolderPickerVisible(true)}
          style={[styles.row, { backgroundColor: rowBg }]}
        >
          <View style={styles.rowIcon}>
            <Ionicons
              name="folder-outline"
              size={22}
              color={currentFolderId ? "#10a37f" : "#737373"}
            />
          </View>
          <Text style={[styles.rowLabel, { color: colors.text }]}>Folder</Text>
          <Text
            style={styles.rowValue}
            numberOfLines={1}
          >
            {currentFolderName}
          </Text>
          <Ionicons name="chevron-forward" size={18} color="#737373" />
        </Pressable>

        {/* Attach File */}
        <Pressable
          onPress={handlePickFile}
          style={[styles.row, { backgroundColor: rowBg }]}
        >
          <View style={styles.rowIcon}>
            <Ionicons name="document-outline" size={22} color="#737373" />
          </View>
          <Text style={[styles.rowLabel, { color: colors.text }]}>
            Attach File
          </Text>
          <Ionicons name="chevron-forward" size={18} color="#737373" />
        </Pressable>

        {/* Attach Photo */}
        <Pressable
          onPress={handlePickPhoto}
          style={[styles.row, { backgroundColor: rowBg }]}
        >
          <View style={styles.rowIcon}>
            <Ionicons name="image-outline" size={22} color="#737373" />
          </View>
          <Text style={[styles.rowLabel, { color: colors.text }]}>
            Attach Photo
          </Text>
          <Ionicons name="chevron-forward" size={18} color="#737373" />
        </Pressable>

        {/* Thinking — driven by the model's profile in thinkingModels.json.
            Profiles with a single option render as a row+toggle (e.g. Gemma);
            multi-option profiles render as a chip section (e.g. GPT-5
            reasoning effort). Tap an active chip to clear it. */}
        {thinkingProfile && isBinaryToggle && (
          <Pressable
            onPress={() =>
              setThinking(
                isThinkingOn
                  ? (thinkingProfile.offValue ?? null)
                  : thinkingProfile.options[0]!.value,
              )
            }
            style={[styles.row, { backgroundColor: rowBg }]}
          >
            <View style={styles.rowIcon}>
              <Ionicons
                name="bulb-outline"
                size={22}
                color={isThinkingOn ? "#10a37f" : "#737373"}
              />
            </View>
            <Text style={[styles.rowLabel, { color: colors.text }]}>
              {thinkingProfile.label}
            </Text>
            <View
              style={[
                styles.toggle,
                isThinkingOn
                  ? styles.toggleOn
                  : { backgroundColor: dark ? "#404040" : "#d4d4d4" },
              ]}
            >
              <View
                style={[
                  styles.toggleThumb,
                  isThinkingOn && styles.toggleThumbOn,
                ]}
              />
            </View>
          </Pressable>
        )}

        {thinkingProfile && !isBinaryToggle && (
          <View style={[styles.thinkingSection, { backgroundColor: rowBg }]}>
            <View style={styles.thinkingHeader}>
              <View style={styles.rowIcon}>
                <Ionicons
                  name="bulb-outline"
                  size={22}
                  color={effectiveThinkingValue !== null ? "#10a37f" : "#737373"}
                />
              </View>
              <Text style={[styles.rowLabel, { color: colors.text, flex: 1 }]}>
                {thinkingProfile.label}
              </Text>
            </View>

            <View style={styles.thinkingOptions}>
              {thinkingProfile.options.map((option) => {
                const active = effectiveThinkingValue === option.value;
                return (
                  <Pressable
                    key={String(option.value)}
                    onPress={() => setThinking(active ? null : option.value)}
                    style={[
                      styles.thinkingChip,
                      {
                        borderColor: active
                          ? "#10a37f"
                          : dark
                            ? "#404040"
                            : "#d4d4d4",
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.thinkingChipText,
                        { color: active ? "#10a37f" : "#737373" },
                      ]}
                    >
                      {option.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}

        <View style={{ height: 16 }} />
      </View>

      <FolderPickerSheet
        visible={folderPickerVisible}
        onClose={() => setFolderPickerVisible(false)}
        currentFolderId={currentFolderId}
        onSelect={handleFolderSelect}
      />
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 16,
    paddingBottom: 34,
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 8,
  },
  rowIcon: {
    width: 32,
    alignItems: "center",
  },
  rowLabel: {
    flex: 1,
    fontSize: 16,
    marginLeft: 8,
  },
  rowValue: {
    fontSize: 14,
    color: "#737373",
    marginRight: 6,
    maxWidth: 120,
  },
  toggle: {
    width: 44,
    height: 26,
    borderRadius: 13,
    justifyContent: "center",
    paddingHorizontal: 2,
  },
  toggleOn: {
    backgroundColor: "#10a37f",
  },
  toggleThumb: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#fff",
  },
  toggleThumbOn: {
    alignSelf: "flex-end",
  },
  thinkingSection: {
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginBottom: 8,
  },
  thinkingHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  thinkingOptions: {
    flexDirection: "row",
    gap: 8,
    paddingLeft: 40,
  },
  thinkingChip: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1.5,
    alignItems: "center",
  },
  thinkingChipText: {
    fontSize: 13,
    fontWeight: "600",
  },
});
