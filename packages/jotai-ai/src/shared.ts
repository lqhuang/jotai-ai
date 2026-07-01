import type { Getter } from './jotai';
import type { UIMessage, Chat } from '@ai-sdk/react';

export type AtomWithChatInit<UI_MESSAGE extends UIMessage> = (
  get: Getter,
) => Chat<UI_MESSAGE>;

/**
 * Sync rest props not belong to @type `Chat` and @type `ChatInit`
 */
export type UseChatAtomOptions = {
  throttleWaitMs?: number;
  resume?: boolean;
};
