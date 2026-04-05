import { useCallback, useRef } from "react";
import * as Crypto from "expo-crypto";

import { useChatStore } from "@/stores/chatStore";
import { useAuthStore } from "@/stores/authStore";
import { useModelStore } from "@/stores/modelStore";
import { useConversationStore } from "@/stores/conversationStore";
import { streamChatCompletion } from "@/services/streaming";
import {
  createServerConversation,
  updateServerConversation,
  buildChatPayload,
} from "@/services/conversationApi";
import type { Message, ChatCompletionRequest } from "@/lib/types";

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
        finalizeStream,
        messages,
        pendingFiles,
        clearPendingFiles,
        webSearchEnabled,
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
      const apiMessages = allMessages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      // Include files if any are ready
      const readyFiles = pendingFiles.filter((f) => f.status === "ready");
      const requestBody: ChatCompletionRequest = {
        model,
        messages: apiMessages,
        stream: true,
        chat_id: conversationId,
        id: userMessage.id,
        ...(readyFiles.length > 0 && {
          files: readyFiles.map((f) => ({ type: "file", id: f.id })),
        }),
        ...(webSearchEnabled && {
          features: { web_search: true },
        }),
      };

      clearPendingFiles();
      setStreaming(true);

      let fullContent = "";

      const stream = streamChatCompletion(serverUrl, token, requestBody, {
        onToken: (token) => {
          fullContent += token;
          appendStreamToken(token);
        },
        onDone: async () => {
          const assistantMessage: Message = {
            id: Crypto.randomUUID(),
            conversationId,
            role: "assistant",
            content: fullContent,
            createdAt: Date.now(),
            model,
          };

          finalizeStream(assistantMessage);

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
      const serverConv = await createServerConversation(chatPayload);
      // Add to sidebar
      useConversationStore.getState().addConversation({
        id: serverConv.id,
        title: serverConv.chat?.title ?? title,
        model,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
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
