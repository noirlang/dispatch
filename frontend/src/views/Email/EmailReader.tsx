import { useState, useEffect } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "../../lib/api"
import { useAuth } from "../../store/auth"
import { useT, useAppStore, useDateLocale } from "../../store/themeAndLocale"
import { motion, AnimatePresence } from "framer-motion"
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
  MessageSquareQuote,
  Camera,
  Upload,
  BookmarkPlus,
  Star,
  Languages,
  Globe2
} from "lucide-react"
import DOMPurify from "dompurify"
import EmailMdView from "../../components/ui/EmailMdView"
import EmailIframe from "../../components/ui/EmailIframe"
import SenderAvatar from "../../components/ui/SenderAvatar"
import { format } from "date-fns"

interface EmailDetail {
  id: number
  from: string
  to: string
  subject: string
  body: string
  body_text?: string
  body_html?: string
  folder: string
  is_read: boolean
  is_flagged?: boolean
  is_important_sender?: boolean
  created_at: string
  sender_name?: string
  avatar_url?: string | null
  avatar_initials?: string
  is_known_company?: boolean
  is_dispatch_user?: boolean
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
  const dateLocale = useDateLocale()
  const { user } = useAuth()
  const { addToast } = useAppStore()
  const qc = useQueryClient()

  // AI Summary State
  const [summary, setSummary] = useState<string | null>(null)
  const [loadingSummary, setLoadingSummary] = useState(false)

  // AI Reply Prompt Modal State
  const [aiReplyModalOpen, setAiReplyModalOpen] = useState(false)
  const [userInstructions, setUserInstructions] = useState("")
  const [aiTone, setAiTone] = useState<"friendly" | "formal" | "concise">("friendly")
  const [generatingReply, setGeneratingReply] = useState(false)

  // AI Translation State
  const [translateModalOpen, setTranslateModalOpen] = useState(false)
  const [translating, setTranslating] = useState(false)
  const [translation, setTranslation] = useState<{
    translated_subject: string
    translated_body: string
    target_language: string
  } | null>(null)
  const [showOriginal, setShowOriginal] = useState(false)

  // Remote Images Security State (Thunderbird style - per email)
  const [showRemoteImages, setShowRemoteImages] = useState(false)

  useEffect(() => {
    setShowRemoteImages(false)
  }, [id])

  // Custom Avatar Modal State
  const [avatarModalOpen, setAvatarModalOpen] = useState(false)
  const [avatarUrlInput, setAvatarUrlInput] = useState("")
  const [uploadingAvatar, setUploadingAvatar] = useState(false)

  // Text selection for Pano
  const [selectedText, setSelectedText] = useState("")
  const [selectionPos, setSelectionPos] = useState<{ x: number; y: number } | null>(null)

  const { data: email, isLoading } = useQuery({
    queryKey: ["email", id],
    queryFn: () => api.get<EmailDetail>(`/emails/${id}`),
  })

  const { data: settings } = useQuery({
    queryKey: ["settings"],
    queryFn: () => api.get<any>("/settings"),
  })

  const isAiConfigured = Boolean(settings?.ai_configured || user?.ai_configured)

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

