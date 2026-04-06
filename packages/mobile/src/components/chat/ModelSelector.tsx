import { useState } from "react";
import {
  View,
  Text,
  Pressable,
  FlatList,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@react-navigation/native";
import { useModelStore } from "@opennative/shared";
import { BottomSheet } from "@/components/common/BottomSheet";

export function ModelSelector() {
  const [visible, setVisible] = useState(false);
  const { dark, colors } = useTheme();
  const models = useModelStore((s) => s.models);
  const selectedModelId = useModelStore((s) => s.selectedModelId);
  const setSelectedModel = useModelStore((s) => s.setSelectedModel);
  const isLoading = useModelStore((s) => s.isLoading);

  const selectedModel = models.find((m) => m.id === selectedModelId);
  const displayName =
    selectedModel?.name ?? selectedModel?.id ?? "Select model";

  return (
    <>
      <Pressable
        onPress={() => setVisible(true)}
        style={[
          styles.chip,
          { backgroundColor: dark ? "#1a1a1a" : "#f0f0f0" },
        ]}
      >
        <Text
          style={[styles.chipText, { color: colors.text }]}
          numberOfLines={1}
        >
          {isLoading ? "Loading..." : displayName}
        </Text>
        <Ionicons name="chevron-down" size={14} color="#737373" />
      </Pressable>

      <BottomSheet
        visible={visible}
        onClose={() => setVisible(false)}
        backgroundColor={dark ? "#1a1a1a" : "#fff"}
        maxHeight="60%"
      >
        <View
          style={[
            styles.sheetHeader,
            { borderBottomColor: colors.border },
          ]}
        >
          <Text style={[styles.sheetTitle, { color: colors.text }]}>
            Select Model
          </Text>
        </View>

        <FlatList
          data={models}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: 32 }}
          renderItem={({ item }) => {
            const isSelected = item.id === selectedModelId;
            return (
              <Pressable
                onPress={() => {
                  setSelectedModel(item.id);
                  setVisible(false);
                }}
                style={[
                  styles.modelRow,
                  isSelected && {
                    backgroundColor: "rgba(16,163,127,0.1)",
                  },
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
                {isSelected && (
                  <Ionicons
                    name="checkmark-circle"
                    size={22}
                    color="#10a37f"
                  />
                )}
              </Pressable>
            );
          }}
          ListEmptyComponent={
            <View style={styles.emptyList}>
              <Text style={{ color: "#737373" }}>
                {isLoading ? "Loading models..." : "No models available"}
              </Text>
            </View>
          }
        />
      </BottomSheet>
    </>
  );
}

const styles = StyleSheet.create({
  chip: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    marginHorizontal: 10,
  },
  chipText: {
    fontSize: 15,
    fontWeight: "500",
  },
  sheetHeader: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  modelRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  modelName: {
    fontSize: 16,
  },
  modelOwner: {
    fontSize: 12,
    color: "#737373",
    marginTop: 2,
  },
  emptyList: {
    paddingHorizontal: 20,
    paddingVertical: 32,
    alignItems: "center",
  },
});
