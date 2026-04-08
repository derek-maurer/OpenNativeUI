import { useState } from "react";
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useTheme } from "@react-navigation/native";
import { useModelStore } from "@opennative/shared";
import { SFSymbol } from "@/components/ui/SFSymbol";

// ─── Trigger chip (rendered inside the input container) ──────────────────────

interface ModelSelectorTriggerProps {
  onPress: () => void;
}

export function ModelSelectorTrigger({ onPress }: ModelSelectorTriggerProps) {
  const { colors } = useTheme();
  const models = useModelStore((s) => s.models);
  const selectedModelId = useModelStore((s) => s.selectedModelId);
  const isLoading = useModelStore((s) => s.isLoading);

  const selectedModel = models.find((m) => m.id === selectedModelId);
  const displayName = selectedModel?.name ?? selectedModel?.id ?? "Select model";

  return (
    <Pressable onPress={onPress} style={styles.trigger}>
      <Text style={[styles.triggerText, { color: colors.text }]} numberOfLines={1}>
        {isLoading ? "Loading…" : displayName}
      </Text>
      <SFSymbol name="chevron.down" size={11} color="#737373" />
    </Pressable>
  );
}

// ─── Full-screen picker overlay (rendered at ChatScreen level) ────────────────

interface ModelPickerOverlayProps {
  visible: boolean;
  onClose: () => void;
}

export function ModelPickerOverlay({ visible, onClose }: ModelPickerOverlayProps) {
  const { dark, colors } = useTheme();
  const models = useModelStore((s) => s.models);
  const selectedModelId = useModelStore((s) => s.selectedModelId);
  const setSelectedModel = useModelStore((s) => s.setSelectedModel);
  const isLoading = useModelStore((s) => s.isLoading);

  if (!visible) return null;

  const overlayBg = dark ? "rgba(0,0,0,0.6)" : "rgba(0,0,0,0.3)";

  return (
    <Pressable
      style={[StyleSheet.absoluteFillObject, styles.overlay, { backgroundColor: overlayBg }]}
      onPress={onClose}
    >
      <Pressable
        style={[styles.sheet, { backgroundColor: dark ? "#1a1a1a" : "#fff" }]}
        onPress={(e) => e.stopPropagation()}
      >
        <View style={[styles.sheetHeader, { borderBottomColor: colors.border }]}>
          <Text style={[styles.sheetTitle, { color: colors.text }]}>Select Model</Text>
        </View>
        <FlatList
          data={models}
          keyExtractor={(item) => item.id}
          style={{ maxHeight: 400 }}
          contentContainerStyle={{ paddingBottom: 8 }}
          renderItem={({ item }) => {
            const isSelected = item.id === selectedModelId;
            return (
              <Pressable
                onPress={() => {
                  setSelectedModel(item.id);
                  onClose();
                }}
                style={[
                  styles.modelRow,
                  isSelected && { backgroundColor: "rgba(16,163,127,0.1)" },
                ]}
              >
                <View style={{ flex: 1 }}>
                  <Text
                    style={[
                      styles.modelName,
                      { color: isSelected ? "#10a37f" : colors.text },
                      isSelected && { fontWeight: "600" },
                    ]}
                    numberOfLines={1}
                  >
                    {item.name || item.id}
                  </Text>
                  {item.owned_by ? (
                    <Text style={styles.modelOwner}>{item.owned_by}</Text>
                  ) : null}
                </View>
                {isSelected && <Text style={styles.checkmark}>✓</Text>}
              </Pressable>
            );
          }}
          ListEmptyComponent={
            <View style={styles.emptyList}>
              <Text style={{ color: "#737373" }}>
                {isLoading ? "Loading models…" : "No models available"}
              </Text>
            </View>
          }
        />
      </Pressable>
    </Pressable>
  );
}

// ─── Self-contained (kept for any existing usage) ─────────────────────────────

export function ModelSelector() {
  const [visible, setVisible] = useState(false);
  return (
    <>
      <ModelSelectorTrigger onPress={() => setVisible(true)} />
      <ModelPickerOverlay visible={visible} onClose={() => setVisible(false)} />
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 4,
    paddingVertical: 4,
    flex: 1,
  },
  triggerText: { fontSize: 13, fontWeight: "500", flex: 1 },
  overlay: { flex: 1, alignItems: "center", justifyContent: "center", zIndex: 999 },
  sheet: {
    width: 360,
    borderRadius: 12,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
  },
  sheetHeader: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  sheetTitle: { fontSize: 16, fontWeight: "600" },
  modelRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  modelName: { fontSize: 14 },
  modelOwner: { fontSize: 12, color: "#737373", marginTop: 2 },
  checkmark: { color: "#10a37f", fontSize: 16, fontWeight: "600" },
  emptyList: { paddingHorizontal: 16, paddingVertical: 24, alignItems: "center" },
});
