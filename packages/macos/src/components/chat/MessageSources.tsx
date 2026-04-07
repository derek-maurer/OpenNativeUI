import { useCallback, useMemo, useState } from "react";
import {
  Image,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useTheme } from "@react-navigation/native";
import type { MessageSource } from "@opennative/shared";

export interface Citation {
  url: string;
  title: string;
}

export function flattenCitations(sources: MessageSource[] | undefined): Citation[] {
  if (!sources || sources.length === 0) return [];
  const out: Citation[] = [];
  for (const bundle of sources) {
    const docs = bundle.document ?? [];
    const meta = bundle.metadata ?? [];
    const fallbackUrls = bundle.source?.urls ?? [];
    const count = Math.max(docs.length, meta.length);
    for (let j = 0; j < count; j++) {
      const m = meta[j];
      const url = m?.source ?? fallbackUrls[j];
      if (!url) continue;
      out.push({ url, title: m?.title ?? docs[j] ?? url });
    }
  }
  return out;
}

function getDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function getFaviconUrl(url: string): string {
  return `https://www.google.com/s2/favicons?domain=${getDomain(url)}&sz=64`;
}

interface MessageSourcesProps {
  citations: Citation[];
}

export function MessageSources({ citations }: MessageSourcesProps) {
  const { dark, colors } = useTheme();
  const [open, setOpen] = useState(false);

  const previewUrls = useMemo(() => {
    const seen = new Set<string>();
    const result: string[] = [];
    for (const c of citations) {
      const d = getDomain(c.url);
      if (seen.has(d)) continue;
      seen.add(d);
      result.push(c.url);
      if (result.length >= 3) break;
    }
    return result;
  }, [citations]);

  const handleOpenSource = useCallback((url: string) => {
    Linking.openURL(url);
  }, []);

  if (citations.length === 0) return null;

  const chipBg = dark ? "#2f2f2f" : "#e5e5e5";
  const sheetBg = dark ? "#1a1a1a" : "#fff";
  const overlayBg = dark ? "rgba(0,0,0,0.7)" : "rgba(0,0,0,0.4)";
  const subtleText = dark ? "#a3a3a3" : "#737373";

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        style={[styles.chip, { backgroundColor: chipBg }]}
      >
        <Text style={[styles.chipLabel, { color: colors.text }]}>Sources</Text>
        <View style={styles.faviconStack}>
          {previewUrls.map((url, i) => (
            <Image
              key={url}
              source={{ uri: getFaviconUrl(url) }}
              style={[
                styles.previewFavicon,
                { marginLeft: i === 0 ? 0 : -8, zIndex: previewUrls.length - i, borderColor: chipBg, backgroundColor: chipBg },
              ]}
            />
          ))}
        </View>
      </Pressable>

      {open && (
        <Pressable style={[StyleSheet.absoluteFillObject, styles.overlay, { backgroundColor: overlayBg }]} onPress={() => setOpen(false)}>
          <Pressable style={[styles.sheet, { backgroundColor: sheetBg }]} onPress={(e) => e.stopPropagation()}>
            <View style={styles.sheetHeader}>
              <Text style={[styles.sheetTitle, { color: colors.text }]}>Sources</Text>
              <Pressable onPress={() => setOpen(false)} style={styles.closeButton}>
                <Text style={[styles.closeButtonText, { color: colors.text }]}>✕</Text>
              </Pressable>
            </View>
            <ScrollView contentContainerStyle={styles.listContent}>
              {citations.map((c, idx) => (
                <Pressable
                  key={`${c.url}-${idx}`}
                  onPress={() => handleOpenSource(c.url)}
                  style={({ pressed }) => [styles.row, pressed && { opacity: 0.6 }]}
                >
                  <Text style={[styles.rowTitle, { color: colors.text }]} numberOfLines={2}>
                    {c.title}
                  </Text>
                  <View style={styles.rowMeta}>
                    <Image source={{ uri: getFaviconUrl(c.url) }} style={styles.rowFavicon} />
                    <Text style={[styles.rowDomain, { color: subtleText }]} numberOfLines={1}>
                      {getDomain(c.url)}
                    </Text>
                  </View>
                </Pressable>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingLeft: 12,
    paddingRight: 10,
    paddingVertical: 8,
    borderRadius: 18,
    marginTop: 8,
    marginBottom: 4,
    gap: 8,
  },
  chipLabel: { fontSize: 13, fontWeight: "500" },
  faviconStack: { flexDirection: "row", alignItems: "center" },
  previewFavicon: { width: 18, height: 18, borderRadius: 9, borderWidth: 1.5 },
  overlay: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  sheet: {
    width: 480,
    maxHeight: 520,
    borderRadius: 14,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  sheetTitle: { fontSize: 17, fontWeight: "600" },
  closeButton: { padding: 4 },
  closeButtonText: { fontSize: 16 },
  listContent: { paddingHorizontal: 20, paddingBottom: 20 },
  row: { paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "rgba(128,128,128,0.2)" },
  rowTitle: { fontSize: 14, lineHeight: 20, marginBottom: 4 },
  rowMeta: { flexDirection: "row", alignItems: "center", gap: 6 },
  rowFavicon: { width: 14, height: 14, borderRadius: 7 },
  rowDomain: { fontSize: 12 },
});
