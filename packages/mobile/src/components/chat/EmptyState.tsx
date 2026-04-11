import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useTheme } from "@react-navigation/native";
import { useAuthStore, getGreeting, getShownSuggestions } from "@opennative/shared";

// Pick 4 random suggestions, stable per session
const SHOWN = getShownSuggestions();

interface EmptyStateProps {
  onSuggest: (text: string) => void;
}

export function EmptyState({ onSuggest }: EmptyStateProps) {
  const { colors, dark } = useTheme();
  const user = useAuthStore((s) => s.user);
  const firstName = user?.name?.split(" ")[0] ?? "there";
  const { heading, sub } = getGreeting(firstName);

  return (
    <View style={styles.container}>
      <View style={styles.greetingBlock}>
        <Text style={[styles.heading, { color: colors.text }]}>{heading}</Text>
        <Text style={[styles.sub, { color: dark ? "#888" : "#999" }]}>{sub}</Text>
      </View>

      <View style={styles.grid}>
        {SHOWN.map((text) => (
          <TouchableOpacity
            key={text}
            onPress={() => onSuggest(text)}
            activeOpacity={0.7}
            style={[
              styles.chip,
              {
                backgroundColor: dark ? "#1a1a1a" : "#f5f5f5",
                borderColor: dark ? "#2a2a2a" : "#e0e0e0",
              },
            ]}
          >
            <Text style={[styles.chipText, { color: dark ? "#aaa" : "#666" }]}>
              {text}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingBottom: 48,
  },
  greetingBlock: {
    alignItems: "center",
    marginBottom: 28,
  },
  heading: {
    fontSize: 22,
    fontWeight: "600",
    marginBottom: 4,
    textAlign: "center",
  },
  sub: {
    fontSize: 14,
    textAlign: "center",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    justifyContent: "center",
    width: "100%",
  },
  chip: {
    width: "47%",
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
  },
  chipText: {
    fontSize: 13,
    lineHeight: 18,
  },
});
