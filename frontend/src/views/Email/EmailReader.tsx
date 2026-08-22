import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "../../lib/api"
import { useT } from "../../store/themeAndLocale"
import {
  Reply,
  Forward,
  Trash2,
  CheckCircle,
  XCircle,
  Sparkles,
  Ban,
  RefreshCw,
  X,
  Send,
  MessageSquareQuote
} from "lucide-react"
import DOMPurify from "dompurify"
import ReactMarkdown from "react-markdown"
import SenderAvatar from "../../components/ui/SenderAvatar"
import { format } from "date-fns"

interface EmailDetail {
  id: number
  from: string
  to: string
  subject: string
  body: string
  folder: string
  is_read: boolean
  created_at: string
}

interface Props {
  id: number
  folder: string
  onReply: (email: EmailDetail, customBody?: string) => void
  onForward: (email: EmailDetail) => void
  onClose?: () => void
}

export default function EmailReader({ id, folder, onReply, onForward }: Props) {
  const t = useT()
  const qc = useQueryClient()

  // AI Summary State
  const [summary, setSummary] = useState<string | null>(null)
  const [loadingSummary, setLoadingSummary] = useState(false)

  // AI Reply Prompt Modal State
  const [aiReplyModalOpen, setAiReplyModalOpen] = useState(false)
  const [userInstructions, setUserInstructions] = useState("")
  const [aiTone, setAiTone] = useState<"friendly" | "formal" | "concise">("friendly")
  const [generatingReply, setGeneratingReply] = useState(false)

  const { data: email, isLoading } = useQuery({
    queryKey: ["email", id],
    queryFn: () => api.get<EmailDetail>(`/emails/${id}`),
  })

  const approve = useMutation({
    mutationFn: () => api.post(`/emails/${id}/approve`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["emails"] }),
  })

  const reject = useMutation({
    mutationFn: () => api.post(`/emails/${id}/reject`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["emails"] }),
  })

  const deleteEmail = useMutation({
    mutationFn: () => api.delete(`/emails/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["emails"] }),
  })

  const blockSender = useMutation({
    mutationFn: () => api.post(`/emails/${id}/block_sender`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["emails"] })
      qc.invalidateQueries({ queryKey: ["sender-rules"] })
    }
  })

  async function handleFetchSummary() {
    setLoadingSummary(true)
    try {
      const res = await api.post<{ summary: string }>(`/emails/${id}/ai_summary`)
      setSummary(res.summary)
    } catch {
      setSummary("Failed to generate AI summary. Make sure an AI API key is configured.")
    } finally {
      setLoadingSummary(false)
    }
  }

  async function handleGenerateAiReply() {
    setGeneratingReply(true)
    try {
      const res = await api.post<{ reply_body: string }>(`/emails/${id}/ai_reply`, {
        instructions: userInstructions,
        tone: aiTone
      })
      setAiReplyModalOpen(false)
      if (email) {
        onReply(email, res.reply_body)
      }
    } catch {
      alert("Failed to generate AI reply. Make sure an AI API key is configured.")
    } finally {
      setGeneratingReply(false)
    }
  }

  if (isLoading || !email) {
    return (
      <div className="h-full flex items-center justify-center text-[var(--text-dim)] text-xs">
        Loading email...
      </div>
    )
  }

  const isHtml = email.body?.trim().startsWith("<")
  const safeHtml = isHtml ? DOMPurify.sanitize(email.body || "") : ""

  return (
    <div className="h-full flex flex-col bg-[var(--bg-primary)] overflow-hidden animate-fadeIn">
      {/* Subject & Actions Toolbar */}
      <div className="px-8 py-5 border-b border-[var(--border-color)] flex flex-wrap items-center justify-between gap-4 shrink-0 bg-[var(--bg-secondary)] shadow-2xs">
        <div>
          <h1 className="text-xl font-bold text-[var(--text-main)] mb-1">
            {email.subject || "(No Subject)"}
          </h1>
          <div className="flex items-center gap-2">
            <span className="text-xs text-[var(--text-dim)] font-mono">
              Folder: {email.folder}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {/* AI Action Buttons */}
          <button
            onClick={handleFetchSummary}
            disabled={loadingSummary}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-primary)] text-xs font-semibold hover:bg-[var(--bg-card)] transition-colors shadow-xs"
            title="Summarize email using AI"
          >
            {loadingSummary ? <RefreshCw size={13} className="animate-spin" /> : <Sparkles size={13} className="text-[#f59e0b]" />}
            <span>AI Özetle</span>
          </button>

          <button
            onClick={() => setAiReplyModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-primary)] text-xs font-semibold hover:bg-[var(--bg-card)] transition-colors shadow-xs"
            title="Generate custom reply draft with AI"
          >
            <MessageSquareQuote size={13} className="text-[#3b82f6]" />
            <span>AI ile Yanıtla</span>
          </button>

          {folder === "approvals" && (
            <>
              <button
                onClick={() => approve.mutate()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#22c55e15] text-[#22c55e] border border-[#22c55e30] hover:bg-[#22c55e25] text-xs font-bold transition-colors"
              >
                <CheckCircle size={14} />
                <span>{t("approve")}</span>
              </button>
              <button
                onClick={() => reject.mutate()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#ef444415] text-[#ef4444] border border-[#ef444430] hover:bg-[#ef444425] text-xs font-bold transition-colors"
              >
                <XCircle size={14} />
                <span>{t("reject")}</span>
              </button>
            </>
          )}

          <button
            onClick={() => onReply(email)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[var(--bg-primary)] hover:bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-main)] text-xs font-bold transition-colors shadow-xs"
          >
            <Reply size={14} />
            <span>{t("reply")}</span>
          </button>

          <button
            onClick={() => onForward(email)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--bg-primary)] hover:bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-main)] text-xs font-medium transition-colors shadow-xs"
          >
            <Forward size={14} />
            <span>{t("forward")}</span>
          </button>

          {/* Block Sender Button */}
          <button
            onClick={() => {
              if (confirm(`Block ${email.from} and move messages to trash?`)) {
                blockSender.mutate()
              }
            }}
            className="p-2 rounded-xl text-[var(--text-dim)] hover:text-[#ef4444] hover:bg-[#ef444415] transition-colors"
            title="Kullanıcıyı Engelle (Block Sender)"
          >
            <Ban size={15} />
          </button>

          <button
            onClick={() => deleteEmail.mutate()}
            className="p-2 rounded-xl text-[var(--text-dim)] hover:text-[#ef4444] hover:bg-[#ef444415] transition-colors"
            title="Delete message"
          >
            <Trash2 size={15} />
          </button>
        </div>
      </div>

      {/* AI Summary Banner (if active) */}
      {summary && (
        <div className="mx-8 mt-4 p-4 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-color)] flex items-start justify-between gap-4 shadow-sm animate-fadeIn">
          <div className="flex items-start gap-3">
            <div className="p-1.5 rounded-lg bg-[var(--bg-primary)] border border-[var(--border-color)] mt-0.5">
              <Sparkles size={14} className="text-[#f59e0b]" />
            </div>
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-main)] block mb-1">
                AI Executive Summary
              </span>
              <p className="text-xs text-[var(--text-muted)] leading-relaxed whitespace-pre-line">
                {summary}
              </p>
            </div>
          </div>
          <button onClick={() => setSummary(null)} className="text-[var(--text-dim)] hover:text-[var(--text-main)] p-1">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Sender info bar */}
      <div className="px-8 py-4 border-b border-[var(--border-color)] flex items-center justify-between bg-[var(--bg-secondary)] shrink-0">
        <div className="flex items-center gap-3.5">
          <SenderAvatar
            avatarUrl={null}
            initials={email.from[0]?.toUpperCase()}
            name={email.from}
            size={38}
          />
          <div>
            <div className="text-xs font-bold text-[var(--text-main)]">{email.from}</div>
            <div className="text-[11px] text-[var(--text-dim)]">To: {email.to}</div>
          </div>
        </div>

        <span className="text-xs text-[var(--text-muted)] font-mono">
          {format(new Date(email.created_at), "PPP p")}
        </span>
      </div>

      {/* Email Body */}
      <div className="flex-1 p-10 overflow-y-auto max-w-4xl">
        {isHtml ? (
          <div
            className="prose prose-neutral dark:prose-invert max-w-none text-sm leading-relaxed"
            dangerouslySetInnerHTML={{ __html: safeHtml }}
          />
        ) : (
          <div className="prose prose-neutral dark:prose-invert max-w-none text-sm leading-relaxed font-sans">
            <ReactMarkdown>{email.body || ""}</ReactMarkdown>
          </div>
        )}
      </div>

      {/* AI Smart Reply Prompt Modal */}
      {aiReplyModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl w-full max-w-lg p-6 shadow-2xl flex flex-col gap-4">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border-color)]">
              <div className="flex items-center gap-2">
                <Sparkles size={16} className="text-[#3b82f6]" />
                <span className="text-sm font-bold text-[var(--text-main)]">
                  AI ile Akıllı Yanıt Taslağı Oluştur
                </span>
              </div>
              <button
                onClick={() => setAiReplyModalOpen(false)}
                className="text-[var(--text-dim)] hover:text-[var(--text-main)]"
              >
                <X size={16} />
              </button>
            </div>

            <div className="flex flex-col gap-3">
              <div>
                <label className="text-xs font-semibold text-[var(--text-muted)] block mb-1.5">
                  Özel Talimatlar / Ne demek istiyorsun? (Prompt)
                </label>
                <textarea
                  autoFocus
                  placeholder="örn: Daha samimi bir dille teklifi kabul et ve Perşembe günü saat 14:00 için online toplantı öner..."
                  value={userInstructions}
                  onChange={(e) => setUserInstructions(e.target.value)}
                  className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-main)] text-xs p-3.5 rounded-xl h-24 resize-none focus:outline-none focus:border-[var(--text-main)]"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-[var(--text-muted)] block mb-1.5">
                  Yanıt Tonu (Tone)
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: "friendly" as const, label: "Samimi (Friendly)" },
                    { id: "formal" as const, label: "Resmi (Formal)" },
                    { id: "concise" as const, label: "Kısa ve Net (Concise)" }
                  ].map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setAiTone(t.id)}
                      className={`py-2 px-2 text-xs rounded-xl border font-medium transition-all ${
                        aiTone === t.id
                          ? "bg-[var(--bg-card)] border-[var(--text-main)] text-[var(--text-main)] font-bold shadow-xs"
                          : "bg-[var(--bg-primary)] border-[var(--border-color)] text-[var(--text-muted)]"
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[var(--border-color)]">
              <button
                type="button"
                onClick={() => setAiReplyModalOpen(false)}
                className="px-4 py-2 text-xs font-medium text-[var(--text-muted)] hover:text-[var(--text-main)]"
              >
                Vazgeç
              </button>
              <button
                type="button"
                disabled={generatingReply}
                onClick={handleGenerateAiReply}
                className="flex items-center gap-2 bg-[var(--accent)] text-[var(--accent-invert)] px-5 py-2.5 rounded-xl text-xs font-bold hover:opacity-90 transition-all disabled:opacity-40 shadow-sm"
              >
                {generatingReply ? (
                  <>
                    <RefreshCw size={13} className="animate-spin" />
                    <span>Yazılıyor...</span>
                  </>
                ) : (
                  <>
                    <Send size={13} />
                    <span>Taslağı Oluştur ve Düzenle</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
