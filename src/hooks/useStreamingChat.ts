import { useCallback, useRef } from "react";
import * as Crypto from "expo-crypto";
import * as Haptics from "expo-haptics";

import { useChatStore } from "@/stores/chatStore";
import { useAuthStore } from "@/stores/authStore";
import { useModelStore } from "@/stores/modelStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { useConversationStore } from "@/stores/conversationStore";
import { playChime } from "@/lib/chime";
import { streamChatCompletion } from "@/services/streaming";
import {
  createServerConversation,
  updateServerConversation,
  buildChatPayload,
} from "@/services/conversationApi";
import type { Message, MessageInfo, ChatCompletionRequest, MessageContentPart } from "@/lib/types";

export function useStreamingChat() {
  const abortRef = useRef<(() => void) | null>(null);
  const savingRef = useRef(false);

  const sendMessage = useCallback(
    async (content: string, conversationId: string, isNew = false) => {
      const { serverUrl, token } = useAuthStore.getState();
      const { selectedModelId } = useModelStore.getState();
      const {
        addUserMessage,
        appendStreamToken,
        setStreaming,
        setStreamingStatus,
        finalizeStream,
        messages,
        pendingFiles,
        clearPendingFiles,
        webSearchEnabled,
        thinkingLevel,
      } = useChatStore.getState();

      const model = selectedModelId ?? "default";

      // Create user message (in-memory only)
      const userMessage: Message = {
        id: Crypto.randomUUID(),
        conversationId,
        role: "user",
        content,
        createdAt: Date.now(),
        files: pendingFiles.length > 0 ? [...pendingFiles] : undefined,
      };

      addUserMessage(userMessage);

      // Build messages array for the API
      const allMessages = [...messages, userMessage];
      const readyFiles = pendingFiles.filter((f) => f.status === "ready");
      const imageFiles = readyFiles.filter((f) => f.dataUrl);
      const docFiles = readyFiles.filter((f) => !f.dataUrl);

      const apiMessages = allMessages.map((m) => {
        // For the current user message, embed images inline as base64 data URIs
        const isCurrentMsg = m.id === userMessage.id;
        if (isCurrentMsg && imageFiles.length > 0) {
          const parts: MessageContentPart[] = [
            { type: "text", text: m.content },
            ...imageFiles.map((f) => ({
              type: "image_url" as const,
              image_url: { url: f.dataUrl! },
            })),
          ];
          return { role: m.role, content: parts };
        }
        return { role: m.role, content: m.content };
      });

      const requestBody: ChatCompletionRequest = {
        model,
        messages: apiMessages,
        stream: true,
        chat_id: conversationId,
        id: userMessage.id,
        ...(docFiles.length > 0 && {
          files: docFiles.map((f) => ({ type: "file", id: f.id })),
        }),
        ...(webSearchEnabled && {
          features: { web_search: true },
        }),
        ...(thinkingLevel && {
          think: thinkingLevel,
        }),
      };

      clearPendingFiles();
      setStreaming(true);

      let fullContent = "";
      let firstTokenTime: number | null = null;
      let tokenCount = 0;

      const stream = streamChatCompletion(serverUrl, token, requestBody, {
        onToken: (token) => {
          if (firstTokenTime === null) firstTokenTime = Date.now();
          tokenCount++;
          fullContent += token;
          appendStreamToken(token);
        },
        onStatus: (status) => {
          setStreamingStatus(status.done ? null : status);
        },
        onDone: async () => {
          // Approximate output tokens (~0.75 tokens per word is a rough heuristic)
          const wordCount = fullContent.split(/\s+/).filter(Boolean).length;
          const estimatedTokens = Math.round(wordCount * 1.33);
          const totalDuration = firstTokenTime
            ? (Date.now() - firstTokenTime) / 1000
            : 0;
          const tokensPerSecond =
            totalDuration > 0 ? estimatedTokens / totalDuration : 0;

          const info: MessageInfo = {
            model,
            totalDuration,
            outputTokens: estimatedTokens,
            tokensPerSecond,
          };

          const assistantMessage: Message = {
            id: Crypto.randomUUID(),
            conversationId,
            role: "assistant",
            content: fullContent,
            createdAt: Date.now(),
            model,
            info,
          };

          finalizeStream(assistantMessage);

          const settings = useSettingsStore.getState();
          if (settings.hapticOnComplete) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          }
          if (settings.chimeOnComplete) {
            playChime();
          }

          // Sync conversation to the server
          await syncToServer(
            conversationId,
            [...allMessages, assistantMessage],
            model,
            content,
            isNew
          );
        },
        onError: (error) => {
          if (fullContent) {
            const partialMessage: Message = {
              id: Crypto.randomUUID(),
              conversationId,
              role: "assistant",
              content: fullContent + "\n\n*[Stream interrupted]*",
              createdAt: Date.now(),
              model,
            };
            finalizeStream(partialMessage);

            // Still try to sync partial content
            syncToServer(
              conversationId,
              [...allMessages, partialMessage],
              model,
              content,
              isNew
            );
          } else {
            setStreaming(false);
          }
        },
      });

      abortRef.current = stream.abort;
    },
    []
  );

  const abort = useCallback(() => {
    abortRef.current?.();
    abortRef.current = null;

    const { isStreaming } = useChatStore.getState();
    if (isStreaming) {
      useChatStore.getState().setStreaming(false);
    }
  }, []);

  return { sendMessage, abort };
}

/**
 * Persist the conversation to the Open WebUI server.
 * Creates a new conversation on first exchange, updates on subsequent ones.
 */
async function syncToServer(
  conversationId: string,
  messages: Message[],
  model: string,
  firstUserContent: string,
  isNew: boolean
): Promise<void> {
  const title = messages.find((m) => m.role === "user")?.content.slice(0, 100) ?? "New Chat";
  const chatPayload = buildChatPayload(conversationId, title, model, messages);

  try {
    if (isNew) {
      await createServerConversation(chatPayload);
      // Refresh full conversation list from the server
      await useConversationStore.getState().loadConversations();
    } else {
      await updateServerConversation(conversationId, chatPayload);
      useConversationStore.getState().updateConversationLocally(conversationId, {
        updatedAt: Date.now(),
      });
    }
  } catch (e) {
    // Silently fail — conversation still works locally, will sync on next message
    console.warn("Failed to sync conversation to server:", e);
  }
}
