/// <reference types="@vitest/browser/context" />

/**
 * Modified from Vercel's AI SDK tests:
 * https://github.com/vercel/ai/blob/55e094b8b85581b284fe8e55557542489ff4c2eb/packages/react/src/use-chat.ui.test.tsx
 */

import type { ReactNode, ComponentType, PropsWithChildren } from 'react';
import type { UIMessage, UIMessageChunk, ChatStatus } from 'ai';

import '@testing-library/jest-dom/vitest'; // setup Chai-style assertions
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
import { SWRConfig } from 'swr';
import { Chat, useChat } from '@ai-sdk/react';
import { mockId } from '@ai-sdk/provider-utils/test';
import {
  createTestServer,
  TestResponseController,
} from '@ai-sdk/test-server/with-vitest';
import {
  atom,
  Provider,
  useAtomValue,
  createStore,
  useAtom,
  useSetAtom,
} from 'jotai';
import { useHydrateAtoms } from 'jotai/utils';

import { useChatAtom } from './use-chat-atom';
import { atomWithChat } from '../atom-with-chat';

//
// Setup utils
//

function formatChunk(part: UIMessageChunk) {
  return `data: ${JSON.stringify(part)}\n\n`;
}

const server = createTestServer({
  '/api/chat': {},
  '/api/chat/123/stream': {},
});

const setupTestComponent = ({
  TestComponent,
  init,
}: {
  TestComponent: ComponentType<any>;
  init: ((TestComponent: ComponentType<any>) => ReactNode) | undefined;
}) => {
  beforeEach(() => {
    const store = createStore();

    render(
      <Provider store={store}>
        <SWRConfig value={{ provider: () => new Map() }}>
          {init?.(TestComponent) ?? <TestComponent />}
        </SWRConfig>
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
  const { chatAtom } = atomWithChat(() => {
    return new Chat<UIMessage>({
      id: `first-id-${mockId()()}`,
      messages: [
        { id: 'id-0', role: 'user', parts: [{ text: 'hi', type: 'text' }] },
      ],
    });
  });

  setupTestComponent({
    TestComponent: () => {
      const { messages, status, id: idKey } = useChatAtom(chatAtom);
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
        { id: 'id-0', role: 'user', parts: [{ text: 'hi', type: 'text' }] },
      ]);
    });
  });
});

