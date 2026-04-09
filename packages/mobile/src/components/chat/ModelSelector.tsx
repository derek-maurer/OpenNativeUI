import { useState } from "react";
import {
  View,
  Text,
  TextInput,
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
  const [query, setQuery] = useState("");
  const { dark, colors } = useTheme();
  const models = useModelStore((s) => s.models);
  const selectedModelId = useModelStore((s) => s.selectedModelId);
  const setSelectedModel = useModelStore((s) => s.setSelectedModel);
  const isLoading = useModelStore((s) => s.isLoading);

  const selectedModel = models.find((m) => m.id === selectedModelId);
  const displayName =
    selectedModel?.name ?? selectedModel?.id ?? "Select model";

  const filtered = query.trim()
    ? models.filter(
        (m) =>
          m.name.toLowerCase().includes(query.toLowerCase()) ||
          (m.owned_by ?? "").toLowerCase().includes(query.toLowerCase())
      )
    : models;

  const handleClose = () => {
    setVisible(false);
    setQuery("");
  };

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
        onClose={handleClose}
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

        <View style={[styles.searchBar, { borderBottomColor: colors.border, backgroundColor: dark ? "#111" : "#f5f5f5" }]}>
          <Ionicons name="search-outline" size={16} color="#737373" style={{ marginRight: 8 }} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Filter models…"
            placeholderTextColor="#737373"
            style={[styles.searchInput, { color: colors.text }]}
            autoCorrect={false}
            autoCapitalize="none"
          />
          {query.length > 0 && (
            <Pressable onPress={() => setQuery("")} hitSlop={8}>
              <Ionicons name="close-circle" size={16} color="#737373" />
            </Pressable>
          )}
        </View>

        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: 32 }}
          renderItem={({ item }) => {
            const isSelected = item.id === selectedModelId;
            return (
              <Pressable
                onPress={() => {
                  setSelectedModel(item.id);
                  handleClose();
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
                {isLoading ? "Loading models..." : query.trim() ? `No models match "${query}"` : "No models available"}
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
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 2,
  },
});
