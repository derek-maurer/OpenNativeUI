import { useCallback, useRef } from "react";

function generateUUID(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

import { useChatStore } from "../stores/chatStore";
import { useAuthStore } from "../stores/authStore";
import { useModelStore } from "../stores/modelStore";
import { useConversationStore } from "../stores/conversationStore";
import { streamChatCompletion } from "../services/streaming";
import { getThinkingProfile, resolveEffectiveThinkingValue } from "../lib/modelCapabilities";
import { getThinkingForModel } from "../stores/modelPreferencesStore";
import {
  createServerConversation,
  updateServerConversation,
  buildChatPayload,
} from "../services/conversationApi";
import { assignChatToFolder } from "../services/folderApi";
import type {
  Message,
  MessageInfo,
  MessageSource,
  ChatCompletionRequest,
  MessageContentPart,
} from "../lib/types";

export interface UseStreamingChatOptions {
  /**
   * Called after each response stream completes successfully.
   * Use for platform-specific effects (haptics, audio chime, etc.).
   */
  onComplete?: () => void;
}

export function useStreamingChat(options: UseStreamingChatOptions = {}) {
  const abortRef = useRef<(() => void) | null>(null);

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
        replaceStreamContent,
        setStreaming,
        setStreamingStatus,
        finalizeStream,
        messages,
        pendingFiles,
        clearPendingFiles,
        webSearchEnabled,
      } = useChatStore.getState();

      const model = selectedModelId ?? "default";
      const thinkingProfile = getThinkingProfile(model);
      const thinkingValue = getThinkingForModel(model);

      let effectiveId = conversationId;

      const userMessage: Message = {
        id: generateUUID(),
        conversationId,
        role: "user",
        content,
        createdAt: Date.now(),
        files: pendingFiles.length > 0 ? [...pendingFiles] : undefined,
      };

      addUserMessage(userMessage);

      if (isNew) {
        console.log("[chat:send] creating new conversation on server", {
          conversationId,
          model,
          userMessageId: userMessage.id,
        });
        try {
          const lightweightUserMessage: Message = {
            ...userMessage,
            files: undefined,
          };
          const stub = buildChatPayload(
            "",
            "New Chat",
            model,
            [lightweightUserMessage],
          );
          const created = await createServerConversation(stub);
          effectiveId = created?.id ?? conversationId;
          useChatStore.setState({ currentConversationId: effectiveId });
          console.log("[chat:send] create succeeded — adding to sidebar", {
            clientId: conversationId,
            effectiveId,
          });

          const pendingFolderId = useChatStore.getState().pendingFolderId;
          let appliedFolderId: string | null = null;
          if (pendingFolderId) {
            try {
              await assignChatToFolder(effectiveId, pendingFolderId);
              appliedFolderId = pendingFolderId;
            } catch (folderErr) {
              console.error("[chat:send] folder assignment failed", folderErr);
            } finally {
              useChatStore.getState().setPendingFolderId(null);
            }
          }

          useConversationStore.getState().addConversation({
            id: effectiveId,
            title: "New Chat",
            model,
            createdAt: Date.now(),
            updatedAt: Date.now(),
            folderId: appliedFolderId,
          });
        } catch (e) {
          console.error("[chat:send] create FAILED", {
            conversationId,
            error: e instanceof Error ? e.message : String(e),
          });
        }
      }

      const allMessages = [...messages, userMessage];
      const readyFiles = pendingFiles.filter((f) => f.status === "ready");
      const imageFiles = readyFiles.filter((f) => f.dataUrl);
      const docFiles = readyFiles.filter((f) => !f.dataUrl);

      const apiMessages = allMessages.map((m) => {
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

      const effectiveThinkingValue = resolveEffectiveThinkingValue(
        thinkingProfile,
        thinkingValue,
      );

      const thinkingParams =
        thinkingProfile && effectiveThinkingValue !== null
          ? { [thinkingProfile.paramName]: effectiveThinkingValue }
          : undefined;

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
        ...(thinkingParams && { params: thinkingParams }),
      };

      clearPendingFiles();
      setStreaming(true);

      let fullContent = "";
      let firstTokenTime: number | null = null;
      let tokenCount = 0;
      let collectedSources: MessageSource[] | undefined;

      const stream = streamChatCompletion(serverUrl, token, requestBody, {
        onToken: (token) => {
          if (firstTokenTime === null) firstTokenTime = Date.now();
          tokenCount++;
          fullContent += token;
          appendStreamToken(token);
        },
        onReplaceContent: (content) => {
          if (firstTokenTime === null) firstTokenTime = Date.now();
          tokenCount++;
          fullContent = content;
          replaceStreamContent(content);
        },
        onStatus: (status) => {
          setStreamingStatus(status.done ? null : status);
        },
        onSources: (sources) => {
          collectedSources = sources;
        },
        onDone: async () => {
          console.log("[chat:stream] done", { effectiveId, tokenCount });

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
            id: generateUUID(),
            conversationId: effectiveId,
            role: "assistant",
            content: fullContent,
            createdAt: Date.now(),
            model,
            info,
            sources: collectedSources,
          };

          finalizeStream(assistantMessage);
          options.onComplete?.();

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
          });
          if (fullContent) {
            const partialMessage: Message = {
              id: generateUUID(),
              conversationId: effectiveId,
              role: "assistant",
              content: fullContent + "\n\n*[Stream interrupted]*",
              createdAt: Date.now(),
              model,
              sources: collectedSources,
            };
            finalizeStream(partialMessage);
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
    [options.onComplete],
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

async function syncToServer(
  conversationId: string,
  messages: Message[],
  model: string,
  firstUserContent: string,
): Promise<void> {
  const title =
    messages.find((m) => m.role === "user")?.content.slice(0, 100) ??
    "New Chat";
  const chatPayload = buildChatPayload(conversationId, title, model, messages);
  try {
    await updateServerConversation(conversationId, chatPayload);
    await useConversationStore.getState().loadConversations();
    await useConversationStore.getState().reloadFolderMemberships();
  } catch (e) {
    console.error("[chat:sync] sync FAILED", {
      conversationId,
      error: e instanceof Error ? e.message : String(e),
    });
  }
}
