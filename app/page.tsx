"use client"
import { useEffect, useRef, useState } from "react"
import type { KeyboardEventHandler, FormEventHandler } from "react"

type ChatRole = "user" | "assistant"

type ChatMessage = {
  id: string
  role: ChatRole
  text: string
}

function createId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID()
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

type ChatApiResponse = {
  reply?: unknown
}

function getReplyFromUnknown(data: unknown) {
  if (!data || typeof data !== "object") return null
  const reply = (data as ChatApiResponse).reply
  return typeof reply === "string" ? reply : null
}

export default function Home() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const sendMessage = async (overrideMessage?: string) => {
    const trimmed = (overrideMessage ?? input).trim()
    if (!trimmed || isLoading) return

    setError(null)
    setIsLoading(true)

    const userMessage: ChatMessage = { id: createId(), role: "user", text: trimmed }
    setMessages(prev => [...prev, userMessage])
    setInput("")

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed }),
      })

      // Never call response.json() blindly: the server may send HTML, empty body, etc.
      const raw = await response.text()
      const parsed: unknown = raw ? (() => { try { return JSON.parse(raw) } catch { return null } })() : null

      const reply = getReplyFromUnknown(parsed) ?? (raw && !raw.trim().startsWith("<") ? raw : null)

      if (!response.ok) {
        const msg = reply ?? "Server error. Please try again."
        setError(msg)
        setMessages(prev => [...prev, { id: createId(), role: "assistant", text: msg }])
        return
      }

      const finalReply = reply ?? "I couldn’t generate a response this time. Please try again."
      setMessages(prev => [...prev, { id: createId(), role: "assistant", text: finalReply }])
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Network error. Please try again."
      setError(msg)
      setMessages(prev => [...prev, { id: createId(), role: "assistant", text: msg }])
    } finally {
      setIsLoading(false)
    }
  }

  const onKeyDown: KeyboardEventHandler<HTMLInputElement> = (e) => {
    if (e.key === "Enter") {
      e.preventDefault()
      void sendMessage()
    }
  }

  const onSubmit: FormEventHandler<HTMLFormElement> = (e) => {
    e.preventDefault()
    void sendMessage()
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-[#f7f1e8] via-[#efe3cf] to-[#f7f1e8] text-slate-900 flex flex-col items-center p-6 md:p-10">
      <h1 className="text-4xl md:text-5xl font-bold mb-2">Thejas Bailady</h1>

      <p className="text-slate-600 mb-6 text-center">
        ServiceNow Developer | Technical Consultant | Client Engineering
      </p>

      <a
        href="/thejasbailady.pdf"
        download
        className="bg-blue-600 text-white px-5 py-2 rounded hover:bg-blue-700 transition mb-8"
      >
        Download Resume
      </a>

      <section className="w-full max-w-2xl flex-1 flex flex-col gap-4">
        <div className="flex-1 min-h-[260px] max-h-[480px] overflow-y-auto rounded-xl border border-slate-300/70 bg-white/60 backdrop-blur-sm p-4 space-y-4 shadow-sm">
          {messages.length === 0 && (
            <div className="text-sm text-slate-500">
              Start the conversation by asking about my skills, projects, or what I’m best at.
            </div>
          )}

          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`max-w-[80%] md:max-w-[70%] p-3 rounded-lg text-sm leading-relaxed whitespace-pre-line ${
                msg.role === "user"
                  ? "bg-blue-600 text-white ml-auto shadow-md"
                  : "bg-white/80 border border-slate-200 text-slate-900"
              }`}
            >
              {msg.text}
            </div>
          ))}

          <div ref={messagesEndRef} />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <form onSubmit={onSubmit} className="flex gap-2 items-center">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Type a message…"
            disabled={isLoading}
            className="flex-1 rounded-xl border border-slate-300/70 bg-white/70 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-500 outline-none focus:ring-2 focus:ring-blue-500/30"
            aria-label="Chat message"
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="rounded-xl bg-blue-600 px-4 py-3 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-500 transition-colors"
          >
            {isLoading ? "Sending…" : "Send"}
          </button>
        </form>

        <div className="flex flex-wrap gap-2 mt-6">
          <button
            type="button"
            onClick={() => void sendMessage("What ServiceNow experience does Thejas have?")}
            className="bg-white/70 border border-slate-300/70 px-3 py-2 rounded hover:bg-white transition-colors"
          >
            ServiceNow Experience
          </button>

          <button
            type="button"
            onClick={() => void sendMessage("Explain Thejas's projects")}
            className="bg-white/70 border border-slate-300/70 px-3 py-2 rounded hover:bg-white transition-colors"
          >
            Projects
          </button>

          <button
            type="button"
            onClick={() => void sendMessage("What technologies does Thejas know?")}
            className="bg-white/70 border border-slate-300/70 px-3 py-2 rounded hover:bg-white transition-colors"
          >
            Skills
          </button>

          <button
            type="button"
            onClick={() => void sendMessage("Tell me about Thejas's experience")}
            className="bg-white/70 border border-slate-300/70 px-3 py-2 rounded hover:bg-white transition-colors"
          >
            Experience
          </button>
        </div>
      </section>
    </main>
  )
}
