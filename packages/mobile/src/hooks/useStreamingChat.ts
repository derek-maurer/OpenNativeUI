import { useCallback, useRef } from "react";
import * as Crypto from "expo-crypto";
import * as Haptics from "expo-haptics";

import { useChatStore } from "@opennative/shared";
import { useAuthStore } from "@opennative/shared";
import { useModelStore } from "@opennative/shared";
import { useSettingsStore } from "@opennative/shared";
import { useConversationStore } from "@opennative/shared";
import { playChime } from "@/lib/chime";
import { streamChatCompletion } from "@opennative/shared";
import { getModelCapabilities } from "@opennative/shared";
import { getThinkingForModel } from "@opennative/shared";
import {
  createServerConversation,
  updateServerConversation,
  buildChatPayload,
} from "@opennative/shared";
import { assignChatToFolder } from "@opennative/shared";
import type {
  Message,
  MessageInfo,
  MessageSource,
  ChatCompletionRequest,
  MessageContentPart,
} from "@opennative/shared";

export function useStreamingChat() {
  const abortRef = useRef<(() => void) | null>(null);
  const savingRef = useRef(false);

  const sendMessage = useCallback(
    async (content: string, conversationId: string, isNew = false) => {
      console.log("[chat:send] sendMessage()", {
        conversationId,
        isNew,
        contentLength: content.length,
      });

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
      } = useChatStore.getState();

      const model = selectedModelId ?? "default";
      const capabilities = getModelCapabilities(model);
      const thinkingLevel = getThinkingForModel(model);

      // OpenWebUI always generates its own chat id on POST /chats/new and
      // ignores the one we send. After create we swap this local variable
      // to the server-assigned id and use it for every subsequent server
      // call (stream chat_id, sync, sidebar). The client-generated UUID
      // lives only in the URL route for this session.
      let effectiveId = conversationId;

      // Create user message first so it can be persisted with the initial
      // server record — that way an empty "New Chat" stub never lingers if
      // the stream fails before producing any tokens.
      const userMessage: Message = {
        id: Crypto.randomUUID(),
        conversationId,
        role: "user",
        content,
        createdAt: Date.now(),
        files: pendingFiles.length > 0 ? [...pendingFiles] : undefined,
      };

      addUserMessage(userMessage);

      // For new conversations, create the record on the server BEFORE streaming
      // so it exists in the DB regardless of how the stream completes.
      if (isNew) {
        console.log("[chat:send] creating new conversation on server", {
          conversationId,
          model,
          userMessageId: userMessage.id,
        });
        try {
          // Strip heavy attachments (base64 images, file refs) from the create
          // payload to avoid request timeouts — those still go through the
          // chat completion request itself.
          const lightweightUserMessage: Message = {
            ...userMessage,
            files: undefined,
          };
          // Send id:"" — server assigns its own id regardless, matching Conduit.
          const stub = buildChatPayload(
            "",
            "New Chat",
            model,
            [lightweightUserMessage],
          );
          const created = await createServerConversation(stub);
          effectiveId = created?.id ?? conversationId;
          // Update the chat store so subsequent sendMessage calls (e.g. the
          // user's second message in this same chat) pick up the server id
          // via chat/[id].tsx::handleSend → store.currentConversationId.
          useChatStore.setState({ currentConversationId: effectiveId });
          console.log("[chat:send] create succeeded — adding to sidebar", {
            clientId: conversationId,
            effectiveId,
            idsMatch: effectiveId === conversationId,
          });

          // If the user pre-selected a folder for this new chat via the
          // options sheet, assign it now that the server ID exists. Failure
          // here must not block the message flow.
          const pendingFolderId = useChatStore.getState().pendingFolderId;
          let appliedFolderId: string | null = null;
          if (pendingFolderId) {
            try {
              await assignChatToFolder(effectiveId, pendingFolderId);
              appliedFolderId = pendingFolderId;
              console.log("[chat:send] applied pending folder", {
                effectiveId,
                folderId: pendingFolderId,
              });
            } catch (folderErr) {
              console.error("[chat:send] folder assignment failed", {
                effectiveId,
                folderId: pendingFolderId,
                error:
                  folderErr instanceof Error
                    ? folderErr.message
                    : String(folderErr),
              });
            } finally {
              useChatStore.getState().setPendingFolderId(null);
            }
          }

          // Add to sidebar immediately so the user sees it
          useConversationStore.getState().addConversation({
            id: effectiveId,
            title: "New Chat",
            model,
            createdAt: Date.now(),
            updatedAt: Date.now(),
            folderId: appliedFolderId,
          });
        } catch (e) {
          console.error("[chat:send] create FAILED — conversation will NOT be in sidebar", {
            conversationId,
            error: e instanceof Error ? e.message : String(e),
            status: (e as any)?.status,
            body: (e as any)?.body,
          });
        }
      }

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
        chat_id: effectiveId,
        id: userMessage.id,
        ...(docFiles.length > 0 && {
          files: docFiles.map((f) => ({ type: "file", id: f.id })),
        }),
        ...(webSearchEnabled && {
          features: { web_search: true },
        }),
        ...(thinkingLevel && capabilities.thinking.mode !== "none" && {
          // Binary-mode models (e.g. Gemma 3+) get a boolean toggle;
          // tiered-mode models (e.g. GPT-OSS) get the chosen effort level.
          think:
            capabilities.thinking.mode === "binary" ? true : thinkingLevel,
        }),
      };

      clearPendingFiles();
      setStreaming(true);

      let fullContent = "";
      let firstTokenTime: number | null = null;
      let tokenCount = 0;
      // Sources can arrive as their own stream frame (RAG/web-search hits)
      // either mid-stream or on the final completion event. We accumulate
      // them and attach to the finalized assistant message so pass 2 can
      // render clickable [N] citations without needing to re-stream.
      let collectedSources: MessageSource[] | undefined;

      console.log("[chat:send] starting stream", {
        effectiveId,
        model,
        messageCount: apiMessages.length,
        hasImages: imageFiles.length > 0,
        hasDocs: docFiles.length > 0,
      });

      const stream = streamChatCompletion(serverUrl, token, requestBody, {
        onToken: (token) => {
          if (firstTokenTime === null) {
            firstTokenTime = Date.now();
            console.log("[chat:stream] first token received", { effectiveId });
          }
          tokenCount++;
          fullContent += token;
          appendStreamToken(token);
        },
        onStatus: (status) => {
          setStreamingStatus(status.done ? null : status);
        },
        onSources: (sources) => {
          // Replace wholesale rather than append — Open WebUI re-emits the
          // full sources array on later frames (web search batches results),
          // so the last payload is authoritative.
          collectedSources = sources;
          console.log("[chat:stream] sources captured", {
            effectiveId,
            count: sources.length,
          });
        },
        onDone: async () => {
          console.log("[chat:stream] done", {
            effectiveId,
            tokenCount,
            contentLength: fullContent.length,
          });
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
            conversationId: effectiveId,
            role: "assistant",
            content: fullContent,
            createdAt: Date.now(),
            model,
            info,
            sources: collectedSources,
          };

          finalizeStream(assistantMessage);

          const settings = useSettingsStore.getState();
          if (settings.hapticOnComplete) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          }
          if (settings.chimeOnComplete) {
            playChime();
          }

          // Update conversation with full message history
          await syncToServer(
            effectiveId,
            [...allMessages, assistantMessage],
            model,
            content,
          );
        },
        onError: (error) => {
          console.error("[chat:stream] error", {
            effectiveId,
            error: error instanceof Error ? error.message : String(error),
            hadPartialContent: Boolean(fullContent),
            tokenCount,
          });
          if (fullContent) {
            const partialMessage: Message = {
              id: Crypto.randomUUID(),
              conversationId: effectiveId,
              role: "assistant",
              content: fullContent + "\n\n*[Stream interrupted]*",
              createdAt: Date.now(),
              model,
              sources: collectedSources,
            };
            finalizeStream(partialMessage);

            // Still try to sync partial content
            syncToServer(
              effectiveId,
              [...allMessages, partialMessage],
              model,
              content,
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
 * Update the conversation on the server with the latest messages.
 * The conversation record should already exist (created before streaming).
 */
async function syncToServer(
  conversationId: string,
  messages: Message[],
  model: string,
  firstUserContent: string,
): Promise<void> {
  const title = messages.find((m) => m.role === "user")?.content.slice(0, 100) ?? "New Chat";
  const chatPayload = buildChatPayload(conversationId, title, model, messages);

  console.log("[chat:sync] syncing conversation after stream", {
    conversationId,
    title,
    messageCount: messages.length,
  });

  try {
    await updateServerConversation(conversationId, chatPayload);
    console.log("[chat:sync] update succeeded — reloading sidebar", { conversationId });
    // Refresh sidebar to pick up the updated title/timestamp
    await useConversationStore.getState().loadConversations();
    // `GET /api/v1/chats/` doesn't return folder_id, so re-patch folder
    // memberships from the per-folder endpoint to avoid wiping them.
    await useConversationStore.getState().reloadFolderMemberships();
    const sidebarIds = useConversationStore.getState().conversations.map((c) => c.id);
    console.log("[chat:sync] sidebar reloaded", {
      conversationId,
      sidebarCount: sidebarIds.length,
      conversationInSidebar: sidebarIds.includes(conversationId),
    });
  } catch (e) {
    console.error("[chat:sync] sync FAILED", {
      conversationId,
      error: e instanceof Error ? e.message : String(e),
      status: (e as any)?.status,
      body: (e as any)?.body,
    });
  }
}
