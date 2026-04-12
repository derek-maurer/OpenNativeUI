import { ScrollView, View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@react-navigation/native";
import { BottomSheet } from "@/components/common/BottomSheet";
import type { Conversation } from "@opennative/shared";

interface ConversationActionsSheetProps {
  visible: boolean;
  conversation: Conversation;
  onClose: () => void;
  onShare: () => void;
  onDownload: () => void;
  onRename: () => void;
  onPin: () => void;
  onClone: () => void;
  onMoveToFolder: () => void;
  onArchive: () => void;
  onDelete: () => void;
}

export function ConversationActionsSheet({
  visible,
  conversation,
  onClose,
  onShare,
  onDownload,
  onRename,
  onPin,
  onClone,
  onMoveToFolder,
  onArchive,
  onDelete,
}: ConversationActionsSheetProps) {
  const { dark, colors } = useTheme();

  const fire = (handler: () => void) => {
    onClose();
    handler();
  };

  const textColor = colors.text;

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      backgroundColor={dark ? "#1a1a1a" : "#fff"}
      maxHeight="55%"
    >
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Text
          style={[styles.headerTitle, { color: textColor }]}
          numberOfLines={1}
        >
          {conversation.title}
        </Text>
      </View>

      <ScrollView bounces={false} contentContainerStyle={styles.scrollContent}>
        <ActionRow icon="share-outline" label="Share" color={textColor} onPress={() => fire(onShare)} />
        <ActionRow icon="download-outline" label="Download" color={textColor} onPress={() => fire(onDownload)} />
        <ActionRow icon="pencil-outline" label="Rename" color={textColor} onPress={() => fire(onRename)} />
        <ActionRow
          icon={conversation.pinned ? "pin" : "pin-outline"}
          label={conversation.pinned ? "Unpin" : "Pin"}
          color={textColor}
          onPress={() => fire(onPin)}
        />
        <ActionRow icon="copy-outline" label="Clone" color={textColor} onPress={() => fire(onClone)} />
        <ActionRow icon="folder-outline" label="Move to folder" color={textColor} onPress={() => fire(onMoveToFolder)} />
        <ActionRow icon="archive-outline" label="Archive" color={textColor} onPress={() => fire(onArchive)} />

        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        <ActionRow icon="trash-outline" label="Delete" color="#ef4444" onPress={() => fire(onDelete)} />
      </ScrollView>
    </BottomSheet>
  );
}

function ActionRow({
  icon,
  label,
  color,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  color: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.6}
      onPress={onPress}
      style={styles.row}
    >
      <View style={styles.rowIcon}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <Text style={[styles.rowLabel, { color }]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "600",
  },
  scrollContent: {
    paddingTop: 6,
    paddingBottom: 40,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 13,
    paddingHorizontal: 20,
    marginHorizontal: 8,
    borderRadius: 10,
  },
  rowIcon: {
    width: 28,
    alignItems: "center",
  },
  rowLabel: {
    fontSize: 16,
    marginLeft: 12,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: 28,
    marginVertical: 6,
  },
});
