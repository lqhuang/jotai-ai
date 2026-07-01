import type { UIMessage, UseChatHelpers } from '@ai-sdk/react';
import type { ChatAtom } from '../atom-with-chat';

import { useCallback } from 'react';
import { useSyncExternalStore, useEffect } from 'react';

import { useAtomValue } from '../jotai';

export type JotaiChatHelpers<UI_MESSAGE extends UIMessage> = Omit<
  UseChatHelpers<UI_MESSAGE>,
  'setMessages' | 'addToolResult'
>;

export function useChatAtomValue<UI_MESSAGE extends UIMessage>(
  chatAtom: ChatAtom<UI_MESSAGE>,
): JotaiChatHelpers<UI_MESSAGE> {
  const chat = useAtomValue(chatAtom);

  // Subscribe to messages with optional throttle.
  // useCallback ensures we re-subscribe when the chat instance changes
  // (e.g. when the user's read function returns a new Chat due to id change).
  const subscribeToMessages = useCallback(
    (update: () => void) =>
      chat['~registerMessagesCallback'](update, chat.throttleWaitMs),
    [chat],
  );

  const messages = useSyncExternalStore(
    subscribeToMessages,
    () => chat.messages,
    () => chat.messages,
  );

  const status = useSyncExternalStore(
    chat['~registerStatusCallback'],
    () => chat.status,
    () => chat.status,
  );

  const error = useSyncExternalStore(
    chat['~registerErrorCallback'],
    () => chat.error,
    () => chat.error,
  );

  useEffect(() => {
    if (chat.resume) chat.resumeStream();
  }, [chat.resume, chat.id]);

  return {
    id: chat.id,
    messages,
    status,
    error,

    sendMessage: chat.sendMessage,
    regenerate: chat.regenerate,
    stop: chat.stop,
    resumeStream: chat.resumeStream,
    addToolOutput: chat.addToolOutput,
    clearError: chat.clearError,
  };
}
