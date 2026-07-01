import type { Atom } from './jotai';
import type { ChatStatus } from 'ai';
import type { UIMessage, Chat } from '@ai-sdk/react';

import { atom } from './jotai';
import { atomWithExternalSync } from './atom-with-external-sync';
import { UseChatAtomOptions, AtomWithChatInit } from './shared';

export type ChatAtom<UI_MESSAGE extends UIMessage> = Atom<Chat<UI_MESSAGE>>;

export type MessagesState<UI_MESSAGE extends UIMessage> = Pick<
  Chat<UI_MESSAGE>,
  | 'messages'
  | 'sendMessage'
  | 'addToolOutput'
  | 'regenerate'
  | 'stop'
  | 'resumeStream'
  | 'lastMessage'
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

  const messagesAtom: Atom<MessagesState<UI_MESSAGE>> = atomWithExternalSync(
    chatAtom,
    chat => ({
      messages: chat.messages,
      sendMessage: chat.sendMessage,
      stop: chat.stop,
      resumeStream: chat.resumeStream,
      addToolOutput: chat.addToolOutput,
      regenerate: chat.regenerate,
      lastMessage: chat.lastMessage,
      setMessages: (msgs: UI_MESSAGE[]) => {
        chat.messages = msgs;
      },
    }),
    (chat, update) => chat['~registerMessagesCallback'](update, throttleWaitMs),
  );

  // messagesAtom.onMount = setAtom => {
  //   const chat = chatAtom.read();
  //   if (resume && chat.status === 'paused') {
  //     chat.resumeStream();
  //   }
  // };

  const statusAtom = atomWithExternalSync<Chat<UI_MESSAGE>, ChatStatus>(
    chatAtom,
    chat => chat.status,
    (chat, update) => chat['~registerStatusCallback'](update),
  );

  const errorAtom: Atom<ErrorState<UI_MESSAGE>> = atomWithExternalSync(
    chatAtom,
    chat => ({
      error: chat.error,
      clearError: chat.clearError,
    }),
    (chat, update) => chat['~registerErrorCallback'](update),
  );

  return {
    idAtom: atom(get => get(chatAtom).id),
    errorAtom,
    statusAtom,
    messagesAtom,
  };
}
