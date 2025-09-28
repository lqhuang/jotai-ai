/* eslint-disable jsx-a11y/alt-text */
/* eslint-disable @next/next/no-img-element */

import type { ReactNode, ComponentType, PropsWithChildren } from 'react';
import type { UIMessage, UIMessageChunk, ChatStatus } from 'ai';

// import '@testing-library/jest-dom/vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { cleanup, render } from '@testing-library/react';

import { act, useRef, useState, useMemo, useEffect } from 'react';
import {
  DefaultChatTransport,
  isToolUIPart,
  TextStreamChatTransport,
} from 'ai';
import {
  createTestServer,
  mockId,
  TestResponseController,
} from '@ai-sdk/provider-utils/test';
import {
  atom,
  Provider,
  useAtomValue,
  createStore,
  useAtom,
  useSetAtom,
} from 'jotai';
import { useHydrateAtoms } from 'jotai/utils';

import { Chat, useChat } from '@ai-sdk/react';

import { useChatAtom } from './use-chat-atom';
import { atomWithChat } from '../atom-with-chat';

//
// Setup utils
//

function formatChunk(part: UIMessageChunk) {
  return `data: ${JSON.stringify(part)}\n\n`;
}

type InitAtomValue = Parameters<typeof useHydrateAtoms>['0'];
type Options = Parameters<typeof useHydrateAtoms>['1'];

const HydrateAtoms = ({
  initialValues,
  options,
  children,
}: PropsWithChildren<{
  initialValues: InitAtomValue;
  options?: Options;
}>) => {
  useHydrateAtoms(initialValues, options);
  return children;
};

const server = createTestServer({
  '/api/chat': {},
  '/api/chat/123/stream': {},
});

// const chatIdAtom = atom<string | undefined>(undefined);

// const jotaiChat123Stream = new JotaiChat<UIMessage>({
//   id: 'chat',
//   transport: new DefaultChatTransport({
//     api: '/api/chat/123/stream',
//   }),
//   state: chatState,
// });

const setupTestComponent = ({
  TestComponent,
  // initialValues,
  init,
}: {
  TestComponent: ComponentType<any>;
  init: ((TestComponent: ComponentType<any>) => ReactNode) | undefined;
}) => {
  beforeEach(() => {
    const store = createStore();

    render(
      <Provider store={store}>
        {init?.(TestComponent) ?? <TestComponent />}
      </Provider>,
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
    cleanup();
  });
};

//
// Tests
//

describe('initial messages', () => {
  const { chatAtom } = atomWithChat(get => {
    return new Chat<UIMessage>({
      id: `first-id-${mockId()()}`,
      messages: [
        { role: 'user', parts: [{ text: 'hi', type: 'text' }], id: 'id-0' },
      ],
    });
  });

  setupTestComponent({
    TestComponent: () => {
      const {
        messages,
        status,
        id: idKey,
      } = useChatAtom({
        chatAtom,
      });

      return (
        <div>
          <div data-testid="id">{idKey}</div>
          <div data-testid="status">{status.toString()}</div>
          <div data-testid="messages">{JSON.stringify(messages, null, 2)}</div>
        </div>
      );
    },
    init: TestComponent => <TestComponent />,
  });

  it('should show initial messages', async () => {
    await waitFor(() => {
      expect(
        JSON.parse(screen.getByTestId('messages').textContent ?? ''),
      ).toStrictEqual([
        { role: 'user', parts: [{ text: 'hi', type: 'text' }], id: 'id-0' },
      ]);
    });
  });
});
