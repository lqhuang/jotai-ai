import type { ChatInit, ChatState, ChatStatus, UIMessage } from 'ai';

import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import { atom } from 'jotai/vanilla';

import { AbstractChat } from 'ai';

import { throttle } from './throttle';

// `WithInitialValue` is not exported from `jotai`
type UIMessagesAtom<T extends UIMessage> = ReturnType<typeof atom<T[]>>;
type StatusAtom = ReturnType<typeof atom<ChatStatus>>;
type ErrorAtom = ReturnType<typeof atom<Error | undefined>>;

// Chat state implementation that bridges jotai to ChatState interface
export class JotaiChatState<UI_MESSAGE extends UIMessage>
  implements ChatState<UI_MESSAGE>
{
  private messagesAtom: UIMessagesAtom<UI_MESSAGE>;
  private messagesSetter: ReturnType<
    typeof useSetAtom<UIMessagesAtom<UI_MESSAGE>>
  >;

  private statusAtom: StatusAtom;
  private statusSetter: ReturnType<typeof useSetAtom<StatusAtom>>;

  private errorAtom: ErrorAtom;
  private errorSetter: ReturnType<typeof useSetAtom<ErrorAtom>>;

  private messagesCallbacks = new Set<() => void>();
  private statusCallbacks = new Set<() => void>();
  private errorCallbacks = new Set<() => void>();

  constructor({
    messagesAtom,
    statusAtom,
    errorAtom,
  }: {
    messagesAtom: UIMessagesAtom<UI_MESSAGE>;
    statusAtom: StatusAtom;
    errorAtom: ErrorAtom;
  }) {
    this.messagesAtom = messagesAtom;
    this.messagesSetter = useSetAtom(this.messagesAtom);

    this.statusAtom = statusAtom;
    this.statusSetter = useSetAtom(this.statusAtom);

    this.errorAtom = errorAtom;
    this.errorSetter = useSetAtom(this.errorAtom);
  }

  get messages(): UI_MESSAGE[] {
    return useAtomValue(this.messagesAtom);
  }

  set messages(newMessages: UI_MESSAGE[]) {
    this.messagesSetter(newMessages);
  }

  get status(): ChatStatus {
    return useAtomValue(this.statusAtom);
  }

  set status(newStatus: ChatStatus) {
    this.statusSetter(newStatus);
    this.statusCallbacks.forEach(callback => callback());
  }

  get error(): Error | undefined {
    return useAtomValue(this.errorAtom);
  }

  set error(newError: Error | undefined) {
    this.errorSetter(newError);
  }

  pushMessage(message: UI_MESSAGE) {
    const [currMsgs, setter] = useAtom(this.messagesAtom);
    setter([...currMsgs, message]);
    this.messagesCallbacks.forEach(callback => callback());
  }

  popMessage() {
    const [currMsgs, setter] = useAtom(this.messagesAtom);
    setter(currMsgs.slice(0, -1));
    this.messagesCallbacks.forEach(callback => callback());
  }

  replaceMessage(index: number, message: UI_MESSAGE) {
    const [currMsgs, setter] = useAtom(this.messagesAtom);
    const newMessages = [
      ...currMsgs.slice(0, index),
      this.snapshot(message),
      ...currMsgs.slice(index + 1),
    ];
    setter(newMessages);
    this.messagesCallbacks.forEach(callback => callback());
  }

  snapshot<T>(value: T): T {
    return structuredClone(value);
  }

  // React subscription methods (using private names like the original)
  '~registerMessagesCallback'(
    onChange: () => void,
    throttleWaitMs?: number,
  ): () => void {
    // Note: We could implement custom throttling here if needed.
    //       current `throttle` function is same to original AI SDK.
    const callback = throttleWaitMs
      ? throttle(onChange, throttleWaitMs)
      : onChange;

    this.messagesCallbacks.add(callback);
    return () => {
      this.messagesCallbacks.delete(callback);
    };
  }

  '~registerStatusCallback'(onChange: () => void): () => void {
    this.statusCallbacks.add(onChange);
    return () => {
      this.statusCallbacks.delete(onChange);
    };
  }

  '~registerErrorCallback'(onChange: () => void): () => void {
    this.errorCallbacks.add(onChange);
    return () => {
      this.errorCallbacks.delete(onChange);
    };
  }
}

export class JotaiChat<
  UI_MESSAGE extends UIMessage,
> extends AbstractChat<UI_MESSAGE> {
  private jotaiState: JotaiChatState<UI_MESSAGE>;

  constructor({
    state,
    ...init
  }: ChatInit<UI_MESSAGE> & { state: JotaiChatState<UI_MESSAGE> }) {
    super({ state, ...init });
    this.jotaiState = state;
  }

  // Expose the subscription methods for useChat
  '~registerMessagesCallback'(
    onChange: () => void,
    throttleWaitMs?: number,
  ): () => void {
    return this.jotaiState['~registerMessagesCallback'](
      onChange,
      throttleWaitMs,
    );
  }

  '~registerStatusCallback'(onChange: () => void): () => void {
    return this.jotaiState['~registerStatusCallback'](onChange);
  }

  '~registerErrorCallback'(onChange: () => void): () => void {
    return this.jotaiState['~registerErrorCallback'](onChange);
  }
}
