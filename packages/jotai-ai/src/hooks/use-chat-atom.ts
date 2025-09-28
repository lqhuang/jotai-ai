import type {
  UseChatHelpers as AISDK_UseChatHelpers,
  UIMessage,
} from '@ai-sdk/react';
import type { ChatAtom } from '../atom-with-chat';

import { useAtomValue } from 'jotai';

export type UseMessagesAtomOptions<UI_MESSAGE extends UIMessage> = {
  chatAtom: ChatAtom<UI_MESSAGE>;
} & {
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

export type UseChatAtomsOptions<UI_MESSAGE extends UIMessage> =
  UseMessagesAtomOptions<UI_MESSAGE>;

export type UseChatHelpers<UI_MESSAGE extends UIMessage> = Omit<
  AISDK_UseChatHelpers<UI_MESSAGE>,
  'setMessages'
>;

export function useChatAtom<UI_MESSAGE extends UIMessage = UIMessage>({
  chatAtom,
  experimental_throttle,
  resume,
}: UseChatAtomsOptions<UI_MESSAGE>): UseChatHelpers<UI_MESSAGE> {
  const {
    id,
    status,
    error,
    messages,
    lastMessage,
    sendMessage,
    regenerate,
    stop,
    clearError,
    resumeStream,
    addToolResult,
  } = useAtomValue(chatAtom);

  /**
   * TODO: Implement throttling and resume logic if needed.
   */

  return {
    id,
    status,
    error,
    messages,
    // lastMessage, // not expose lastMessage for now, since it's also not exposed in the original useChat
    sendMessage,
    regenerate,
    stop,
    clearError,
    resumeStream,
    addToolResult,

    // setMessages // not implemented yet
  };
}
