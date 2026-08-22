import { useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "../../lib/api"
import { useT } from "../../store/themeAndLocale"
import ReactMarkdown from "react-markdown"
import { Send, X, Eye, Edit3 } from "lucide-react"

interface Props {
  initialTo?: string
  initialSubject?: string
  initialBody?: string
  isReply?: boolean
  replyEmailId?: number
  onClose: () => void
}

export default function ComposeView({
  initialTo = "",
  initialSubject = "",
  initialBody = "",
  isReply = false,
  replyEmailId,
  onClose
}: Props) {
  const t = useT()
  const qc = useQueryClient()

  const [to, setTo] = useState(initialTo)
  const [cc, setCc] = useState("")
  const [showCc, setShowCc] = useState(false)
  const [subject, setSubject] = useState(initialSubject)
  const [body, setBody] = useState(initialBody)
  const [mode, setMode] = useState<"edit" | "preview">("edit")

  const sendEmail = useMutation({
    mutationFn: async () => {
      if (isReply && replyEmailId) {
        return api.post(`/emails/${replyEmailId}/reply`, { body })
      }
      return api.post("/emails", { to, cc: showCc ? cc : undefined, subject, body })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["emails"] })
      onClose()
    }
  })

  function handleKeyDown(e: React.KeyboardEvent) {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault()
      if (to && subject && body) sendEmail.mutate()
    }
    if (e.key === "Escape") {
      onClose()
    }
  }

  return (
    <div
      onKeyDown={handleKeyDown}
      className="h-full flex flex-col bg-[var(--bg-primary)] p-6 max-w-4xl mx-auto w-full animate-fadeIn"
    >
      {/* Header bar */}
      <div className="flex items-center justify-between pb-4 mb-4 border-b border-[var(--border-color)]">
        <div className="flex items-center gap-2">
          <span className="text-base font-medium text-[var(--text-main)]">
            {isReply ? `${t("reply")}: ${initialSubject}` : t("new_message")}
          </span>
          <span className="text-[11px] text-[var(--text-dim)] font-mono px-2 py-0.5 rounded bg-[var(--bg-secondary)] border border-[var(--border-color)]">
            Markdown enabled
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Edit / Preview tabs */}
          <div className="flex rounded-lg bg-[var(--bg-secondary)] p-0.5 border border-[var(--border-color)]">
            <button
              type="button"
              onClick={() => setMode("edit")}
              className={`flex items-center gap-1.5 px-3 py-1 text-xs rounded-md font-medium transition-colors ${
                mode === "edit"
                  ? "bg-[var(--bg-card)] text-[var(--text-main)] shadow-sm"
                  : "text-[var(--text-muted)] hover:text-[var(--text-main)]"
              }`}
            >
              <Edit3 size={13} />
              <span>{t("edit")}</span>
            </button>
            <button
              type="button"
              onClick={() => setMode("preview")}
              className={`flex items-center gap-1.5 px-3 py-1 text-xs rounded-md font-medium transition-colors ${
                mode === "preview"
                  ? "bg-[var(--bg-card)] text-[var(--text-main)] shadow-sm"
                  : "text-[var(--text-muted)] hover:text-[var(--text-main)]"
              }`}
            >
              <Eye size={13} />
              <span>{t("preview")}</span>
            </button>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-secondary)] rounded-lg transition-colors"
            title="Discard (Esc)"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Inputs */}
      <div className="flex flex-col gap-3 mb-4">
        <div className="flex items-center gap-3">
          <span className="text-xs font-medium text-[var(--text-muted)] w-14 shrink-0">{t("to")}:</span>
          <input
            type="email"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            placeholder="recipient@example.com"
            disabled={isReply}
            className="flex-1 bg-transparent text-[var(--text-main)] text-sm border-b border-[var(--border-color)] pb-1.5 focus:outline-none focus:border-[var(--text-main)] transition-colors"
          />
          {!isReply && (
            <button
              type="button"
              onClick={() => setShowCc((s) => !s)}
              className="text-xs text-[var(--text-dim)] hover:text-[var(--text-main)] px-2 py-0.5 rounded"
            >
              {showCc ? "- Cc" : "+ Cc"}
            </button>
          )}
        </div>

        {showCc && !isReply && (
          <div className="flex items-center gap-3">
            <span className="text-xs font-medium text-[var(--text-muted)] w-14 shrink-0">{t("cc")}:</span>
            <input
              type="text"
              value={cc}
              onChange={(e) => setCc(e.target.value)}
              placeholder="comma, separated@emails.com"
              className="flex-1 bg-transparent text-[var(--text-main)] text-sm border-b border-[var(--border-color)] pb-1.5 focus:outline-none focus:border-[var(--text-main)] transition-colors"
            />
          </div>
        )}

        <div className="flex items-center gap-3">
          <span className="text-xs font-medium text-[var(--text-muted)] w-14 shrink-0">{t("subject")}:</span>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder={t("subject")}
            disabled={isReply}
            className="flex-1 bg-transparent text-[var(--text-main)] text-sm border-b border-[var(--border-color)] pb-1.5 font-medium focus:outline-none focus:border-[var(--text-main)] transition-colors"
          />
        </div>
      </div>

      {/* Editor & Preview Area */}
      <div className="flex-1 min-h-[300px] border border-[var(--border-color)] rounded-xl overflow-hidden bg-[var(--bg-secondary)] flex flex-col">
        {mode === "edit" ? (
          <textarea
            autoFocus
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={t("write_message")}
            className="w-full flex-1 p-5 bg-transparent text-[var(--text-main)] text-sm leading-relaxed font-sans placeholder-[var(--text-dim)] resize-none focus:outline-none"
          />
        ) : (
          <div className="flex-1 p-6 overflow-y-auto prose prose-neutral dark:prose-invert max-w-none text-sm leading-relaxed">
            {body.trim() ? (
              <ReactMarkdown>{body}</ReactMarkdown>
            ) : (
              <span className="text-[var(--text-dim)] italic">No content to preview...</span>
            )}
          </div>
        )}
      </div>

      {/* Bottom Action bar */}
      <div className="flex items-center justify-between pt-4 mt-2">
        <span className="text-[11px] text-[var(--text-dim)]">
          Press <kbd className="px-1.5 py-0.5 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded">Ctrl+Enter</kbd> to send
        </span>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors"
          >
            {t("discard")}
          </button>
          <button
            type="button"
            disabled={sendEmail.isPending || !to || !body}
            onClick={() => sendEmail.mutate()}
            className="flex items-center gap-2 px-6 py-2 rounded-lg bg-[var(--accent)] text-[var(--accent-invert)] text-xs font-semibold hover:opacity-90 transition-all disabled:opacity-40"
          >
            <Send size={13} />
            <span>{sendEmail.isPending ? "Sending..." : t("send")}</span>
          </button>
        </div>
      </div>
    </div>
  )
}
