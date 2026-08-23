import { useState, useRef } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "../../lib/api"
import { useT } from "../../store/themeAndLocale"
import EmailMdView from "../../components/ui/EmailMdView"
import { Send, X, Eye, Edit3, ExternalLink, Paperclip, Loader2 } from "lucide-react"

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
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [to, setTo] = useState(initialTo)
  const [cc, setCc] = useState("")
  const [showCc, setShowCc] = useState(false)
  const [bcc, setBcc] = useState("")
  const [showBcc, setShowBcc] = useState(false)
  const [subject, setSubject] = useState(initialSubject)
  const [body, setBody] = useState(initialBody)
  const [mode, setMode] = useState<"edit" | "preview">("edit")
  const [attachments, setAttachments] = useState<any[]>([])
  const [isUploadingFile, setIsUploadingFile] = useState(false)
  const [draftSaved, setDraftSaved] = useState(false)

  const { data: settings } = useQuery<any>({
    queryKey: ["settings"],
    queryFn: () => api.get("/settings"),
  })

  // Append default signature if available and not already added
  useState(() => {
    if (!initialBody && settings?.default_signature) {
      setBody("\n\n" + settings.default_signature)
    } else if (initialBody && isReply && settings?.default_signature && !initialBody.includes(settings.default_signature)) {
      setBody("\n\n" + settings.default_signature + "\n\n" + initialBody)
    }
  })

  const { data: groups = [] } = useQuery({
    queryKey: ["contact-groups"],
    queryFn: () => api.get<any[]>("/contact_groups"),
  })

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files
    if (!files || files.length === 0) return

    setIsUploadingFile(true)
    try {
      const formData = new FormData()
      for (let i = 0; i < files.length; i++) {
        formData.append("files[]", files[i])
      }

      const res = await api.upload<{ attachments: any[] }>("/attachments/upload", formData)
      if (res.attachments && res.attachments.length > 0) {
        setAttachments(prev => [...prev, ...res.attachments])
      }
    } catch (err: any) {
      alert("Dosya yüklenirken hata oluştu: " + (err?.message || "Bilinmeyen hata"))
    } finally {
      setIsUploadingFile(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  function removeAttachment(index: number) {
    setAttachments(prev => prev.filter((_, i) => i !== index))
  }

  const saveDraft = useMutation({
    mutationFn: () =>
      api.post("/emails/save_draft", {
        to,
        cc: showCc ? cc : undefined,
        bcc: showBcc ? bcc : undefined,
        subject: subject || "(Başlıksız Taslak)",
        body,
        attachments
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["emails"] })
      setDraftSaved(true)
      setTimeout(() => setDraftSaved(false), 2500)
    }
  })

  const sendEmail = useMutation({
    mutationFn: async () => {
      if (isReply && replyEmailId) {
        return api.post(`/emails/${replyEmailId}/reply`, { body, attachments })
      }
      return api.post("/emails", {
        to,
        cc: showCc ? cc : undefined,
        bcc: showBcc ? bcc : undefined,
        subject,
        body,
        attachments
      })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["emails"] })
      onClose()
    },
    onError: (err: any) => {
      console.error("Failed to send email:", err)
      alert("E-posta gönderilemedi: " + (err.response?.data?.error || err.message || "Bilinmeyen hata"))
    }
  })


  const [toFocus, setToFocus] = useState(false)

  // Autocomplete matching groups
  const lastSegment = to.split(/[,;]/).pop()?.trim() || ""
  const showGroupDropdown = toFocus && lastSegment.startsWith("@") && groups.length > 0
  const matchingGroups = showGroupDropdown
    ? groups.filter((g: any) =>
        g.alias?.toLowerCase().includes(lastSegment.toLowerCase()) ||
        g.name?.toLowerCase().includes(lastSegment.replace("@", "").toLowerCase())
      )
    : []

  function selectGroup(alias: string) {
    const rawSegments = to.split(/[,;]/).map(s => s.trim()).filter(Boolean)
    if (rawSegments.length > 0 && rawSegments[rawSegments.length - 1].startsWith("@")) {
      rawSegments[rawSegments.length - 1] = alias
    } else {
      rawSegments.push(alias)
    }
    setTo(rawSegments.join(", ") + ", ")
    setToFocus(false)
  }

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
          <a
            href="https://www.emailmd.dev/builder"
            target="_blank"
            rel="noopener noreferrer"
            title="Email.md Canlı Oluşturucu & Rehberi Aç"
            className="text-[11px] text-[var(--text-dim)] hover:text-[var(--text-main)] hover:border-[var(--text-muted)] font-mono px-2 py-0.5 rounded bg-[var(--bg-secondary)] border border-[var(--border-color)] transition-colors flex items-center gap-1 cursor-pointer"
          >
            <span>Email.md enabled</span>
            <ExternalLink size={10} className="opacity-60" />
          </a>
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
        <div className="relative">
          <div className="flex items-center gap-3">
            <span className="text-xs font-medium text-[var(--text-muted)] w-14 shrink-0">{t("to")}:</span>
            <input
              type="text"
              value={to}
              onFocus={() => setToFocus(true)}
              onBlur={() => setTimeout(() => setToFocus(false), 200)}
              onChange={(e) => setTo(e.target.value)}
              placeholder="kullanici@dispatch.local, diger@dispatch.local veya @ekip"
              disabled={isReply}
              className="flex-1 bg-transparent text-[var(--text-main)] text-sm border-b border-[var(--border-color)] pb-1.5 focus:outline-none focus:border-[var(--text-main)] transition-colors font-mono"
            />
            {!isReply && (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setShowCc((s) => !s)}
                  className={`text-xs px-2 py-0.5 rounded transition-colors ${
                    showCc ? "bg-[var(--bg-card)] text-[var(--text-main)] font-semibold border border-[var(--border-color)]" : "text-[var(--text-dim)] hover:text-[var(--text-main)]"
                  }`}
                >
                  Cc
                </button>
                <button
                  type="button"
                  onClick={() => setShowBcc((s) => !s)}
                  className={`text-xs px-2 py-0.5 rounded transition-colors ${
                    showBcc ? "bg-[var(--bg-card)] text-[var(--text-main)] font-semibold border border-[var(--border-color)]" : "text-[var(--text-dim)] hover:text-[var(--text-main)]"
                  }`}
                >
                  Bcc
                </button>
              </div>
            )}
          </div>

          {/* Autocomplete floating dropdown for @group */}
          {matchingGroups.length > 0 && (
            <div className="absolute left-17 top-full mt-1 z-30 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl shadow-2xl overflow-hidden min-w-[220px] max-h-48 overflow-y-auto">
              <div className="px-3 py-1.5 text-[10px] font-bold text-[var(--text-dim)] border-b border-[var(--border-color)] uppercase tracking-wider">
                E-posta Grupları
              </div>
              {matchingGroups.map((g: any) => (
                <button
                  key={g.id}
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault()
                    selectGroup(g.alias)
                  }}
                  className="w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-[var(--bg-card)] transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-[#3b82f6]">{g.alias}</span>
                    {g.description && <span className="text-[11px] text-[var(--text-muted)] truncate max-w-[120px]">{g.description}</span>}
                  </div>
                  <span className="text-[10px] font-mono text-[var(--text-dim)]">{g.member_count || g.members?.length || 0} üye</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {showCc && !isReply && (
          <div className="flex items-center gap-3">
            <span className="text-xs font-medium text-[var(--text-muted)] w-14 shrink-0">{t("cc")}:</span>
            <input
              type="text"
              value={cc}
              onChange={(e) => setCc(e.target.value)}
              placeholder="kopya@alanlar.com, diger@alanlar.com"
              className="flex-1 bg-transparent text-[var(--text-main)] text-sm border-b border-[var(--border-color)] pb-1.5 focus:outline-none focus:border-[var(--text-main)] transition-colors font-mono"
            />
          </div>
        )}

        {showBcc && !isReply && (
          <div className="flex items-center gap-3">
            <span className="text-xs font-medium text-[var(--text-muted)] w-14 shrink-0">Bcc:</span>
            <input
              type="text"
              value={bcc}
              onChange={(e) => setBcc(e.target.value)}
              placeholder="gizli_kopya@alanlar.com (alıcılar birbirini göremez)"
              className="flex-1 bg-transparent text-[var(--text-main)] text-sm border-b border-[var(--border-color)] pb-1.5 focus:outline-none focus:border-[var(--text-main)] transition-colors font-mono"
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
          <div className="flex-1 p-6 overflow-y-auto max-w-none text-sm leading-relaxed text-[var(--text-main)] font-sans">
            {body.trim() ? (
              <EmailMdView content={body} />
            ) : (
              <span className="text-[var(--text-dim)] italic">No content to preview...</span>
            )}
          </div>
        )}
      </div>

      {/* Attached Files List */}
      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-2 pt-2">
          {attachments.map((att, idx) => (
            <div
              key={att.id || idx}
              className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-color)] text-xs text-[var(--text-main)] shadow-xs"
            >
              <Paperclip size={12} className="text-[#3b82f6]" />
              <span className="max-w-[160px] truncate font-medium">{att.filename}</span>
              <span className="text-[10px] text-[var(--text-dim)] font-mono">
                ({Math.round((att.size || 0) / 1024)} KB)
              </span>
              <button
                type="button"
                onClick={() => removeAttachment(idx)}
                className="text-[var(--text-dim)] hover:text-[#ef4444] transition-colors p-0.5 rounded cursor-pointer"
              >
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Bottom Action bar */}
      <div className="flex items-center justify-between pt-4 mt-2">
        <div className="flex items-center gap-3">
          {/* Hidden File Input */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={handleFileUpload}
            className="hidden"
          />

          {/* Attach Button */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploadingFile}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--bg-secondary)] hover:bg-[var(--bg-card)] border border-[var(--border-color)] text-xs font-medium text-[var(--text-main)] transition-colors cursor-pointer disabled:opacity-50"
          >
            {isUploadingFile ? (
              <Loader2 size={13} className="animate-spin text-[var(--text-muted)]" />
            ) : (
              <Paperclip size={13} className="text-[#3b82f6]" />
            )}
            <span>{isUploadingFile ? "Yükleniyor..." : "Dosya Ekle"}</span>
          </button>

          <span className="text-[11px] text-[var(--text-dim)] hidden sm:inline">
            <kbd className="px-1.5 py-0.5 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded">Ctrl+Enter</kbd> gönder
          </span>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            disabled={saveDraft.isPending || (!to && !subject && !body)}
            onClick={() => saveDraft.mutate()}
            className="px-3.5 py-2 text-xs font-medium text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors rounded-lg hover:bg-[var(--bg-secondary)] border border-transparent hover:border-[var(--border-color)] disabled:opacity-40"
          >
            {draftSaved ? "Taslak Kaydedildi ✓" : saveDraft.isPending ? "Kaydediliyor..." : "Taslak Kaydet"}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors"
          >
            {t("discard")}
          </button>
          <button
            type="button"
            disabled={sendEmail.isPending || isUploadingFile || !to || !body}
            onClick={() => sendEmail.mutate()}
            className="flex items-center gap-2 px-6 py-2 rounded-lg bg-[var(--accent)] text-[var(--accent-invert)] text-xs font-semibold hover:opacity-90 transition-all disabled:opacity-40 cursor-pointer"
          >

            <Send size={13} />
            <span>{sendEmail.isPending ? "Gönderiliyor..." : t("send")}</span>
          </button>
        </div>
      </div>
    </div>
  )
}

