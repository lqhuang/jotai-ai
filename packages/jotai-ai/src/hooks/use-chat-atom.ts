import type {
  UseChatHelpers as AISDK_UseChatHelpers,
  UIMessage,
} from '@ai-sdk/react';
import type { ChatAtom } from '../atom-with-chat';

import { useEffect, useCallback, useSyncExternalStore } from 'react';
import { useAtomValue } from 'jotai';

export type UseChatAtomInput<UI_MESSAGE extends UIMessage> =
  ChatAtom<UI_MESSAGE>;

export type UseChatAtomOptions = {
  // Sync rest props not belong to @type `Chat` and @type `ChatInit`

  /**
   * Custom throttle wait in ms for the chat messages and data updates.
   * Default is undefined, which disables throttling.
   */
  experimental_throttle?: number;
  /**
   * Whether to resume an ongoing chat generation stream.
   */
  resume?: boolean;
};

export type UseChatHelpers<UI_MESSAGE extends UIMessage> = Omit<
  AISDK_UseChatHelpers<UI_MESSAGE>,
  'setMessages'
>;

export function useChatAtomValue<UI_MESSAGE extends UIMessage = UIMessage>(
  chatAtom: UseChatAtomInput<UI_MESSAGE>,
  options?: UseChatAtomOptions | undefined,
): UseChatHelpers<UI_MESSAGE> {
  // const {
  //   id,
  //   status,
  //   error,
  //   messages,
  //   lastMessage,
  //   sendMessage,
  //   regenerate,
  //   stop,
  //   clearError,
  //   resumeStream,
  //   addToolResult,
  // } = useAtomValue(chatAtom);
  const chat = useAtomValue(chatAtom);

  const throttleWaitMs = options?.experimental_throttle ?? 300;
  const resume = options?.resume ?? false;

  const subscribeToMessages = useCallback(
    (update: () => void) =>
      // @ts-expect-error FIXME: need to add the `AbstractReactChat` class to upstream
      chat['~registerMessagesCallback'](update, throttleWaitMs),
    [throttleWaitMs, chat.id],
  );
  const messages = useSyncExternalStore(
    subscribeToMessages,
    () => chat.messages,
    () => chat.messages,
  );
  const lastMessage = useSyncExternalStore(
    subscribeToMessages,
    () => chat.lastMessage,
    () => chat.lastMessage,
  );
  const status = useSyncExternalStore(
    // @ts-expect-error FIXME: need to add the `AbstractReactChat` class to upstream
    chat['~registerStatusCallback'],
    () => chat.status,
    () => chat.status,
  );
  const error = useSyncExternalStore(
    // @ts-expect-error FIXME: need to add the `AbstractReactChat` class to upstream
    chat['~registerErrorCallback'],
    () => chat.error,
    () => chat.error,
  );

  useEffect(() => {
    if (resume) chat.resumeStream();
  }, [resume, chat.id]);

  return {
    id: chat.id,
    status,
    error,
    messages,
    // lastMessage, // not expose lastMessage for now, since it's also not exposed in the original useChat

    sendMessage: chat.sendMessage,
    regenerate: chat.regenerate,
    stop: chat.stop,
    clearError: chat.clearError,
    resumeStream: chat.resumeStream,
    addToolResult: chat.addToolResult,

    // setMessages // not implemented yet
  };
}