  const toggleImportant = useMutation({
    mutationFn: () => api.post<{ is_important: boolean }>(`/emails/${id}/toggle_important_sender`),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["email", id] })
      qc.invalidateQueries({ queryKey: ["emails"] })
      qc.invalidateQueries({ queryKey: ["email-contacts"] })
      addToast({
        title: "Kişi Durumu",
        from: email?.from || "Kişi",
        subject: data.is_important ? "Önemli kişi olarak işaretlendi ⭐" : "Önemli kişi listesinden çıkarıldı"
      })
    }
  })

  const addToPano = useMutation({
    mutationFn: (text: string) =>
      api.post("/dashboard", {
        summary: text,
        card_type: "general",
        priority: "medium",
        tags: ["email_notu"]
      }),
    onSuccess: () => {
      setSelectedText("")
      setSelectionPos(null)
      qc.invalidateQueries({ queryKey: ["dashboard-cards"] })
      addToast({
        title: "Pano",
        from: "Pano Notu",
        subject: "Seçilen metin başarıyla Panoya eklendi! ✓"
      })
    }
  })

  function handleMouseUp() {
    const sel = window.getSelection()
    const text = sel?.toString().trim()
    if (text && text.length > 3) {
      const oRange = sel?.getRangeAt(0)
      const oRect = oRange?.getBoundingClientRect()
      if (oRect) {
        setSelectedText(text)
        setSelectionPos({ x: oRect.left + oRect.width / 2, y: oRect.top - 45 })
        return
      }
    }
    setSelectedText("")
    setSelectionPos(null)
  }

  async function handleFetchSummary() {
    setLoadingSummary(true)
    try {
      const res = await api.post<{ summary: string }>(`/emails/${id}/ai_summary`)
      setSummary(res.summary)
    } catch {
      setSummary("Yapay zeka özeti oluşturulamadı. Ayarlardan API anahtarınızı kontrol edin.")
    } finally {
      setLoadingSummary(false)
    }
  }

  async function handleGenerateAiReply() {
    setGeneratingReply(true)
    try {
      const res = await api.post<{ reply_body: string
  body_text?: string
  body_html?: string }>(`/emails/${id}/ai_reply`, {
        instructions: userInstructions,
        tone: aiTone
      })
      setAiReplyModalOpen(false)
      if (email) {
        onReply(email, res.reply_body)
      }
    } catch {
      alert("Yapay zeka yanıtı oluşturulamadı.")
    } finally {
      setGeneratingReply(false)
    }
  }

  const languageOptions = [
    { code: "tr", name: "Türkçe", flag: "🇹🇷" },
    { code: "en", name: "English", flag: "🇬🇧" },
    { code: "de", name: "Deutsch", flag: "🇩🇪" },
    { code: "fr", name: "Français", flag: "🇫🇷" },
    { code: "es", name: "Español", flag: "🇪🇸" },
    { code: "it", name: "Italiano", flag: "🇮🇹" },
    { code: "ru", name: "Русский", flag: "🇷🇺" },
    { code: "ar", name: "العربية", flag: "🇸🇦" },
    { code: "ja", name: "日本語", flag: "🇯🇵" },
    { code: "zh", name: "中文", flag: "🇨🇳" }
  ]

  async function handleTranslate(targetLang: string) {
    setTranslating(true)
    try {
      const res = await api.post<{
        translated_subject: string
        translated_body: string
        target_language: string
      }>(`/emails/${id}/ai_translate`, { target_language: targetLang })
      setTranslation(res)
      setShowOriginal(false)
      setTranslateModalOpen(false)
    } catch {
      alert("Çeviri yapılamadı. Lütfen yapay zeka ayarlarınızı kontrol edin.")
    } finally {
      setTranslating(false)
    }
  }

  async function handleSaveContactPhoto(e?: React.ChangeEvent<HTMLInputElement>) {
    if (!email) return
    const file = e?.target.files?.[0]

    if (!file && !avatarUrlInput.trim()) {
      alert("Lütfen bir resim dosyası seçin veya görsel URL adresi girin.")
      return
    }

    setUploadingAvatar(true)

    try {
      let res: any
      if (file) {
        const formData = new FormData()
        formData.append("email", email.from)
        formData.append("file", file)
        res = await api.upload<{ avatar_url: string }>("/sender_profiles/update_avatar", formData)
      } else if (avatarUrlInput.trim()) {
        res = await api.post<{ avatar_url: string }>("/sender_profiles/update_avatar", {
          email: email.from,
          avatar_url: avatarUrlInput.trim()
        })
      }
      setAvatarModalOpen(false)
      setAvatarUrlInput("")
      await qc.invalidateQueries({ queryKey: ["email", id] })
      await qc.invalidateQueries({ queryKey: ["emails"] })
      await qc.invalidateQueries({ queryKey: ["sender-profiles"] })
      await qc.invalidateQueries({ queryKey: ["me"] })
      addToast({
        from: email.sender_name || email.from,
        subject: "Fotoğraf başarıyla güncellendi!",
        avatar_url: res?.avatar_url,
        initials: email.sender_name?.[0]?.toUpperCase() || email.from[0]?.toUpperCase()
      })
    } catch (err: any) {
      alert(err.message || "Fotoğraf kaydedilemedi! Lütfen geçerli bir resim dosyası seçin.")
    } finally {
      setUploadingAvatar(false)
    }
  }

  if (isLoading || !email) {
    return (
      <div className="h-full flex items-center justify-center text-[var(--text-dim)] text-xs">
        Loading email...
      </div>
    )
  }

  const isHtml = Boolean(email.body_html || email.body?.trim().startsWith("<"))
  const rawHtml = email.body_html || (email.body?.trim().startsWith("<") ? email.body : "")
  const safeHtml = isHtml ? DOMPurify.sanitize(rawHtml, {
    ADD_TAGS: ["style", "meta", "link"],
    ADD_ATTR: ["target", "bgcolor", "align", "valign", "border", "cellpadding", "cellspacing"]
  }) : ""
  const hasRemoteImages = /<img[^>]+src=["']https?:\/\//i.test(rawHtml || email.body_text || "")

  return (
    <div
      onMouseUp={handleMouseUp}
      className="h-full flex flex-col bg-[var(--bg-primary)] overflow-hidden animate-fadeIn relative"
    >
      {/* Subject & Actions Toolbar */}
      <div className="px-8 py-5 border-b border-[var(--border-color)] flex flex-wrap items-center justify-between gap-4 shrink-0 bg-[var(--bg-secondary)] shadow-2xs">
        <div>
          <h1 className="text-xl font-bold text-[var(--text-main)] mb-1">
            {translation && !showOriginal ? translation.translated_subject : (email.subject || "(No Subject)")}
          </h1>
          <div className="flex items-center gap-2">
            <span className="text-xs text-[var(--text-dim)] font-mono">
              Klasör: {email.folder}
            </span>
            {translation && !showOriginal && (
              <span className="px-2 py-0.5 rounded-md bg-[#10b98120] text-[#10b981] border border-[#10b98140] text-[10px] font-bold">
                🌐 Çeviri ({languageOptions.find(l => l.code === translation.target_language)?.name || translation.target_language})
              </span>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {/* AI Action Buttons - ONLY SHOWN IF AI IS CONFIGURED */}
          {isAiConfigured && (
            <>
              <motion.button
                whileTap={{ scale: 0.94 }}
                onClick={() => setTranslateModalOpen(true)}
                disabled={translating}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-primary)] text-xs font-semibold hover:bg-[var(--bg-card)] transition-colors shadow-xs"
                title="E-postayı yapay zeka ile çevir"
              >
                {translating ? <RefreshCw size={13} className="animate-spin text-[#10b981]" /> : <Languages size={13} className="text-[#10b981]" />}
                <span>{translating ? "Çevriliyor..." : "Çevir"}</span>
              </motion.button>

              <motion.button
                whileTap={{ scale: 0.94 }}
                onClick={handleFetchSummary}
                disabled={loadingSummary}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-primary)] text-xs font-semibold hover:bg-[var(--bg-card)] transition-colors shadow-xs"
                title="Yapay zeka ile özetle"
              >
                {loadingSummary ? <RefreshCw size={13} className="animate-spin" /> : <Sparkles size={13} className="text-[#f59e0b]" />}
                <span>AI Özetle</span>
              </motion.button>

              <motion.button
                whileTap={{ scale: 0.94 }}
                onClick={() => setAiReplyModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-primary)] text-xs font-semibold hover:bg-[var(--bg-card)] transition-colors shadow-xs"
                title="AI ile yanıt taslağı oluştur"
              >
                <MessageSquareQuote size={13} className="text-[#3b82f6]" />
                <span>AI ile Yanıtla</span>
              </motion.button>
            </>
          )}

          {folder === "approvals" && (
            <>
              <motion.button
                whileTap={{ scale: 0.94 }}
                onClick={() => approve.mutate()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#22c55e15] text-[#22c55e] border border-[#22c55e30] hover:bg-[#22c55e25] text-xs font-bold transition-colors"
              >
                <CheckCircle size={14} />
                <span>{t("approve")}</span>
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.94 }}
                onClick={() => reject.mutate()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#ef444415] text-[#ef4444] border border-[#ef444430] hover:bg-[#ef444425] text-xs font-bold transition-colors"
              >
                <XCircle size={14} />
                <span>{t("reject")}</span>
              </motion.button>
            </>
          )}

          <motion.button
            whileTap={{ scale: 0.94 }}
            onClick={() => onReply(email)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[var(--bg-primary)] hover:bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-main)] text-xs font-bold transition-colors shadow-xs"
          >
            <Reply size={14} />
            <span>{t("reply")}</span>
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.94 }}
            onClick={() => onForward(email)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--bg-primary)] hover:bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-main)] text-xs font-medium transition-colors shadow-xs"
          >
            <Forward size={14} />
            <span>{t("forward")}</span>
          </motion.button>

          {/* Important Sender Toggle Button */}
          <motion.button
            whileTap={{ scale: 0.92 }}
            onClick={() => toggleImportant.mutate()}
            className={`p-2 rounded-xl transition-colors ${
              email.is_important_sender
                ? "text-[#f59e0b] bg-[#f59e0b15] border border-[#f59e0b30]"
                : "text-[var(--text-dim)] hover:text-[#f59e0b] hover:bg-[var(--bg-card)]"
            }`}
            title={email.is_important_sender ? "Önemli Kişiden Çıkar" : "Önemli Kişi Yap ⭐"}
          >
            <Star size={15} className={email.is_important_sender ? "fill-[#f59e0b]" : ""} />
          </motion.button>

          {/* Block Sender Button */}
          <motion.button
            whileTap={{ scale: 0.92 }}
            onClick={() => {
              if (confirm(`${email.from} adresini engellemek ve gelen maillerini çöpe taşımak istiyor musunuz?`)) {
                blockSender.mutate()
              }
            }}
            className="p-2 rounded-xl text-[var(--text-dim)] hover:text-[#ef4444] hover:bg-[#ef444415] transition-colors"
            title="Kullanıcıyı Engelle"
          >
            <Ban size={15} />
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.92 }}
            onClick={() => deleteEmail.mutate()}
            className="p-2 rounded-xl text-[var(--text-dim)] hover:text-[#ef4444] hover:bg-[#ef444415] transition-colors"
            title="Mesajı Sil"
          >
            <Trash2 size={15} />
          </motion.button>
        </div>
      </div>

      {/* AI Summary Banner */}
      <AnimatePresence>
        {summary && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mx-8 mt-4 p-4 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-color)] flex items-start justify-between gap-4 shadow-sm"
          >
            <div className="flex items-start gap-3">
              <div className="p-1.5 rounded-lg bg-[var(--bg-primary)] border border-[var(--border-color)] mt-0.5">
                <Sparkles size={14} className="text-[#f59e0b]" />
              </div>
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-main)] block mb-1">
                  Yapay Zeka Özeti
                </span>
                <p className="text-xs text-[var(--text-muted)] leading-relaxed whitespace-pre-line">
                  {summary}
                </p>
              </div>
            </div>
            <button onClick={() => setSummary(null)} className="text-[var(--text-dim)] hover:text-[var(--text-main)] p-1">
              <X size={14} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sender info bar with Clickable Avatar to assign Custom Photo */}
      <div className="px-8 py-4 border-b border-[var(--border-color)] flex items-center justify-between bg-[var(--bg-secondary)] shrink-0">
        <div className="flex items-center gap-3.5">
          {(() => {
            const isOtherDispatchUser = Boolean(
              email.is_dispatch_user &&
              user?.email &&
              user.email.toLowerCase().trim() !== email.from.toLowerCase().trim()
            )
            return (
              <div
                onClick={() => {
                  if (isOtherDispatchUser) {
                    alert("Bu kullanıcı kayıtlı bir Dispatch kullanıcısıdır. Profil fotoğrafı yalnızca hesap sahibi tarafından değiştirilebilir.")
                    return
                  }
                  setAvatarModalOpen(true)
                }}
                className={`relative group ${isOtherDispatchUser ? "cursor-default" : "cursor-pointer"}`}
                title={
                  isOtherDispatchUser
                    ? "Dispatch Kullanıcısı — Profil fotoğrafı hesap sahibi tarafından yönetilmektedir."
                    : "Kişi fotoğrafını ayarla / değiştir"
                }
              >
                <SenderAvatar
                  avatarUrl={email.avatar_url}
                  initials={email.avatar_initials || email.from[0]?.toUpperCase()}
                  name={email.sender_name || email.from}
                  size={40}
                  isKnownCompany={email.is_known_company}
                />
                {!isOtherDispatchUser && (
                  <div className="absolute inset-0 bg-black/60 rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity">
                    <Camera size={14} />
                  </div>
                )}
              </div>
            )
          })()}

          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-[var(--text-main)]">
                {email.sender_name || email.from}
              </span>
              {email.is_dispatch_user && (
                <span title="Resmi Dispatch Kullanıcısı" className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-[var(--bg-primary)] border border-[var(--border-color)] text-[10px] font-bold text-[var(--text-main)] shadow-2xs select-none">
                  <img src="/dispatch.png" alt="" className="h-3 w-auto object-contain" />
                  <span>Dispatch</span>
                </span>
              )}
            </div>
            <div className="text-[11px] text-[var(--text-dim)] font-mono">{email.from} · Kime: {email.to}</div>
          </div>
        </div>

        <span className="text-xs text-[var(--text-muted)] font-mono">
          {format(new Date(email.created_at), "PPP p", { locale: dateLocale })}
        </span>
      </div>

      {/* Translation Active Banner */}
      {translation && (
        <div className="mx-8 mt-4 px-4 py-3 rounded-2xl bg-[var(--bg-secondary)] border border-[#10b98140] flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2.5">
            <Globe2 size={16} className="text-[#10b981] shrink-0" />
            <span className="text-xs font-semibold text-[var(--text-main)]">
              {showOriginal
                ? "Orijinal e-posta metni gösteriliyor."
                : `Bu e-posta yapay zeka ile [${languageOptions.find(l => l.code === translation.target_language)?.name || translation.target_language}] diline çevrildi.`}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowOriginal(!showOriginal)}
              className="px-3 py-1 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] text-xs font-bold text-[var(--text-main)] hover:bg-[var(--bg-card)] transition-colors shadow-2xs"
            >
              {showOriginal ? "Çeviriyi Göster" : "Orijinali Göster"}
            </button>
            <button
              onClick={() => setTranslateModalOpen(true)}
              className="px-3 py-1 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] text-xs font-semibold text-[var(--text-dim)] hover:text-[var(--text-main)] transition-colors shadow-2xs"
            >
              Farklı Dil Seç
            </button>
          </div>
        </div>
      )}

      {/* Remote Image Security Banner (Thunderbird style - per email) */}
      {hasRemoteImages && !showRemoteImages && (
        <div className="mx-8 mt-3 px-4 py-2.5 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-color)] flex items-center justify-between shadow-xs animate-fadeIn">
          <div className="flex items-center gap-2.5">
            <span className="text-sm">🛡️</span>
            <span className="text-xs font-semibold text-[var(--text-main)]">
              Gizliliğinizi korumak için bu iletideki harici görseller engellendi.
            </span>
          </div>
          <button
            onClick={() => setShowRemoteImages(true)}
            className="px-3.5 py-1.5 rounded-xl bg-[var(--accent)] text-[var(--accent-invert)] text-xs font-bold hover:opacity-90 transition-all shadow-xs cursor-pointer"
          >
            Bu İletideki Görselleri Göster
          </button>
        </div>
      )}

      {/* Email Body */}
      <div className="flex-1 p-10 overflow-y-auto max-w-4xl">
        {translation && !showOriginal ? (
          <div className="text-sm leading-relaxed font-sans text-[var(--text-main)]">
            <EmailMdView content={translation.translated_body} />
          </div>
        ) : isHtml ? (
          <EmailIframe html={safeHtml} allowRemoteImages={showRemoteImages} />
        ) : (
          <div className="text-sm leading-relaxed font-sans text-[var(--text-main)]">
            <EmailMdView content={email.body_text || email.body || ""} />
          </div>
        )}
      </div>

      {/* Floating Action Pill for Selected Text -> Send to Pano */}
      <AnimatePresence>
        {selectedText && selectionPos && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 10 }}
            style={{ left: selectionPos.x, top: selectionPos.y }}
            className="fixed -translate-x-1/2 z-50 flex items-center gap-2 p-1.5 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-color)] shadow-2xl backdrop-blur-md"
          >
            <button
              onClick={() => addToPano.mutate(selectedText)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--accent)] text-[var(--accent-invert)] text-xs font-bold hover:opacity-90 transition-all shadow-xs"
            >
              <BookmarkPlus size={13} />
              <span>{t("send_to_pano")}</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Contact Custom Avatar Modal */}
      <AnimatePresence>
        {avatarModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.88, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.88, y: 20 }}
              className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl w-full max-w-md p-6 shadow-2xl flex flex-col gap-4"
            >
              <div className="flex items-center justify-between pb-3 border-b border-[var(--border-color)]">
                <span className="text-sm font-bold text-[var(--text-main)]">
                  Kişi Fotoğrafı Ayarla ({email.from})
                </span>
                <button onClick={() => setAvatarModalOpen(false)} className="text-[var(--text-dim)] hover:text-[var(--text-main)]">
                  <X size={16} />
                </button>
              </div>

              <div className="flex flex-col gap-4">
                <div>
                  <label className="text-xs font-semibold text-[var(--text-muted)] block mb-1.5">
                    Bilgisayardan Fotoğraf Yükle
                  </label>
                  <label className="flex items-center justify-center gap-2 p-4 rounded-xl border border-dashed border-[var(--border-color)] hover:border-[var(--text-main)] cursor-pointer text-xs font-semibold text-[var(--text-main)] transition-colors">
                    <Upload size={15} />
                    <span>{uploadingAvatar ? "Yükleniyor..." : "Dosya Seç (.png, .jpg)"}</span>
                    <input type="file" accept="image/*" onChange={handleSaveContactPhoto} className="hidden" />
                  </label>
                </div>

                <div className="flex items-center gap-2 text-xs text-[var(--text-dim)]">
                  <div className="flex-1 h-px bg-[var(--border-color)]" />
                  <span>veya</span>
                  <div className="flex-1 h-px bg-[var(--border-color)]" />
                </div>

                <div>
                  <label className="text-xs font-semibold text-[var(--text-muted)] block mb-1.5">
                    Görsel / Logo URL Adresi
                  </label>
                  <input
                    type="url"
                    placeholder="https://example.com/logo.png"
                    value={avatarUrlInput}
                    onChange={e => setAvatarUrlInput(e.target.value)}
                    className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-main)] text-xs px-3.5 py-2.5 rounded-xl focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--border-color)]">
                <button
                  type="button"
                  onClick={() => setAvatarModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-[var(--text-muted)] hover:text-[var(--text-main)]"
                >
                  Vazgeç
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveContactPhoto()}
                  disabled={uploadingAvatar || !avatarUrlInput}
                  className="bg-[var(--accent)] text-[var(--accent-invert)] px-5 py-2 rounded-xl text-xs font-bold hover:opacity-90 disabled:opacity-40 shadow-sm"
                >
                  {uploadingAvatar ? "Kaydediliyor..." : "Kaydet"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* AI Smart Reply Prompt Modal */}
      <AnimatePresence>
        {aiReplyModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.88, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.88, y: 20 }}
              className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl w-full max-w-lg p-6 shadow-2xl flex flex-col gap-4"
            >
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
                            : "bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-muted)]"
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
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Translation Language Selection Modal */}
      <AnimatePresence>
        {translateModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-3xl p-6 max-w-md w-full shadow-2xl flex flex-col gap-4"
            >
              <div className="flex items-center justify-between pb-3 border-b border-[var(--border-color)]">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-[#10b98115] text-[#10b981] border border-[#10b98130] flex items-center justify-center">
                    <Globe2 size={16} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[var(--text-main)]">E-Postayı Çevir</h3>
                    <p className="text-[11px] text-[var(--text-dim)]">Hedef dili seçin, yapay zeka hemen çevirsin</p>
                  </div>
                </div>
                <button
                  onClick={() => setTranslateModalOpen(false)}
                  className="p-1 rounded-full text-[var(--text-dim)] hover:text-[var(--text-main)] hover:bg-[var(--bg-card)]"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Language Grid */}
              <div className="grid grid-cols-2 gap-2.5 py-1">
                {languageOptions.map((opt) => (
                  <motion.button
                    key={opt.code}
                    whileTap={{ scale: 0.96 }}
                    onClick={() => handleTranslate(opt.code)}
                    disabled={translating}
                    className="flex items-center gap-3 p-3 rounded-2xl bg-[var(--bg-primary)] border border-[var(--border-color)] hover:border-[var(--accent)] hover:bg-[var(--bg-card)] text-left transition-all group cursor-pointer"
                  >
                    <span className="text-xl">{opt.flag}</span>
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-[var(--text-main)] group-hover:text-[var(--accent)]">
                        {opt.name}
                      </span>
                      <span className="text-[10px] text-[var(--text-dim)] uppercase font-mono">
                        {opt.code}
                      </span>
                    </div>
                  </motion.button>
                ))}
              </div>

              {translating && (
                <div className="flex items-center justify-center gap-2 py-2 text-xs font-semibold text-[#10b981] animate-pulse">
                  <RefreshCw size={14} className="animate-spin" />
                  <span>Yapay zeka e-postayı çeviriyor, lütfen bekleyin...</span>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