describe('data protocol stream', () => {
  let onFinishCalls: Array<{ message: UIMessage }> = [];

  const idAtom = atom('first-id');
  const { chatAtom } = atomWithChat(get => {
    return new Chat<UIMessage>({
      id: get(idAtom),
      onFinish: options => {
        onFinishCalls.push(options);
      },
      generateId: mockId(),
    });
  });

  setupTestComponent({
    TestComponent: ({ id: idParam }: { id: string }) => {
      useHydrateAtoms([[idAtom, idParam]]);

      const [idKey, setId] = useAtom(idAtom);
      const { messages, sendMessage, error, status } = useChatAtom(chatAtom);

      return (
        <div>
          <div data-testid="id">{idKey}</div>
          <div data-testid="status">{status.toString()}</div>
          {error && <div data-testid="error">{error.toString()}</div>}
          <div data-testid="messages">{JSON.stringify(messages, null, 2)}</div>
          <button
            data-testid="do-send"
            onClick={() => {
              sendMessage({ parts: [{ text: 'hi', type: 'text' }] });
            }}
          />
          <button
            data-testid="do-change-id"
            onClick={() => {
              setId('second-id');
            }}
          />
        </div>
      );
    },
    init: TestComponent => <TestComponent id={`first-${mockId()()}`} />,
  });

  beforeEach(() => {
    onFinishCalls = [];
  });

  it('should show streamed response', async () => {
    server.urls['/api/chat'].response = {
      type: 'stream-chunks',
      chunks: [
        formatChunk({ type: 'text-start', id: '0' }),
        formatChunk({ type: 'text-delta', id: '0', delta: 'Hello' }),
        formatChunk({ type: 'text-delta', id: '0', delta: ',' }),
        formatChunk({ type: 'text-delta', id: '0', delta: ' world' }),
        formatChunk({ type: 'text-delta', id: '0', delta: '.' }),
        formatChunk({ type: 'text-end', id: '0' }),
      ],
    };

    await userEvent.click(screen.getByTestId('do-send'));

    await waitFor(() => {
      expect(
        JSON.parse(screen.getByTestId('messages').textContent ?? ''),
      ).toStrictEqual([
        {
          role: 'user',
          parts: [{ text: 'hi', type: 'text' }],
          id: 'id-0',
        },
        {
          id: 'id-1',
          role: 'assistant',
          parts: [{ type: 'text', text: 'Hello, world.', state: 'done' }],
        },
      ]);
    });
  });

  it('should show user message immediately', async () => {
    const controller = new TestResponseController();
    server.urls['/api/chat'].response = {
      type: 'controlled-stream',
      controller,
    };

    await userEvent.click(screen.getByTestId('do-send'));

    await waitFor(() => {
      expect(
        JSON.parse(screen.getByTestId('messages').textContent ?? ''),
      ).toStrictEqual([
        {
          role: 'user',
          parts: [{ text: 'hi', type: 'text' }],
          id: 'id-0',
        },
      ]);
    });
  });

  it('should show error response when there is a server error', async () => {
    server.urls['/api/chat'].response = {
      type: 'error',
      status: 404,
      body: 'Not found',
    };

    await userEvent.click(screen.getByTestId('do-send'));

    await screen.findByTestId('error');
    expect(screen.getByTestId('error')).toHaveTextContent('Error: Not found');
  });

  it('should show error response when there is a streaming error', async () => {
    server.urls['/api/chat'].response = {
      type: 'stream-chunks',
      chunks: [
        formatChunk({ type: 'error', errorText: 'custom error message' }),
      ],
    };

    await userEvent.click(screen.getByTestId('do-send'));

    await screen.findByTestId('error');
    expect(screen.getByTestId('error')).toHaveTextContent(
      'Error: custom error message',
    );
  });

  describe('status', () => {
    it('should show status', async () => {
      const controller = new TestResponseController();

      server.urls['/api/chat'].response = {
        type: 'controlled-stream',
        controller,
      };

      await userEvent.click(screen.getByTestId('do-send'));

      await waitFor(() => {
        expect(screen.getByTestId('status')).toHaveTextContent('submitted');
      });

      controller.write(formatChunk({ type: 'text-start', id: '0' }));
      controller.write(
        formatChunk({ type: 'text-delta', id: '0', delta: 'Hello' }),
      );
      controller.write(formatChunk({ type: 'text-end', id: '0' }));

      await waitFor(() => {
        expect(screen.getByTestId('status')).toHaveTextContent('streaming');
      });

      controller.close();

      await waitFor(() => {
        expect(screen.getByTestId('status')).toHaveTextContent('ready');
      });
    });

    it('should set status to error when there is a server error', async () => {
      server.urls['/api/chat'].response = {
        type: 'error',
        status: 404,
        body: 'Not found',
      };

      await userEvent.click(screen.getByTestId('do-send'));

      await waitFor(() => {
        expect(screen.getByTestId('status')).toHaveTextContent('error');
      });
    });
  });

  it('should invoke onFinish when the stream finishes', async () => {
    const controller = new TestResponseController();

    server.urls['/api/chat'].response = {
      type: 'controlled-stream',
      controller,
    };

    await userEvent.click(screen.getByTestId('do-send'));

    controller.write(formatChunk({ type: 'text-start', id: '0' }));
    controller.write(
      formatChunk({ type: 'text-delta', id: '0', delta: 'Hello' }),
    );
    controller.write(formatChunk({ type: 'text-delta', id: '0', delta: ',' }));
    controller.write(
      formatChunk({ type: 'text-delta', id: '0', delta: ' world' }),
    );
    controller.write(formatChunk({ type: 'text-delta', id: '0', delta: '.' }));
    controller.write(formatChunk({ type: 'text-end', id: '0' }));
    controller.write(
      formatChunk({
        type: 'finish',
        messageMetadata: {
          example: 'metadata',
        },
      }),
    );

    controller.close();

    await waitFor(() => {
      expect(
        JSON.parse(screen.getByTestId('messages').textContent ?? ''),
      ).toStrictEqual([
        {
          role: 'user',
          parts: [{ text: 'hi', type: 'text' }],
          id: 'id-0',
        },
        {
          id: 'id-1',
          role: 'assistant',
          metadata: { example: 'metadata' },
          parts: [{ type: 'text', text: 'Hello, world.', state: 'done' }],
        },
      ]);
    });

    expect(onFinishCalls).toMatchInlineSnapshot(`
      [
        {
          "isAbort": false,
          "isDisconnect": false,
          "isError": false,
          "message": {
            "id": "id-1",
            "metadata": {
              "example": "metadata",
            },
            "parts": [
              {
                "providerMetadata": undefined,
                "state": "done",
                "text": "Hello, world.",
                "type": "text",
              },
            ],
            "role": "assistant",
          },
          "messages": [
            {
              "id": "id-0",
              "metadata": undefined,
              "parts": [
                {
                  "text": "hi",
                  "type": "text",
                },
              ],
              "role": "user",
            },
            {
              "id": "id-1",
              "metadata": {
                "example": "metadata",
              },
              "parts": [
                {
                  "providerMetadata": undefined,
                  "state": "done",
                  "text": "Hello, world.",
                  "type": "text",
                },
              ],
              "role": "assistant",
            },
          ],
        },
      ]
    `);
  });

  describe('id', () => {
    it('send the id to the server', async () => {
      server.urls['/api/chat'].response = {
        type: 'stream-chunks',
        chunks: [
          formatChunk({ type: 'text-start', id: '0' }),
          formatChunk({ type: 'text-delta', id: '0', delta: 'Hello' }),
          formatChunk({ type: 'text-delta', id: '0', delta: ',' }),
          formatChunk({ type: 'text-delta', id: '0', delta: ' world' }),
          formatChunk({ type: 'text-delta', id: '0', delta: '.' }),
          formatChunk({ type: 'text-end', id: '0' }),
        ],
      };

      await userEvent.click(screen.getByTestId('do-send'));

      expect(await server.calls[0]!.requestBodyJson).toMatchInlineSnapshot(`
        {
          "id": "first-id-0",
          "messages": [
            {
              "id": "id-0",
              "parts": [
                {
                  "text": "hi",
                  "type": "text",
                },
              ],
              "role": "user",
            },
          ],
          "trigger": "submit-message",
        }
      `);
    });
  });
});
