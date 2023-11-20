# AI

> A Jōtai utility package compatible with Vercel AI SDK

## Usage

`jotai-ai` has the same API as [Vercel AI SDK](https://sdk.vercel.ai/docs) but with Jōtai atoms.

So you can integrate it with your existing Jotai atoms easily.

### `chatAtoms`

Similar with [`useChat`](https://sdk.vercel.ai/docs/api-reference/use-chat) from Vercel AI SDK, `chatAtoms` returns a set of atoms for chat.

```tsx
import { chatAtoms } from 'jotai-ai'
import { atomEffect } from 'jotai-effect'
import { useAtomValue } from 'jotai/react'

const {
  messagesAtom,
  inputAtom,
  submitAtom
} = chatAtoms({
  initialMessages: localStorage?.getItem('messages')
    ? JSON.parse(localStorage.getItem('messages'))
    : []
})

// intergrate with `jotai-effect`
const saveMessageEffectAtom = atomEffect((get, set) => {
  const messages = get(messagesAtom)
  localStorage.setItem('messages', JSON.stringify(messages))
})

export default function Chat () {
  const messages = useAtomValue(messagesAtom)
  const [input, handleInputChange] = useAtom(inputAtom)
  const handleSubmit = useSetAtom(submitAtom)

  useAtomValue(saveMessageEffectAtom)

  return (
    <div className="flex flex-col w-full max-w-md py-24 mx-auto stretch">
      {messages.length > 0
        ? messages.map(m => (
          <div key={m.id} className="whitespace-pre-wrap">
            {m.role === 'user' ? 'User: ' : 'AI: '}
            {m.content}
          </div>
        ))
        : null}

      <form onSubmit={handleSubmit}>
        <input
          className="fixed bottom-0 w-full max-w-md p-2 mb-8 border border-gray-300 rounded shadow-xl"
          value={input}
          placeholder="Say something..."
          onChange={handleInputChange}
        />
      </form>
    </div>
  )
}
```