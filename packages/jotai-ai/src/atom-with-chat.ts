import type { WritableAtom, Atom, Getter } from './jotai';
import type { ChatStatus } from 'ai';
import type { UIMessage, Chat, UseChatHelpers } from '@ai-sdk/react';

import { atom } from './jotai';

export type AtomWithChatInit<UI_MESSAGE extends UIMessage> = (
  get: Getter,
) => Chat<UI_MESSAGE>;

type UseChatAtomOptions = {
  // Sync rest props not belong to @type `Chat` and @type `ChatInit`

  /**
   * Custom throttle wait in ms for the chat messages and data updates.
   * Default is undefined, which disables throttling.
   */
  throttleWaitMs?: number;
  /**
   * Whether to resume an ongoing chat generation stream.
   */
  resume?: boolean;
};

export type ChatAtom<UI_MESSAGE extends UIMessage> = Atom<
  Chat<UI_MESSAGE> & UseChatAtomOptions
>;

export type AtomWithChatResult<UI_MESSAGE extends UIMessage> = {
  idAtom: Atom<string>;
  statusAtom: Atom<ChatStatus>;
  errorAtom: WritableAtom<Error | undefined, never, void>;
  messagesAtom: WritableAtom<UI_MESSAGE[], UI_MESSAGE[][], void>;
  lastMessageAtom: Atom<UI_MESSAGE | undefined>;
  chatAtom: ChatAtom<UI_MESSAGE>;
};

export function atomWithChat<UI_MESSAGE extends UIMessage>(
  read: AtomWithChatInit<UI_MESSAGE>,
  options?: UseChatAtomOptions | undefined,
): AtomWithChatResult<UI_MESSAGE> {
  const throttleWaitMs = options?.throttleWaitMs;
  const resume = options?.resume ?? false;

  // chatAtom holds the raw Chat instance so useChat can subscribe reactively
  const chatAtom: ChatAtom<UI_MESSAGE> = atom(get =>
    Object.assign(read(get), { throttleWaitMs, resume }),
  );

  const idAtom = atom<string>(get => get(chatAtom).id);
  const statusAtom = atom<ChatStatus>(get => get(chatAtom).status);
  const errorAtom = atom<Error | undefined, void[], void>(
    get => get(chatAtom).error,
    (get, _set) => get(chatAtom).clearError(),
  );
  const messagesAtom = atom<UI_MESSAGE[], UI_MESSAGE[][], void>(
    get => get(chatAtom).messages,
    (get, _set, msgs: UI_MESSAGE[]) => {
      get(chatAtom).messages = msgs;
    },
  );
  const lastMessageAtom = atom<UI_MESSAGE | undefined>(get => {
    get(chatAtom).lastMessage;
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
