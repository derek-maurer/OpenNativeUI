import { Text } from "react-native";

interface SFSymbolProps {
  name: string;
  size?: number;
  color?: string;
}

/**
 * Maps icon names to Unicode characters. Using this wrapper so we can swap
 * the implementation later without touching every call site.
 */
const ICONS: Record<string, string> = {
  "square.and.pencil": "✏",
  "gearshape": "⚙",
  "globe": "🌐",
  "arrow.up": "↑",
  "stop.fill": "■",
  "chevron.down": "⌄",
  "chevron.right": "›",
  "xmark": "✕",
  "plus": "+",
  "lightbulb": "💡",
  "doc": "📄",
  "photo": "🖼",
  "folder": "📁",
};

export function SFSymbol({ name, size = 16, color }: SFSymbolProps) {
  return (
    <Text style={{ fontSize: size, color, lineHeight: size + 2, includeFontPadding: false }}>
      {ICONS[name] ?? "?"}
    </Text>
  );
}
