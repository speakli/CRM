import { useEffect, useRef, useState } from 'react'
import type { Company, CRMRow, Call } from '../parseTSV'
import type { ActiveContext } from '../lib/chatContext'
import { buildSystemPrompt } from '../lib/chatContext'
import { savePatch } from './InlineEdit'

type ProposedChanges = {
  new_call?: {
    contact_id: string
    contact_name: string
    date: string
    type: string
    summary: string
    next_action: string
  }
  contact_patch?: Record<string, string> & { id: string; name?: string }
  company_patch?: Record<string, string> & { id: string; name?: string }
}

type AiResponse = {
  message: string
  awaiting_confirmation: boolean
  proposed_changes: ProposedChanges | null
}

type Message = {
  id: string
  role: 'user' | 'assistant'
  text: string
  apiContent: string
  proposedChanges?: ProposedChanges | null
  awaitingConfirmation?: boolean
  applied?: boolean
  error?: boolean
}

type Props = {
  companies: Company[]
  rows: CRMRow[]
  calls: Call[]
  activeContext: ActiveContext
  crmRules: string
  icpRules: string
  onRefresh: () => Promise<void>
}

function genId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

const INITIAL_MESSAGE: Message = {
  id: 'init',
  role: 'assistant',
  text: 'Bonjour ! Je peux loguer un appel ou répondre à vos questions sur le CRM. Comment puis-je aider ?',
  apiContent:
    'Bonjour ! Je peux loguer un appel ou répondre à vos questions sur le CRM. Comment puis-je aider ?',
}

function ProposedChangesSummary({ changes }: { changes: ProposedChanges }) {
  const lines: string[] = []
  if (changes.new_call) {
    lines.push(`📞 Nouvel appel — ${changes.new_call.contact_name}`)
  }
  if (changes.contact_patch) {
    const p = changes.contact_patch
    if (p.temperature) lines.push(`🌡 Température → ${p.temperature}`)
    if (p.funnel_stage) lines.push(`→ Funnel → ${p.funnel_stage}`)
    if (p.next_action) lines.push(`→ Next action : ${p.next_action}`)
    if (p.recap) lines.push(`→ Récap : ${p.recap.slice(0, 60)}${p.recap.length > 60 ? '…' : ''}`)
  }
  if (changes.company_patch) {
    const p = changes.company_patch
    if (p.score_icp) lines.push(`⭐ Score ICP → ${p.score_icp}`)
    if (p.funnel_stage) lines.push(`→ Funnel entreprise → ${p.funnel_stage}`)
    if (p.next_action) lines.push(`→ Next action : ${p.next_action}`)
    if (p.notes)
      lines.push(`→ Notes : ${p.notes.slice(0, 60)}${p.notes.length > 60 ? '…' : ''}`)
  }

  if (lines.length === 0) return null

  return (
    <div className="mt-2 rounded-md border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-700">
      {lines.map((l, i) => (
        <div key={i}>{l}</div>
      ))}
    </div>
  )
}

