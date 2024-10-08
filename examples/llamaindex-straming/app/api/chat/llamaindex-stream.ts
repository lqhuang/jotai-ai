import {
  createCallbacksTransformer,
  createStreamDataTransformer,
  trimStartOfStreamHelper,
  type AIStreamCallbacksAndOptions,
} from "ai";
import type { Response } from "llamaindex";

function createParser(res: AsyncIterable<Response>) {
  const trimStartOfStream = trimStartOfStreamHelper();
  return new ReadableStream<string>({
    async pull(controller): Promise<void> {
      for await (const { response } of res) {
        const text = trimStartOfStream(response);
        if (text) {
          controller.enqueue(text);
        }
      }
      controller.close();
    },
  });
}

export function LlamaIndexStream(
  res: AsyncIterable<Response>,
  callbacks?: AIStreamCallbacksAndOptions,
): ReadableStream {
  return createParser(res)
    .pipeThrough(createCallbacksTransformer(callbacks))
    .pipeThrough(createStreamDataTransformer());
}
