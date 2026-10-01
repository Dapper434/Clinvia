import { useEffect, useRef, useState } from 'react'
import { AlertTriangle, Bot, Send, Sparkles, X } from 'lucide-react'
import { askAssistantApi } from '../../api/portal.js'

const SUGGESTIONS = ['What if I miss a dose?', 'What side effects should I watch for?', 'How long does TB treatment last?']
const GREETING = {
  role: 'assistant',
  content: 'Hi! I can answer general questions about TB treatment and help you get ready for your clinic visits. I’m not a doctor, so for anything about your own medicines, ask your clinic.',
}

/** Floating "Talk to AI" button and chat panel for the patient portal. */
export default function AssistantChat() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState([GREETING])
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const listRef = useRef(null)
  const inputRef = useRef(null)
  const buttonRef = useRef(null)

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, busy])

  useEffect(() => {
    if (!open) return undefined
    inputRef.current?.focus()
    const onKey = (e) => {
      if (e.key !== 'Escape') return
      setOpen(false)
      buttonRef.current?.focus()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  async function send(content) {
    const question = content.trim()
    if (!question || busy) return
    const next = [...messages, { role: 'user', content: question }]
    setMessages(next)
    setText('')
    setBusy(true)
    setError('')
    try {
      const history = next.filter((m) => m !== GREETING).map(({ role, content: c }) => ({ role, content: c }))
      const res = await askAssistantApi(history)
      setMessages([...next, { role: 'assistant', content: res.reply, source: res.source }])
    } catch (err) {
      setError(err.message || 'The assistant couldn’t answer. Try again, or contact your clinic.')
    } finally {
      setBusy(false)
    }
  }

  if (!open) {
    return (
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen(true)}
        aria-expanded="false"
        aria-controls="assistant-panel"
        className="fixed bottom-4 right-4 z-40 inline-flex items-center gap-2 rounded-full bg-teal-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-teal-600/25 transition hover:bg-teal-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2"
      >
        <Sparkles className="h-4 w-4" aria-hidden="true" />
        Talk to AI
      </button>
    )
  }

  return (
    <section
      id="assistant-panel"
      role="dialog"
      aria-label="Treatment assistant"
      className="fixed bottom-4 right-4 z-40 flex h-[min(560px,calc(100vh-6rem))] w-[min(380px,calc(100vw-2rem))] flex-col overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-2xl"
    >
      <header className="flex items-center gap-3 border-b border-gray-100 px-5 py-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-50 text-teal-600"><Bot className="h-5 w-5" aria-hidden="true" /></div>
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-bold text-gray-900">Treatment assistant</h2>
          <p className="text-xs text-gray-500">AI · not a doctor</p>
        </div>
        <button type="button" onClick={() => { setOpen(false); buttonRef.current?.focus() }} className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-800" aria-label="Close assistant">
          <X className="h-4 w-4" />
        </button>
      </header>

      <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto px-5 py-4" aria-live="polite">
        {messages.map((m, i) => (
          <div key={i} className={m.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
            <p className={`max-w-[85%] whitespace-pre-line rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
              m.role === 'user'
                ? 'rounded-br-md bg-teal-600 text-white'
                : m.source === 'safety'
                  ? 'rounded-bl-md border border-rose-200 bg-rose-50 text-rose-900'
                  : 'rounded-bl-md bg-gray-100 text-gray-800'}`}>
              {m.source === 'safety' ? <AlertTriangle className="mb-1 h-4 w-4 text-rose-600" aria-hidden="true" /> : null}
              {m.content}
            </p>
          </div>
        ))}
        {busy ? (
          <div className="flex justify-start" aria-label="The assistant is typing">
            <span className="inline-flex gap-1 rounded-2xl rounded-bl-md bg-gray-100 px-3.5 py-3">
              {[0, 1, 2].map((d) => <span key={d} className="h-1.5 w-1.5 animate-pulse rounded-full bg-gray-400" style={{ animationDelay: `${d * 150}ms` }} />)}
            </span>
          </div>
        ) : null}
        {messages.length === 1 ? (
          <div className="flex flex-wrap gap-2 pt-1">
            {SUGGESTIONS.map((s) => (
              <button key={s} type="button" onClick={() => send(s)} className="rounded-full border border-teal-200 px-3 py-1.5 text-xs font-medium text-teal-700 hover:bg-teal-50">{s}</button>
            ))}
          </div>
        ) : null}
        {error ? <p className="text-xs text-red-700">{error}</p> : null}
      </div>

      <form onSubmit={(e) => { e.preventDefault(); send(text) }} className="border-t border-gray-100 px-4 pb-3 pt-3">
        <div className="flex items-center gap-2">
          <label htmlFor="assistant-input" className="sr-only">Your question</label>
          <input
            id="assistant-input"
            ref={inputRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={800}
            placeholder="Ask about your treatment…"
            className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
          />
          <button type="submit" disabled={busy || !text.trim()} aria-label="Send" className="rounded-xl bg-teal-600 p-2.5 text-white hover:bg-teal-700 disabled:opacity-40">
            <Send className="h-4 w-4" />
          </button>
        </div>
        <p className="mt-2 text-[11px] leading-snug text-gray-500">AI answers can be wrong. Your name and contact details are never shared with it. In an emergency, go to your nearest health facility.</p>
      </form>
    </section>
  )
}
