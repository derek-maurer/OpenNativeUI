import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@react-navigation/native";
import * as WebBrowser from "expo-web-browser";
import { useCallback, useMemo, useState } from "react";
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { BottomSheet } from "@/components/common/BottomSheet";
import type { MessageSource } from "@opennative/shared";

export interface Citation {
  url: string;
  title: string;
}

/**
 * Flatten Open WebUI's nested source bundles into a 1-indexed citation
 * lookup. The model writes `[N]` tokens against the *flat* concatenation
 * of `sources[i].metadata[]` across all bundles, so e.g. with two bundles
 * of 3 docs each, `[4]` refers to the first doc of the second bundle.
 *
 * Bundles without per-doc URLs (`metadata[j].source`) fall back to the
 * bundle-level `source.urls[j]` so RAG/file sources still resolve when
 * possible. Entries without any usable URL are dropped from the lookup
 * — those `[N]` tokens render as plain text.
 */
export function flattenCitations(
  sources: MessageSource[] | undefined,
): Citation[] {
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
      out.push({
        url,
        title: m?.title ?? docs[j] ?? url,
      });
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

  // Dedupe by domain for the chip preview — the goal is to flash distinct
  // logos at the user, not three identical favicons when several citations
  // happen to come from the same site.
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
    WebBrowser.openBrowserAsync(url, { dismissButtonStyle: "close" });
  }, []);

  if (citations.length === 0) return null;

  // Pill style mirrors ChatHeader's icon buttons. We use #2f2f2f in dark
  // mode (matching the user-message bubble) rather than #2a2a2a — the
  // header buttons get away with #2a2a2a because the title bar provides
  // edge contrast, but in the message area the chip would otherwise blend
  // straight into the #0d0d0d body.
  const chipBg = dark ? "#2f2f2f" : "#e5e5e5";
  const sheetBg = dark ? "#1a1a1a" : "#fff";
  const closeBg = dark ? "#262626" : "#f5f5f5";
  const subtleText = dark ? "#a3a3a3" : "#737373";

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        style={
          { ...styles.chip, backgroundColor: chipBg }
        }
        accessibilityRole="button"
        accessibilityLabel={`View ${citations.length} sources`}
      >
        <Text style={[styles.chipLabel, { color: colors.text }]}>Sources</Text>
        <View style={styles.faviconStack}>
          {previewUrls.map((url, i) => (
            <Image
              key={url}
              source={{ uri: getFaviconUrl(url) }}
              style={[
                styles.previewFavicon,
                {
                  marginLeft: i === 0 ? 0 : -8,
                  zIndex: previewUrls.length - i,
                  borderColor: chipBg,
                  backgroundColor: chipBg,
                },
              ]}
            />
          ))}
        </View>
      </Pressable>

      <BottomSheet
        visible={open}
        onClose={() => setOpen(false)}
        backgroundColor={sheetBg}
        maxHeight="80%"
      >
        <View style={styles.sheetHeader}>
          <Pressable
            onPress={() => setOpen(false)}
            style={[styles.closeButton, { backgroundColor: closeBg }]}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Close sources"
          >
            <Ionicons name="close" size={20} color={colors.text} />
          </Pressable>
          <Text style={[styles.sheetTitle, { color: colors.text }]}>
            Sources
          </Text>
          {/* spacer so the title stays optically centered against the close button */}
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView
          style={styles.list}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        >
          {citations.map((c, idx) => {
            const domain = getDomain(c.url);
            return (
              <Pressable
                // Same URL can legitimately appear twice (different chunks
                // of the same page), so we suffix the array index for keys.
                key={`${c.url}-${idx}`}
                onPress={() => handleOpenSource(c.url)}
                style={({ pressed }) => [
                  styles.row,
                  pressed && { opacity: 0.6 },
                ]}
              >
                <Text
                  style={[styles.rowTitle, { color: colors.text }]}
                  numberOfLines={1}
                >
                  {c.title}
                </Text>
                <View style={styles.rowMeta}>
                  <Image
                    source={{ uri: getFaviconUrl(c.url) }}
                    style={styles.rowFavicon}
                  />
                  <Text
                    style={[styles.rowDomain, { color: subtleText }]}
                    numberOfLines={1}
                  >
                    {domain}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </ScrollView>
      </BottomSheet>
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
  chipLabel: {
    fontSize: 13,
    fontWeight: "500",
  },
  faviconStack: {
    flexDirection: "row",
    alignItems: "center",
  },
  previewFavicon: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 12,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  sheetTitle: {
    fontSize: 17,
    fontWeight: "600",
  },
  headerSpacer: {
    width: 36,
  },
  list: {
    flexGrow: 0,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 34,
  },
  row: {
    paddingVertical: 14,
  },
  rowTitle: {
    fontSize: 15,
    lineHeight: 20,
    marginBottom: 6,
  },
  rowMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  rowFavicon: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  rowDomain: {
    fontSize: 13,
    flex: 1,
  },
});
