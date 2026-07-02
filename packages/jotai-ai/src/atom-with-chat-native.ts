import type { Atom } from './jotai';
import type { ChatStatus } from 'ai';
import type { UIMessage, Chat } from '@ai-sdk/react';

import { atom } from './jotai';
import { atomWithExternalSource } from './atom-with-external-source';
import { UseChatAtomOptions, AtomWithChatInit } from './shared';

export type ChatAtom<UI_MESSAGE extends UIMessage> = Atom<Chat<UI_MESSAGE>>;

export type MessagesState<UI_MESSAGE extends UIMessage> = Pick<
  Chat<UI_MESSAGE>,
  | 'messages'
  | 'lastMessage'
  // ops for messages
  | 'sendMessage'
  | 'stop'
  | 'resumeStream'
  | 'addToolOutput'
  | 'regenerate'
> & {
  setMessages: (messages: UI_MESSAGE[]) => void;
};

export type ErrorState<UI_MESSAGE extends UIMessage> = {
  error: Chat<UI_MESSAGE>['error'];
  clearError: Chat<UI_MESSAGE>['clearError'];
};

export type AtomWithChatResult<UI_MESSAGE extends UIMessage> = {
  idAtom: Atom<Chat<UI_MESSAGE>['id']>;
  statusAtom: Atom<Chat<UI_MESSAGE>['status']>;
  errorAtom: Atom<ErrorState<UI_MESSAGE>>;
  messagesAtom: Atom<MessagesState<UI_MESSAGE>>;
};

export function atomWithChat<UI_MESSAGE extends UIMessage>(
  read: AtomWithChatInit<UI_MESSAGE>,
  options?: Omit<UseChatAtomOptions, 'resume'> | undefined,
): AtomWithChatResult<UI_MESSAGE> {
  const throttleWaitMs = options?.throttleWaitMs;

  const chatAtom: ChatAtom<UI_MESSAGE> = atom(get => read(get));

  const messagesAtom: Atom<MessagesState<UI_MESSAGE>> = atomWithExternalSource(
    chatAtom,
    chat => {
      return {
        messages: chat.messages,
        lastMessage: chat.lastMessage,
        // ops for messages
        sendMessage: chat.sendMessage,
        stop: chat.stop,
        resumeStream: chat.resumeStream,
        addToolOutput: chat.addToolOutput,
        regenerate: chat.regenerate,
        setMessages: (messages: UI_MESSAGE[]) => {
          chat.messages = messages;
        },
      };
    },
    (chat, update) => chat['~registerMessagesCallback'](update, throttleWaitMs),
    (a, b) => a.messages === b.messages,
  );

  const statusAtom = atomWithExternalSource<Chat<UI_MESSAGE>, ChatStatus>(
    chatAtom,
    chat => chat.status,
    (chat, update) => chat['~registerStatusCallback'](update),
  );

  const errorAtom: Atom<ErrorState<UI_MESSAGE>> = atomWithExternalSource(
    chatAtom,
    chat => ({
      error: chat.error,
      clearError: chat.clearError,
    }),
    (chat, update) => chat['~registerErrorCallback'](update),
    (a, b) => a.error === b.error,
  );

  return {
    idAtom: atom(get => get(chatAtom).id),
    errorAtom,
    statusAtom,
    messagesAtom,
  };
}
