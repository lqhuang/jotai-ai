import type { WritableAtom, Atom, Getter } from 'jotai';
import type { UIMessage, AbstractChat, ChatInit, ChatStatus } from 'ai';
import type { UseChatHelpers } from '@ai-sdk/react';

import { atom } from 'jotai';

export type AtomWithChatOptions<UI_MESSAGE extends UIMessage> = (
  get: Getter,
) => AbstractChat<UI_MESSAGE>;

export type AtomWithChatInit<UI_MESSAGE extends UIMessage> = Omit<
  ChatInit<UI_MESSAGE>,
  'id' | 'messages'
>;

type JotaiChatHelpers<UI_MESSAGE extends UIMessage> = Omit<
  UseChatHelpers<UI_MESSAGE>,
  /**
   * Function to update the messages state locally without triggering an API call.
   * Useful for optimistic updates.
   *
   * TODO: Not implemented yet
   */
  'setMessages'
>;

export type AtomWithChatResult<UI_MESSAGE extends UIMessage> = {
  idAtom: Atom<string>;
  statusAtom: Atom<ChatStatus>;
  errorAtom: WritableAtom<Error | undefined, never, void>;
  messagesAtom: Atom<UI_MESSAGE[]>;
  lastMessageAtom: Atom<UI_MESSAGE | undefined>;
  chatAtom: Atom<JotaiChatHelpers<UI_MESSAGE>>;
};

// // overloaded definition 1 with concrete chat instance
// export function atomWithChat<UI_MESSAGE extends UIMessage>(
//   read: AtomWithChatOptions<UIMessage>,
//   chat: AbstractChat<UI_MESSAGE>,
// ): AtomWithChatResult<UI_MESSAGE>;
// // overloaded definition 2 with init options
// export function atomWithChat<UI_MESSAGE extends UIMessage>(
//   read: AtomWithChatOptions<UIMessage>,
//   initOptions: AtomWithChatInit<UI_MESSAGE>,
// ): AtomWithChatResult<UI_MESSAGE>;

export function atomWithChat<UI_MESSAGE extends UIMessage>(
  read: AtomWithChatOptions<UIMessage>,
): AtomWithChatResult<UI_MESSAGE> {
  const statusAtom = atom<ChatStatus>(get => read(get).status);
  const idAtom = atom<string>(get => read(get).id);
  const errorAtom = atom<Error | undefined, never, void>(
    get => read(get).error,
    (get, set) => {
      const chat = read(get);
      return chat.clearError();
    },
  );
  const lastMessageAtom = atom<UI_MESSAGE | undefined>(
    get => read(get).lastMessage,
  );
  const messagesAtom = atom<UI_MESSAGE[]>(get => read(get).messages);

  const chatAtom = atom<JotaiChatHelpers<UI_MESSAGE>>(get => {
    const chat = read(get);

    return {
      // state
      id: chat.id,
      status: chat.status,
      error: chat.error,
      messages: chat.messages,
      lastMessage: chat.lastMessage,

      // handlers
      sendMessage: chat.sendMessage,
      regenerate: chat.regenerate,
      stop: chat.stop,
      clearError: chat.clearError,
      resumeStream: chat.resumeStream,
      addToolResult: chat.addToolResult,
    };
  });

  return {
    idAtom,
    errorAtom,
    statusAtom,
    messagesAtom,
    chatAtom,
    lastMessageAtom,
  };
}
