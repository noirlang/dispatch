import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { api } from "../../lib/api"
import { useAuth } from "../../store/auth"
import { useT, useAppStore } from "../../store/themeAndLocale"
import { motion, AnimatePresence } from "framer-motion"
import { Inbox, Send, FileText, Trash2, Clock, Plus, Mail } from "lucide-react"
import EmailList from "./EmailList"
import EmailReader from "./EmailReader"
import ComposeView from "./ComposeView"

export type Folder = "inbox" | "approvals" | "sent" | "drafts" | "trash"

export default function EmailView() {
  const t = useT()
  const { lang } = useAppStore()
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

  const { data: settings } = useQuery({
    queryKey: ["settings"],
    queryFn: () => api.get<any>("/settings"),
  })

  // Badge count for approvals
  const { data: approvals = [] } = useQuery({
    queryKey: ["emails", "approvals"],
    queryFn: () => api.get<any[]>("/emails?folder=approvals"),
    refetchInterval: 3000,
  })

  function startCompose() {
    const rawSig = settings?.default_signature ?? user?.default_signature ?? ""
    const cleanSig = String(rawSig).replace(/\\n/g, "\n").trim()
    const signature = cleanSig ? `\n\n--\n${cleanSig}` : ""
    setComposeConfig({
      to: "",
      subject: "",
      body: signature,
      isReply: false
    })
    setComposing(true)
  }

  function handleReply(email: any, customBody?: string) {
    const rawSig = settings?.default_signature ?? user?.default_signature ?? ""
    const cleanSig = String(rawSig).replace(/\\n/g, "\n").trim()
    const signature = cleanSig ? `\n\n--\n${cleanSig}` : ""

    const rawQuoted = email.body_text || email.body || ""
    const cleanQuoted = rawQuoted
      .replace(/<!DOCTYPE.*?>/gi, "")
      .replace(/<html.*?>/gi, "")
      .replace(/<\/html>/gi, "")
      .replace(/<body.*?>/gi, "")
      .replace(/<\/body>/gi, "")
      .replace(/<head>[\s\S]*?<\/head>/gi, "")
      .replace(/<style>[\s\S]*?<\/style>/gi, "")
      .trim()

    const senderHeader = email.sender_name 
      ? `${email.sender_name} <${email.from}>`
      : `<${email.from}>`

    const formattedDate = new Date(email.created_at).toLocaleDateString(lang === "tr" ? "tr-TR" : "en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    })

    const quoteHeader = `\n\nOn ${formattedDate}, ${senderHeader} wrote:`
    const quotedLines = cleanQuoted
      .split("\n")
      .map((line: string) => `> ${line}`)
      .join("\n")

    const defaultQuoted = `${quoteHeader}\n${quotedLines}`
    
    setComposeConfig({
      to: email.from,
      subject: email.subject?.startsWith("Re:") ? email.subject : `Re: ${email.subject || ""}`,
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

  // If composing fullscreen, replace the entire email panel with animated ComposeView
  if (composing) {
    return (
      <AnimatePresence mode="wait">
        <motion.div
          key="compose-fullscreen"
          initial={{ opacity: 0, scale: 0.97, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.97, y: 15 }}
          transition={{ type: "spring", damping: 26, stiffness: 280 }}
          className="h-full w-full"
        >
          <ComposeView
            initialTo={composeConfig.to}
            initialSubject={composeConfig.subject}
            initialBody={composeConfig.body}
            isReply={composeConfig.isReply}
            replyEmailId={composeConfig.replyEmailId}
            onClose={() => setComposing(false)}
          />
        </motion.div>
      </AnimatePresence>
    )
  }

  return (
    <div className="h-full flex bg-[var(--bg-primary)] overflow-hidden">
      {/* Sidebar Folders */}
      <aside className="w-56 border-r border-[var(--border-color)] bg-[var(--bg-secondary)] flex flex-col p-3 gap-1 shrink-0">
        <motion.button
          whileTap={{ scale: 0.96 }}
          whileHover={{ scale: 1.02 }}
          onClick={startCompose}
          className="mb-4 w-full bg-[var(--accent)] text-[var(--accent-invert)] text-xs font-bold py-3 px-4 rounded-xl hover:opacity-90 transition-all flex items-center justify-center gap-2 shadow-sm"
        >
          <Plus size={16} />
          <span>{t("compose")}</span>
        </motion.button>

        {folders.map((f) => {
          const isActive = folder === f.id
          return (
            <motion.button
              key={f.id}
              whileTap={{ scale: 0.97 }}
              whileHover={{ x: 2 }}
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
            </motion.button>
          )
        })}
      </aside>

      {/* Email List column */}
      <div className="w-80 border-r border-[var(--border-color)] bg-[var(--bg-primary)] shrink-0 overflow-hidden flex flex-col">
        <EmailList folder={folder} selectedId={selectedId} onSelect={setSelectedId} />
      </div>

      {/* Email Reader View with Fluid Slide/Fade Transitions */}
      <div className="flex-1 overflow-hidden relative">
        <AnimatePresence mode="wait">
          {selectedId ? (
            <motion.div
              key={`reader-${selectedId}`}
              initial={{ opacity: 0, x: 25, filter: "blur(4px)" }}
              animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, x: -25, filter: "blur(4px)" }}
              transition={{ type: "spring", damping: 25, stiffness: 280 }}
              className="h-full w-full"
            >
              <EmailReader
                id={selectedId}
                folder={folder}
                onReply={handleReply}
                onForward={handleForward}
              />
            </motion.div>
          ) : (
            <motion.div
              key="empty-email"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="h-full flex flex-col items-center justify-center text-[var(--text-dim)] gap-3"
            >
              <Mail size={42} className="opacity-30" />
              <span className="text-xs font-medium">{t("select_email")}</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
