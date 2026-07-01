import type { WritableAtom, Atom, Getter } from './jotai';
import type { ChatStatus } from 'ai';
import type { UIMessage, Chat } from '@ai-sdk/react';

import { atom } from './jotai';
import { UseChatAtomOptions, AtomWithChatInit } from './shared';

export type ChatAtom<UI_MESSAGE extends UIMessage> = Atom<
  Chat<UI_MESSAGE> & UseChatAtomOptions
>;

export function atomWithChat<UI_MESSAGE extends UIMessage>(
  read: AtomWithChatInit<UI_MESSAGE>,
  options?: UseChatAtomOptions | undefined,
): ChatAtom<UI_MESSAGE> {
  const throttleWaitMs = options?.throttleWaitMs;
  const resume = options?.resume ?? false;

  // chatAtom holds the raw Chat instance so useChat can subscribe reactively
  const chatAtom: ChatAtom<UI_MESSAGE> = atom(get =>
    Object.assign(read(get), { throttleWaitMs, resume }),
  );

  return chatAtom;
}
