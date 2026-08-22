import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { api } from "../../lib/api"
import { useAuth } from "../../store/auth"
import { useT } from "../../store/themeAndLocale"
import { Inbox, Send, FileText, Trash2, Clock, Plus, Mail } from "lucide-react"
import EmailList from "./EmailList"
import EmailReader from "./EmailReader"
import ComposeView from "./ComposeView"

export type Folder = "inbox" | "approvals" | "sent" | "drafts" | "trash"

export default function EmailView() {
  const t = useT()
  const { user } = useAuth()
  const [folder, setFolder] = useState<Folder>("inbox")
  const [selectedId, setSelectedId] = useState<number | null>(null)

  // Fullscreen compose state
  const [composing, setComposing] = useState(false)
  const [composeConfig, setComposeConfig] = useState<{
    to?: string
    subject?: string
    body?: string
    isReply?: boolean
    replyEmailId?: number
  }>({})

  // Badge count for approvals
  const { data: approvals = [] } = useQuery({
    queryKey: ["emails", "approvals"],
    queryFn: () => api.get<any[]>("/emails?folder=approvals"),
    refetchInterval: 15_000,
  })

  function startCompose() {
    const signature = user?.default_signature ? `\n\n--\n${user.default_signature}` : ""
    setComposeConfig({
      to: "",
      subject: "",
      body: signature,
      isReply: false
    })
    setComposing(true)
  }

  function handleReply(email: any, customBody?: string) {
    const signature = user?.default_signature ? `\n\n--\n${user.default_signature}` : ""
    const defaultQuoted = `\n\n> On ${new Date(email.created_at).toLocaleString()}, ${email.from} wrote:\n> ${email.body?.replace(/\n/g, "\n> ")}`
    
    setComposeConfig({
      to: email.from,
      subject: email.subject?.startsWith("Re:") ? email.subject : `Re: ${email.subject}`,
      body: (customBody ? `${customBody}${signature}` : "") + defaultQuoted,
      isReply: true,
      replyEmailId: email.id,
    })
    setComposing(true)
  }

  function handleForward(email: any) {
    setComposeConfig({
      to: "",
      subject: email.subject?.startsWith("Fwd:") ? email.subject : `Fwd: ${email.subject}`,
      body: `\n\n---------- Forwarded message ---------\nFrom: ${email.from}\nDate: ${new Date(email.created_at).toLocaleString()}\nSubject: ${email.subject}\nTo: ${email.to}\n\n${email.body}`,
      isReply: false,
    })
    setComposing(true)
  }

  const folders = [
    { id: "inbox" as const,     label: t("inbox"),     icon: <Inbox size={15} />, badge: 0 },
    { id: "approvals" as const, label: t("approvals"), icon: <Clock size={15} />, badge: approvals.filter(a => !a.is_read).length },
    { id: "sent" as const,      label: t("sent"),      icon: <Send size={15} />,  badge: 0 },
    { id: "drafts" as const,    label: t("drafts"),    icon: <FileText size={15} />, badge: 0 },
    { id: "trash" as const,     label: t("trash"),     icon: <Trash2 size={15} />, badge: 0 },
  ]

  // If composing fullscreen, replace the entire email panel with ComposeView
  if (composing) {
    return (
      <ComposeView
        initialTo={composeConfig.to}
        initialSubject={composeConfig.subject}
        initialBody={composeConfig.body}
        isReply={composeConfig.isReply}
        replyEmailId={composeConfig.replyEmailId}
        onClose={() => setComposing(false)}
      />
    )
  }

  return (
    <div className="h-full flex bg-[var(--bg-primary)] overflow-hidden">
      {/* Sidebar Folders */}
      <aside className="w-56 border-r border-[var(--border-color)] bg-[var(--bg-secondary)] flex flex-col p-3 gap-1 shrink-0">
        <button
          onClick={startCompose}
          className="mb-4 w-full bg-[var(--accent)] text-[var(--accent-invert)] text-xs font-bold py-3 px-4 rounded-xl hover:opacity-90 transition-all flex items-center justify-center gap-2 shadow-sm"
        >
          <Plus size={16} />
          <span>{t("compose")}</span>
        </button>

        {folders.map((f) => {
          const isActive = folder === f.id
          return (
            <button
              key={f.id}
              onClick={() => {
                setFolder(f.id)
                setSelectedId(null)
              }}
              className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all text-left ${
                isActive
                  ? "bg-[var(--bg-card)] text-[var(--text-main)] shadow-xs font-bold border border-[var(--border-color)]"
                  : "text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-card)]"
              }`}
            >
              <div className="flex items-center gap-2.5">
                {f.icon}
                <span>{f.label}</span>
              </div>
              {f.badge > 0 && (
                <span className="px-2 py-0.5 text-[10px] font-extrabold rounded-full bg-[#f59e0b20] text-[#f59e0b] border border-[#f59e0b40]">
                  {f.badge}
                </span>
              )}
            </button>
          )
        })}
      </aside>

      {/* Email List column */}
      <div className="w-80 border-r border-[var(--border-color)] bg-[var(--bg-primary)] shrink-0 overflow-hidden flex flex-col">
        <EmailList folder={folder} selectedId={selectedId} onSelect={setSelectedId} />
      </div>

      {/* Email Reader View */}
      <div className="flex-1 overflow-hidden">
        {selectedId ? (
          <EmailReader
            id={selectedId}
            folder={folder}
            onReply={handleReply}
            onForward={handleForward}
          />
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-[var(--text-dim)] gap-3">
            <Mail size={38} className="opacity-40" />
            <span className="text-xs font-medium">{t("select_email")}</span>
          </div>
        )}
      </div>
    </div>
  )
}
