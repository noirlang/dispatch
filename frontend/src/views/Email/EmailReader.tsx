import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "../../lib/api"
import { useT } from "../../store/themeAndLocale"
import { Reply, Forward, Trash2, CheckCircle, XCircle } from "lucide-react"
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
  onReply: (email: EmailDetail) => void
  onForward: (email: EmailDetail) => void
  onClose?: () => void
}

export default function EmailReader({ id, folder, onReply, onForward }: Props) {
  const t = useT()
  const qc = useQueryClient()

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
    <div className="h-full flex flex-col bg-[var(--bg-primary)] overflow-hidden">
      {/* Subject & Actions Toolbar */}
      <div className="px-6 py-5 border-b border-[var(--border-color)] flex flex-wrap items-center justify-between gap-4 shrink-0">
        <div>
          <h1 className="text-xl font-semibold text-[var(--text-main)] mb-1">
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
          {folder === "approvals" && (
            <>
              <button
                onClick={() => approve.mutate()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#44ff8820] text-[#44ff88] border border-[#44ff8840] hover:bg-[#44ff8830] text-xs font-medium transition-colors"
              >
                <CheckCircle size={14} />
                <span>{t("approve")}</span>
              </button>
              <button
                onClick={() => reject.mutate()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#ff444420] text-[#ff4444] border border-[#ff444440] hover:bg-[#ff444430] text-xs font-medium transition-colors"
              >
                <XCircle size={14} />
                <span>{t("reject")}</span>
              </button>
            </>
          )}

          <button
            onClick={() => onReply(email)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--bg-secondary)] hover:bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-main)] text-xs font-medium transition-colors"
          >
            <Reply size={14} />
            <span>{t("reply")}</span>
          </button>

          <button
            onClick={() => onForward(email)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--bg-secondary)] hover:bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-main)] text-xs font-medium transition-colors"
          >
            <Forward size={14} />
            <span>{t("forward")}</span>
          </button>

          <button
            onClick={() => deleteEmail.mutate()}
            className="p-2 rounded-lg text-[var(--text-dim)] hover:text-[#ff4444] hover:bg-[#ff444415] transition-colors"
            title="Delete message"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* Sender info bar */}
      <div className="px-6 py-3.5 border-b border-[var(--border-color)] flex items-center justify-between bg-[var(--bg-secondary)] shrink-0">
        <div className="flex items-center gap-3">
          <SenderAvatar
            avatarUrl={null}
            initials={email.from[0]?.toUpperCase()}
            name={email.from}
            size={36}
          />
          <div>
            <div className="text-xs font-semibold text-[var(--text-main)]">{email.from}</div>
            <div className="text-[11px] text-[var(--text-dim)]">To: {email.to}</div>
          </div>
        </div>

        <span className="text-xs text-[var(--text-muted)] font-mono">
          {format(new Date(email.created_at), "PPP p")}
        </span>
      </div>

      {/* Email Body */}
      <div className="flex-1 p-8 overflow-y-auto max-w-4xl">
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
    </div>
  )
}