export function ChatAssistant({
  companies,
  rows,
  calls,
  activeContext,
  crmRules,
  icpRules,
  onRefresh,
}: Props) {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([INITIAL_MESSAGE])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (open) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, open])

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading) return

    const userMsg: Message = {
      id: genId(),
      role: 'user',
      text: text.trim(),
      apiContent: text.trim(),
    }

    setMessages((prev) => [...prev, userMsg])
    setInput('')
    setLoading(true)

    try {
      const allMsgs = [...messages, userMsg]
      const apiMessages = allMsgs.map((m) => ({ role: m.role, content: m.apiContent }))

      const systemPrompt = buildSystemPrompt(
        rows,
        companies,
        calls,
        activeContext,
        crmRules,
        icpRules,
      )

      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ system: systemPrompt, messages: apiMessages }),
      })

      const data = (await res.json()) as {
        content?: Array<{ type: string; text: string }>
        error?: string
      }

      if (!res.ok || data.error) {
        throw new Error(data.error || `HTTP ${res.status}`)
      }

      const rawText = data.content?.[0]?.text ?? ''

      let parsed: AiResponse
      try {
        parsed = JSON.parse(rawText) as AiResponse
      } catch {
        parsed = { message: rawText, awaiting_confirmation: false, proposed_changes: null }
      }

      const assistantMsg: Message = {
        id: genId(),
        role: 'assistant',
        text: parsed.message,
        apiContent: rawText,
        proposedChanges: parsed.proposed_changes,
        awaitingConfirmation: parsed.awaiting_confirmation,
        applied: false,
        error: false,
      }

      setMessages((prev) => [...prev, assistantMsg])
    } catch (e) {
      const errMsg: Message = {
        id: genId(),
        role: 'assistant',
        text: `Erreur : ${(e as Error).message}`,
        apiContent: `Erreur : ${(e as Error).message}`,
        error: true,
      }
      setMessages((prev) => [...prev, errMsg])
    } finally {
      setLoading(false)
    }
  }

  const applyChanges = async (msgId: string, changes: ProposedChanges) => {
    try {
      if (changes.new_call) {
        const { contact_id, date, type, summary, next_action } = changes.new_call
        const r = await fetch('/api/calls/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contact_id, date, type, summary, next_action }),
        })
        if (!r.ok) {
          const err = (await r.json().catch(() => ({}))) as { error?: string }
          throw new Error(err.error || `HTTP ${r.status}`)
        }
      }

      if (changes.contact_patch) {
        const { id, name: _name, ...rest } = changes.contact_patch
        if (Object.keys(rest).length > 0) {
          await savePatch('contacts', id, rest)
        }
      }

      if (changes.company_patch) {
        const { id, name: _name, ...rest } = changes.company_patch
        if (Object.keys(rest).length > 0) {
          await savePatch('companies', id, rest)
        }
      }

      await onRefresh()

      const confirmUserId = genId()
      const confirmAsstId = genId()

      setMessages((prev) =>
        prev
          .map((m) =>
            m.id === msgId
              ? { ...m, applied: true, awaitingConfirmation: false }
              : m,
          )
          .concat([
            {
              id: confirmUserId,
              role: 'user',
              text: 'Confirmé.',
              apiContent: 'Confirmé.',
            },
            {
              id: confirmAsstId,
              role: 'assistant',
              text: '✓ Mise à jour appliquée dans le CRM.',
              apiContent: '✓ Mise à jour appliquée dans le CRM.',
            },
          ]),
      )
    } catch (e) {
      const errMsg: Message = {
        id: genId(),
        role: 'assistant',
        text: `Erreur lors de l'application : ${(e as Error).message}`,
        apiContent: `Erreur lors de l'application : ${(e as Error).message}`,
        error: true,
      }
      setMessages((prev) => [...prev, errMsg])
    }
  }

  const cancelChanges = (msgId: string) => {
    const cancelUserId = genId()
    const cancelAsstId = genId()

    setMessages((prev) =>
      prev
        .map((m) =>
          m.id === msgId ? { ...m, awaitingConfirmation: false } : m,
        )
        .concat([
          {
            id: cancelUserId,
            role: 'user',
            text: 'Annulé.',
            apiContent: 'Annulé.',
          },
          {
            id: cancelAsstId,
            role: 'assistant',
            text: 'Aucune modification effectuée.',
            apiContent: 'Aucune modification effectuée.',
          },
        ]),
    )
  }

  return (
    <>
      {/* Chat panel */}
      {open && (
        <div
          className="fixed bottom-24 right-6 z-50 flex flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-2xl"
          style={{ width: 350, height: 500 }}
        >
          {/* Header */}
          <div className="flex items-center justify-between bg-zinc-900 px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              <span className="text-sm font-semibold text-white">Assistant Speakli</span>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="text-zinc-400 hover:text-white transition-colors"
              aria-label="Fermer"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="3" y1="3" x2="13" y2="13" />
                <line x1="13" y1="3" x2="3" y2="13" />
              </svg>
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            {messages.map((msg) => (
              <div key={msg.id}>
                <div
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`rounded-xl px-3 py-2 text-sm max-w-[85%] ${
                      msg.role === 'user'
                        ? 'bg-zinc-900 text-white'
                        : msg.error
                          ? 'bg-red-50 text-red-800 ring-1 ring-red-200'
                          : 'bg-zinc-100 text-zinc-900'
                    }`}
                  >
                    <span className="whitespace-pre-wrap">{msg.text}</span>
                    {msg.proposedChanges && !msg.applied && (
                      <ProposedChangesSummary changes={msg.proposedChanges} />
                    )}
                  </div>
                </div>

                {/* Confirmation buttons */}
                {msg.awaitingConfirmation && !msg.applied && msg.proposedChanges && (
                  <div className="flex gap-2 mt-1 justify-start pl-1">
                    <button
                      onClick={() => void applyChanges(msg.id, msg.proposedChanges!)}
                      className="rounded-md bg-emerald-600 px-3 py-1 text-xs font-medium text-white hover:bg-emerald-700 transition-colors"
                    >
                      ✓ Confirmer
                    </button>
                    <button
                      onClick={() => cancelChanges(msg.id)}
                      className="rounded-md bg-zinc-200 px-3 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-300 transition-colors"
                    >
                      ✗ Annuler
                    </button>
                  </div>
                )}
              </div>
            ))}

            {/* Loading indicator */}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-zinc-100 rounded-xl px-3 py-2 flex gap-1 items-center">
                  <span
                    className="h-1.5 w-1.5 rounded-full bg-zinc-400 animate-bounce"
                    style={{ animationDelay: '0ms' }}
                  />
                  <span
                    className="h-1.5 w-1.5 rounded-full bg-zinc-400 animate-bounce"
                    style={{ animationDelay: '150ms' }}
                  />
                  <span
                    className="h-1.5 w-1.5 rounded-full bg-zinc-400 animate-bounce"
                    style={{ animationDelay: '300ms' }}
                  />
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="border-t border-zinc-100 p-3">
            <textarea
              rows={2}
              className="w-full resize-none rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-400 focus:outline-none"
              placeholder="Votre message…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  void sendMessage(input)
                }
              }}
              disabled={loading}
            />
            <div className="mt-1 flex items-center justify-between">
              <span className="text-[10px] text-zinc-400">↵ Envoyer · Shift+↵ Nouvelle ligne</span>
              <button
                onClick={() => void sendMessage(input)}
                disabled={loading || !input.trim()}
                className="rounded-md bg-zinc-900 px-3 py-1 text-xs font-medium text-white hover:bg-zinc-700 disabled:opacity-40 transition-colors"
              >
                Envoyer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating button */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-zinc-900 text-white shadow-lg hover:bg-zinc-700 transition-colors"
        aria-label={open ? 'Fermer le chat' : 'Ouvrir le chat'}
      >
        {open ? (
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="4" y1="4" x2="16" y2="16" />
            <line x1="16" y1="4" x2="4" y2="16" />
          </svg>
        ) : (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        )}
      </button>
    </>
  )
}
