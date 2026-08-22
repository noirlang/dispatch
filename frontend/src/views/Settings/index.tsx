import { useState, useEffect } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "../../lib/api"
import { useAuth } from "../../store/auth"
import { useAppStore, useT, type Theme } from "../../store/themeAndLocale"
import { motion, AnimatePresence } from "framer-motion"
import ReactMarkdown from "react-markdown"
import { GeminiIcon, ClaudeIcon, OpenAIIcon } from "../../components/icons/BrandIcons"
import {
  User,
  Users,
  Key,
  Bot,
  Rss,
  Shield,
  Palette,
  Check,
  Copy,
  Trash2,
  Plus,
  RefreshCw,
  Sparkles,
  Sun,
  Moon,
  Laptop,
  Search,
  CheckCircle2,
  Camera,
  Upload,
  LogOut,
  Lock
} from "lucide-react"

type Tab = "profile" | "appearance" | "contacts" | "speakeasy" | "ai" | "rss" | "security"

export default function SettingsView() {
  const [tab, setTab] = useState<Tab>("profile")
  const { user, logout, fetchMe } = useAuth()
  const t = useT()

  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  function copyText(val: string, key: string) {
    navigator.clipboard.writeText(val)
    setCopiedKey(key)
    setTimeout(() => setCopiedKey(null), 2000)
  }

  return (
    <div className="h-full flex bg-[var(--bg-primary)] text-[var(--text-main)] overflow-hidden">
      {/* Sidebar Nav */}
      <aside className="w-64 border-r border-[var(--border-color)] bg-[var(--bg-secondary)] p-4 flex flex-col justify-between shrink-0">
        <div className="flex flex-col gap-1">
          <div className="px-3 py-2 text-[11px] font-bold text-[var(--text-dim)] uppercase tracking-wider">
            {t("settings")}
          </div>
          <TabBtn id="profile"    icon={<User size={15} />}    label={t("profile")}          active={tab} setTab={setTab} />
          <TabBtn id="appearance" icon={<Palette size={15} />} label={t("appearance")}       active={tab} setTab={setTab} />
          <TabBtn id="contacts"   icon={<Users size={15} />}   label={t("contact_rules")}    active={tab} setTab={setTab} />
          <TabBtn id="speakeasy"  icon={<Key size={15} />}     label={t("speakeasy_codes")}  active={tab} setTab={setTab} />
          <TabBtn id="ai"         icon={<Bot size={15} />}     label={t("ai_settings")}      active={tab} setTab={setTab} />
          <TabBtn id="rss"        icon={<Rss size={15} />}     label={t("rss_settings")}     active={tab} setTab={setTab} />
          <TabBtn id="security"   icon={<Shield size={15} />}  label={t("privacy_security")} active={tab} setTab={setTab} />
        </div>

        {/* Dock-styled Red Danger Sign Out Button */}
        <motion.button
          whileTap={{ scale: 0.96 }}
          whileHover={{ y: -1 }}
          onClick={logout}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all bg-[#ef444415] text-[#ef4444] border border-[#ef444430] hover:bg-[#ef444425] shadow-xs"
        >
          <LogOut size={15} />
          <span>{t("sign_out")}</span>
        </motion.button>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto p-10 max-w-4xl bg-[var(--bg-primary)]">
        <AnimatePresence mode="wait">
          {tab === "profile"    && <ProfileTab key="profile" user={user} onUpdate={fetchMe} />}
          {tab === "appearance" && <AppearanceTab key="appearance" />}
          {tab === "contacts"   && <ContactsTab key="contacts" />}
          {tab === "speakeasy"  && <SpeakeasyTab key="speakeasy" copyText={copyText} copiedKey={copiedKey} />}
          {tab === "ai"         && <AiTab key="ai" />}
          {tab === "rss"        && <RssTab key="rss" />}
          {tab === "security"   && <SecurityTab key="security" />}
        </AnimatePresence>
      </main>
    </div>
  )
}

function TabBtn({ id, icon, label, active, setTab }: {
  id: Tab; icon: React.ReactNode; label: string; active: Tab; setTab: (t: Tab) => void
}) {
  const isActive = active === id
  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      onClick={() => setTab(id)}
      className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all text-left ${
        isActive
          ? "bg-[var(--bg-card)] text-[var(--text-main)] shadow-sm font-semibold border border-[var(--border-color)]"
          : "text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-card)]"
      }`}
    >
      {icon}
      <span>{label}</span>
    </motion.button>
  )
}

/* =========================================================================
   1. PROFILE TAB (SYNCED USER DATA + AVATAR + PASSWORD CHANGE + SIGNATURE PREVIEW)
   ========================================================================= */
function ProfileTab({ user, onUpdate }: { user: any; onUpdate: () => void }) {
  const t = useT()
  const [name, setName] = useState(user?.name || "")
  const [signature, setSignature] = useState(user?.default_signature || "")
  const [previewSig, setPreviewSig] = useState(false)
  const [saved, setSaved] = useState(false)
  const [uploading, setUploading] = useState(false)

  // Password fields
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [pwError, setPwError] = useState("")
  const [pwSuccess, setPwSuccess] = useState("")

  useEffect(() => {
    if (user) {
      setName(user.name || "")
      setSignature(user.default_signature || "")
    }
  }, [user])

  const qc = useQueryClient()

  const updateProfile = useMutation({
    mutationFn: async () => {
      setPwError("")
      setPwSuccess("")
      const payload: any = { name, default_signature: signature }
      if (newPassword) {
        if (newPassword !== confirmPassword) {
          throw new Error("New passwords do not match")
        }
        payload.current_password = currentPassword
        payload.password = newPassword
        payload.password_confirmation = confirmPassword
      }
      return api.patch("/settings", payload)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["settings"] })
      onUpdate()
      setSaved(true)
      if (newPassword) {
        setPwSuccess("Password updated successfully ✓")
        setCurrentPassword("")
        setNewPassword("")
        setConfirmPassword("")
      }
      setTimeout(() => setSaved(false), 2500)
    },
    onError: (err: any) => {
      setPwError(err.message || "Failed to update profile")
    }
  })

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    const formData = new FormData()
    formData.append("file", file)

    setUploading(true)
    try {
      const token = localStorage.getItem("dispatch_token")
      const res = await fetch("http://localhost:3000/api/v1/settings/upload_avatar", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      })
      if (res.ok) {
        onUpdate()
      }
    } catch {
      alert("Failed to upload avatar.")
    } finally {
      setUploading(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="flex flex-col gap-8 max-w-xl"
    >
      <div>
        <h2 className="text-xl font-bold text-[var(--text-main)]">{t("profile")}</h2>
        <p className="text-xs text-[var(--text-muted)] mt-1">Manage your identity, profile picture, signature, and security</p>
      </div>

      {/* Avatar Section */}
      <div className="flex items-center gap-5 p-5 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-color)] shadow-xs">
        <div className="relative group">
          <div className="w-16 h-16 rounded-full bg-[var(--accent)] text-[var(--accent-invert)] flex items-center justify-center font-bold text-xl overflow-hidden shadow-md">
            {user?.avatar_path ? (
              <img src={user.avatar_path} alt={user.name} className="w-full h-full object-cover" />
            ) : (
              <span>{name?.[0]?.toUpperCase() || user?.name?.[0]?.toUpperCase() || "U"}</span>
            )}
          </div>
          <label className="absolute inset-0 bg-black/60 rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity">
            <Camera size={18} />
            <input type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
          </label>
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-sm font-bold text-[var(--text-main)]">{name || user?.name || "User"}</span>
          <span className="text-xs font-mono text-[var(--text-muted)]">{user?.email || "user@dispatch.local"}</span>
          <label className="mt-1 inline-flex items-center gap-1.5 text-xs text-[var(--text-main)] underline font-medium cursor-pointer hover:opacity-80">
            <Upload size={12} />
            <span>{uploading ? "Uploading..." : "Change Profile Photo"}</span>
            <input type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
          </label>
        </div>
      </div>

      {/* Basic Info */}
      <div className="flex flex-col gap-4">
        <div>
          <label className="text-xs font-semibold text-[var(--text-muted)] block mb-1.5">{t("full_name")}</label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-main)] text-sm px-4 py-2.5 rounded-xl focus:outline-none focus:border-[var(--text-main)] font-medium"
          />
        </div>

        <div>
          <label className="text-xs font-semibold text-[var(--text-muted)] block mb-1.5">{t("email_address")}</label>
          <input
            type="text"
            disabled
            value={user?.email || "user@dispatch.local"}
            className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-dim)] text-sm px-4 py-2.5 rounded-xl cursor-not-allowed font-mono opacity-70"
          />
        </div>

        {/* Signature with Segmented Switch */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-semibold text-[var(--text-muted)]">{t("signature")}</label>
            
            {/* Segmented Button */}
            <div className="flex p-0.5 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-color)]">
              <button
                type="button"
                onClick={() => setPreviewSig(false)}
                className={`px-3 py-1 rounded-md text-[11px] font-semibold transition-all ${
                  !previewSig
                    ? "bg-[var(--bg-card)] text-[var(--text-main)] shadow-xs border border-[var(--border-color)]"
                    : "text-[var(--text-dim)] hover:text-[var(--text-main)]"
                }`}
              >
                {t("edit")}
              </button>
              <button
                type="button"
                onClick={() => setPreviewSig(true)}
                className={`px-3 py-1 rounded-md text-[11px] font-semibold transition-all ${
                  previewSig
                    ? "bg-[var(--bg-card)] text-[var(--text-main)] shadow-xs border border-[var(--border-color)]"
                    : "text-[var(--text-dim)] hover:text-[var(--text-main)]"
                }`}
              >
                {t("preview")}
              </button>
            </div>
          </div>

          {!previewSig ? (
            <textarea
              value={signature}
              onChange={e => setSignature(e.target.value)}
              placeholder="e.g. Saygılarımla,&#10;**Ahmet Yılmaz**&#10;Ürün Yöneticisi"
              className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-main)] text-xs p-4 rounded-xl h-28 resize-none focus:outline-none focus:border-[var(--text-main)] font-mono leading-relaxed"
            />
          ) : (
            <div className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] p-4 rounded-xl min-h-[112px] text-xs text-[var(--text-main)] flex flex-col justify-center">
              {signature.trim() ? (
                <div className="prose prose-neutral dark:prose-invert max-w-none text-xs leading-relaxed whitespace-pre-wrap font-sans">
                  <ReactMarkdown>{signature}</ReactMarkdown>
                </div>
              ) : (
                <span className="text-[var(--text-dim)] italic text-xs">Henüz bir imza yazılmadı...</span>
              )}
            </div>
          )}
          <span className="text-[11px] text-[var(--text-dim)] mt-1.5 block">
            Bu imza yeni bir e-posta yazarken iletinin en altına otomatik olarak eklenir.
          </span>
        </div>

        {/* Password Change Box */}
        <div className="p-5 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-color)] flex flex-col gap-3 mt-2">
          <div className="flex items-center gap-2 pb-2 border-b border-[var(--border-color)]">
            <Lock size={14} className="text-[var(--text-dim)]" />
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-main)]">
              {t("change_password")}
            </span>
          </div>

          <div>
            <label className="text-[11px] font-semibold text-[var(--text-muted)] block mb-1">{t("current_password")}</label>
            <input
              type="password"
              placeholder="••••••••"
              value={currentPassword}
              onChange={e => setCurrentPassword(e.target.value)}
              className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-main)] text-xs px-3.5 py-2 rounded-xl focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-semibold text-[var(--text-muted)] block mb-1">{t("new_password")}</label>
              <input
                type="password"
                placeholder="••••••••"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-main)] text-xs px-3.5 py-2 rounded-xl focus:outline-none"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-[var(--text-muted)] block mb-1">{t("confirm_password")}</label>
              <input
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-main)] text-xs px-3.5 py-2 rounded-xl focus:outline-none"
              />
            </div>
          </div>

          {pwError && <span className="text-xs text-[#ef4444] font-medium">{pwError}</span>}
          {pwSuccess && <span className="text-xs text-[#22c55e] font-medium">{pwSuccess}</span>}
        </div>

        <div className="pt-2">
          <motion.button
            whileTap={{ scale: 0.96 }}
            whileHover={{ scale: 1.02 }}
            onClick={() => updateProfile.mutate()}
            disabled={updateProfile.isPending}
            className="bg-[var(--accent)] text-[var(--accent-invert)] text-xs px-6 py-2.5 rounded-xl font-bold hover:opacity-90 transition-all shadow-sm disabled:opacity-50"
          >
            {saved ? t("saved") : updateProfile.isPending ? "Kaydediliyor..." : t("save_changes")}
          </motion.button>
        </div>
      </div>
    </motion.div>
  )
}

/* =========================================================================
   2. APPEARANCE & LANGUAGE TAB
   ========================================================================= */
function AppearanceTab() {
  const t = useT()
  const { theme, setTheme, lang, setLang } = useAppStore()

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="flex flex-col gap-8 max-w-xl"
    >
      <div>
        <h2 className="text-xl font-bold text-[var(--text-main)]">{t("appearance")}</h2>
        <p className="text-xs text-[var(--text-muted)] mt-1">Configure theme and interface language</p>
      </div>

      {/* Theme Picker */}
      <div className="flex flex-col gap-3">
        <label className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
          {t("theme")}
        </label>
        <div className="grid grid-cols-3 gap-3">
          {[
            { id: "dark" as Theme, label: t("theme_dark"), icon: <Moon size={16} /> },
            { id: "light" as Theme, label: t("theme_light"), icon: <Sun size={16} /> },
            { id: "system" as Theme, label: t("theme_system"), icon: <Laptop size={16} /> },
          ].map(opt => (
            <motion.button
              key={opt.id}
              whileTap={{ scale: 0.95 }}
              onClick={() => setTheme(opt.id)}
              className={`p-4 rounded-2xl border flex flex-col items-center gap-2.5 transition-all ${
                theme === opt.id
                  ? "bg-[var(--bg-card)] text-[var(--text-main)] border-[var(--text-main)] shadow-md font-bold"
                  : "bg-[var(--bg-secondary)] text-[var(--text-muted)] border-[var(--border-color)] hover:border-[var(--text-dim)]"
              }`}
            >
              {opt.icon}
              <span className="text-xs">{opt.label}</span>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Language Picker */}
      <div className="flex flex-col gap-3 pt-4 border-t border-[var(--border-color)]">
        <label className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
          {t("language")}
        </label>
        <div className="grid grid-cols-2 gap-3">
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={() => setLang("tr")}
            className={`p-4 rounded-2xl border flex items-center justify-between transition-all ${
              lang === "tr"
                ? "bg-[var(--bg-card)] text-[var(--text-main)] border-[var(--text-main)] shadow-md font-bold"
                : "bg-[var(--bg-secondary)] text-[var(--text-muted)] border-[var(--border-color)] hover:border-[var(--text-dim)]"
            }`}
          >
            <div className="flex items-center gap-3 text-left">
              <span className="text-2xl leading-none">🇹🇷</span>
              <div className="flex flex-col">
                <span className="text-sm font-bold">Türkçe</span>
                <span className="text-[11px] text-[var(--text-dim)]">Türkiye</span>
              </div>
            </div>
            {lang === "tr" && <Check size={16} className="text-[#22c55e]" />}
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={() => setLang("en")}
            className={`p-4 rounded-2xl border flex items-center justify-between transition-all ${
              lang === "en"
                ? "bg-[var(--bg-card)] text-[var(--text-main)] border-[var(--text-main)] shadow-md font-bold"
                : "bg-[var(--bg-secondary)] text-[var(--text-muted)] border-[var(--border-color)] hover:border-[var(--text-dim)]"
            }`}
          >
            <div className="flex items-center gap-3 text-left">
              <span className="text-2xl leading-none">🇬🇧</span>
              <div className="flex flex-col">
                <span className="text-sm font-bold">English</span>
                <span className="text-[11px] text-[var(--text-dim)]">United Kingdom</span>
              </div>
            </div>
            {lang === "en" && <Check size={16} className="text-[#22c55e]" />}
          </motion.button>
        </div>
      </div>
    </motion.div>
  )
}

/* =========================================================================
   3. CONTACT RULES TAB (BLOCKED & IMPORTANT FILTER TABS)
   ========================================================================= */
function ContactsTab() {
  const t = useT()
  const qc = useQueryClient()
  const [filterType, setFilterType] = useState<"all" | "blocked" | "important">("all")
  const [search, setSearch] = useState("")
  const [newEmail, setNewEmail] = useState("")
  const [newStatus, setNewStatus] = useState<"approved" | "blocked" | "important">("blocked")

  const { data: rules = [] } = useQuery({
    queryKey: ["sender-rules"],
    queryFn: () => api.get<any[]>("/sender_rules"),
  })

  const addRule = useMutation({
    mutationFn: () => api.post("/sender_rules", { email_address: newEmail, status: newStatus }),
    onSuccess: () => {
      setNewEmail("")
      qc.invalidateQueries({ queryKey: ["sender-rules"] })
    }
  })

  const deleteRule = useMutation({
    mutationFn: (id: number) => api.delete(`/sender_rules/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sender-rules"] })
  })

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      api.patch(`/sender_rules/${id}`, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sender-rules"] })
  })

  const filteredRules = rules
    .filter(r => filterType === "all" ? true : r.status === filterType)
    .filter(r =>
      r.email_address?.toLowerCase().includes(search.toLowerCase()) ||
      r.status?.toLowerCase().includes(search.toLowerCase())
    )

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="flex flex-col gap-6"
    >
      <div>
        <h2 className="text-xl font-bold text-[var(--text-main)]">{t("contact_rules")}</h2>
        <p className="text-xs text-[var(--text-muted)] mt-1">Manage blocked senders and VIP starred contacts</p>
      </div>

      {/* Filter Tabs: All, Blocked, Important */}
      <div className="flex items-center gap-2 p-1 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] w-fit">
        <button
          onClick={() => setFilterType("all")}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            filterType === "all" ? "bg-[var(--bg-card)] text-[var(--text-main)] shadow-xs" : "text-[var(--text-muted)] hover:text-[var(--text-main)]"
          }`}
        >
          Tümü ({rules.length})
        </button>
        <button
          onClick={() => setFilterType("blocked")}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            filterType === "blocked" ? "bg-[#ef444420] text-[#ef4444] shadow-xs" : "text-[var(--text-muted)] hover:text-[var(--text-main)]"
          }`}
        >
          🚫 {t("blocked_senders")} ({rules.filter(r => r.status === "blocked").length})
        </button>
        <button
          onClick={() => setFilterType("important")}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            filterType === "important" ? "bg-[#f59e0b20] text-[#f59e0b] shadow-xs" : "text-[var(--text-muted)] hover:text-[var(--text-main)]"
          }`}
        >
          ⭐ {t("important_senders")} ({rules.filter(r => r.status === "important").length})
        </button>
      </div>

      {/* Add New Rule */}
      <div className="p-4 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-color)] flex flex-wrap items-center gap-3">
        <input
          type="text"
          placeholder="email@example.com veya @domain.com"
          value={newEmail}
          onChange={e => setNewEmail(e.target.value)}
          className="flex-1 min-w-[200px] bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-main)] text-xs px-3.5 py-2.5 rounded-xl focus:outline-none"
        />
        <select
          value={newStatus}
          onChange={e => setNewStatus(e.target.value as any)}
          className="bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-main)] text-xs px-3.5 py-2.5 rounded-xl focus:outline-none font-medium"
        >
          <option value="blocked">🚫 Engelle (Spam/Çöp)</option>
          <option value="important">⭐ Önemli Kişi (VIP)</option>
          <option value="approved">Onaylı (Gelen Kutusu)</option>
        </select>
        <button
          onClick={() => addRule.mutate()}
          className="bg-[var(--accent)] text-[var(--accent-invert)] text-xs px-5 py-2.5 rounded-xl font-bold flex items-center gap-1 hover:opacity-90 shadow-sm"
        >
          <Plus size={14} />
          <span>Kural Ekle</span>
        </button>
      </div>

      {/* Search Input for Rules */}
      <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] text-xs">
        <Search size={14} className="text-[var(--text-dim)]" />
        <input
          type="text"
          placeholder="Kişi kurallarında ara..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full bg-transparent text-[var(--text-main)] placeholder-[var(--text-dim)] focus:outline-none text-xs"
        />
      </div>

      {/* Rules list */}
      <div className="flex flex-col gap-2">
        {filteredRules.length === 0 && (
          <div className="text-xs text-[var(--text-dim)] py-6 text-center">Bu filtreye uygun kişi kuralı bulunamadı.</div>
        )}
        {filteredRules.map(r => (
          <div
            key={r.id}
            className="flex items-center justify-between p-4 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-color)] text-xs shadow-xs"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-[var(--bg-primary)] border border-[var(--border-color)] flex items-center justify-center font-bold text-xs">
                {r.email_address[0]?.toUpperCase()}
              </div>
              <span className="font-mono text-[var(--text-main)] font-semibold">{r.email_address}</span>
            </div>

            <div className="flex items-center gap-3">
              <select
                value={r.status}
                onChange={e => updateStatus.mutate({ id: r.id, status: e.target.value })}
                className="bg-[var(--bg-primary)] border border-[var(--border-color)] text-xs px-3 py-1.5 rounded-lg text-[var(--text-main)] font-medium"
              >
                <option value="blocked">🚫 Engellendi</option>
                <option value="important">⭐ Önemli</option>
                <option value="approved">Onaylı</option>
              </select>
              <button
                onClick={() => deleteRule.mutate(r.id)}
                className="text-[var(--text-dim)] hover:text-[#ef4444] p-1.5 transition-colors"
                title="Kuralı Sil"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  )
}

/* =========================================================================
   4. ÖZEL KODLAR TAB (SPEAKEASY PASSCODES)
   ========================================================================= */
function SpeakeasyTab({ copyText, copiedKey }: { copyText: (val: string, k: string) => void; copiedKey: string | null }) {
  const t = useT()
  const qc = useQueryClient()
  const [label, setLabel] = useState("")
  const [singleUse, setSingleUse] = useState(false)
  const [expiryDays, setExpiryDays] = useState(7)

  const { data: codes = [] } = useQuery({
    queryKey: ["speakeasy-codes"],
    queryFn: () => api.get<any[]>("/speakeasy_codes"),
  })

  const createCode = useMutation({
    mutationFn: () => {
      const exp = new Date()
      exp.setDate(exp.getDate() + Number(expiryDays))
      return api.post("/speakeasy_codes", {
        label: label || "VIP Özel Kod",
        single_use: singleUse,
        expires_at: exp.toISOString()
      })
    },
    onSuccess: () => {
      setLabel("")
      qc.invalidateQueries({ queryKey: ["speakeasy-codes"] })
    }
  })

  const revokeCode = useMutation({
    mutationFn: (id: number) => api.delete(`/speakeasy_codes/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["speakeasy-codes"] })
  })

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="flex flex-col gap-6"
    >
      <div>
        <h2 className="text-xl font-bold text-[var(--text-main)]">{t("speakeasy_codes")}</h2>
        <p className="text-xs text-[var(--text-muted)] mt-1">
          Geçici güvenli erişim kodları. Gelen e-posta bu kodu içeriyorsa, onay kuyruğuna takılmadan doğrudan Gelen Kutusu'na düşer.
        </p>
      </div>

      <div className="p-5 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-color)] flex flex-col gap-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <input
            type="text"
            placeholder="Etiket (örn: Müşteri Projesi, VIP)"
            value={label}
            onChange={e => setLabel(e.target.value)}
            className="bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-main)] text-xs px-3.5 py-2.5 rounded-xl"
          />
          <select
            value={expiryDays}
            onChange={e => setExpiryDays(Number(e.target.value))}
            className="bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-main)] text-xs px-3.5 py-2.5 rounded-xl font-medium"
          >
            <option value={1}>1 Gün Geçerli</option>
            <option value={7}>7 Gün Geçerli</option>
            <option value={30}>30 Gün Geçerli</option>
            <option value={365}>1 Yıl Geçerli</option>
          </select>
          <label className="flex items-center gap-2 text-xs text-[var(--text-muted)] cursor-pointer">
            <input
              type="checkbox"
              checked={singleUse}
              onChange={e => setSingleUse(e.target.checked)}
              className="accent-[var(--text-main)] w-4 h-4 rounded"
            />
            <span>Tek kullanımlık kod</span>
          </label>
        </div>
        <div className="flex justify-end">
          <button
            onClick={() => createCode.mutate()}
            className="bg-[var(--accent)] text-[var(--accent-invert)] text-xs px-5 py-2.5 rounded-xl font-bold flex items-center gap-1 hover:opacity-90 shadow-sm"
          >
            <Plus size={14} />
            <span>Yeni Kod Oluştur</span>
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {codes.map(c => (
          <div
            key={c.id}
            className="p-4 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-color)] flex items-center justify-between shadow-xs"
          >
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-[var(--text-main)] text-xs font-bold select-all">{c.code}</span>
                <button
                  onClick={() => copyText(c.code, `code_${c.id}`)}
                  className="text-[var(--text-dim)] hover:text-[var(--text-main)] p-1"
                >
                  {copiedKey === `code_${c.id}` ? <Check size={13} className="text-[#22c55e]" /> : <Copy size={13} />}
                </button>
              </div>
              <div className="text-[11px] text-[var(--text-muted)] mt-0.5">
            {c.label} · {c.single_use ? "Tek Kullanımlık" : "Çoklu Kullanım"} · Son Geçerlilik: {new Date(c.expires_at).toLocaleDateString()}
              </div>
            </div>
            <button
              onClick={() => revokeCode.mutate(c.id)}
              className="text-[#ef4444] hover:bg-[#ef444415] px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
            >
              İptal Et
            </button>
          </div>
        ))}
      </div>
    </motion.div>
  )
}

/* =========================================================================
   5. ARTIFICIAL INTELLIGENCE TAB (OFFICIAL SVGS & LIVE DYNAMIC MODEL FETCH)
   ========================================================================= */
function AiTab() {
  const t = useT()
  const qc = useQueryClient()
  const { data: settings } = useQuery({
    queryKey: ["settings"],
    queryFn: () => api.get<any>("/settings"),
  })

  const [selectedProvider, setSelectedProvider] = useState<"gemini" | "claude" | "openai">("gemini")
  const [apiKeyInput, setApiKeyInput] = useState("")
  const [selectedModel, setSelectedModel] = useState("")
  const [fetchedModels, setFetchedModels] = useState<any[]>([])
  const [testResult, setTestResult] = useState<{ success: boolean; msg: string } | null>(null)
  const [testing, setTesting] = useState(false)

  const activeProvider = selectedProvider || (settings?.ai_provider as any) || "gemini"
  const currentKey = activeProvider === "gemini" ? settings?.has_gemini_key : activeProvider === "claude" ? settings?.has_claude_key : settings?.has_openai_key

  const modelsList = fetchedModels.length > 0 ? fetchedModels : settings?.all_models?.[activeProvider] || []

  const saveAi = useMutation({
    mutationFn: () => {
      const payload: any = {
        ai_provider: activeProvider,
        ai_model: selectedModel || undefined,
      }
      if (apiKeyInput) {
        if (activeProvider === "gemini") payload.gemini_key = apiKeyInput
        if (activeProvider === "claude") payload.claude_key = apiKeyInput
        if (activeProvider === "openai") payload.openai_key = apiKeyInput
      }
      return api.patch("/settings", payload)
    },
    onSuccess: () => {
      setApiKeyInput("")
      qc.invalidateQueries({ queryKey: ["settings"] })
      setTestResult({ success: true, msg: "Yapay zeka ayarları ve varsayılan model kaydedildi! ✓" })
    }
  })

  async function testConnectionAndFetchModels() {
    setTesting(true)
    setTestResult(null)
    try {
      const res = await api.post<any>("/settings/ai/test", {
        provider: activeProvider,
        api_key: apiKeyInput || undefined,
        ai_model: selectedModel || undefined
      })
      if (res.models && res.models.length > 0) {
        setFetchedModels(res.models)
        if (!selectedModel) {
          setSelectedModel(res.model || res.models[0].id)
        }
      }
      setApiKeyInput("")
      qc.invalidateQueries({ queryKey: ["settings"] })
      setTestResult({
        success: true,
        msg: `${res.provider.toUpperCase()} API bağlantısı kuruldu. ${res.models?.length || 0} model canlı olarak yüklendi! ✓`
      })
    } catch (err: any) {
      setTestResult({
        success: false,
        msg: err.message || "Bağlantı testi başarısız oldu. API Anahtarınızı kontrol edin."
      })
    } finally {
      setTesting(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="flex flex-col gap-6 max-w-xl"
    >
      <div>
        <h2 className="text-xl font-bold text-[var(--text-main)] flex items-center gap-2">
          <Bot size={22} />
          <span>{t("ai_settings")}</span>
        </h2>
        <p className="text-xs text-[var(--text-muted)] mt-1">
          Kullanmak istediğin yapay zeka sağlayıcısını seç, API anahtarını bağla ve resmi API üzerinden canlı modelleri getir.
        </p>
      </div>

      {/* Official Provider SVG Cards */}
      <div className="grid grid-cols-3 gap-3">
        {/* Google Gemini */}
        <motion.button
          type="button"
          whileTap={{ scale: 0.96 }}
          onClick={() => {
            setSelectedProvider("gemini")
            setFetchedModels([])
            setTestResult(null)
          }}
          className={`p-4 rounded-2xl border flex flex-col items-center gap-2.5 transition-all ${
            activeProvider === "gemini"
              ? "bg-[var(--bg-card)] border-[var(--text-main)] shadow-md"
              : "bg-[var(--bg-secondary)] border-[var(--border-color)] opacity-70 hover:opacity-100"
          }`}
        >
          <GeminiIcon size={32} />
          <div className="text-center">
            <span className="text-xs font-bold block text-[var(--text-main)]">Google Gemini</span>
          </div>
          {settings?.has_gemini_key && (
            <span className="px-1.5 py-0.5 rounded text-[10px] bg-[#22c55e15] text-[#22c55e] border border-[#22c55e30]">
              Bağlı ✓
            </span>
          )}
        </motion.button>

        {/* Anthropic Claude */}
        <motion.button
          type="button"
          whileTap={{ scale: 0.96 }}
          onClick={() => {
            setSelectedProvider("claude")
            setFetchedModels([])
            setTestResult(null)
          }}
          className={`p-4 rounded-2xl border flex flex-col items-center gap-2.5 transition-all ${
            activeProvider === "claude"
              ? "bg-[var(--bg-card)] border-[var(--text-main)] shadow-md"
              : "bg-[var(--bg-secondary)] border-[var(--border-color)] opacity-70 hover:opacity-100"
          }`}
        >
          <ClaudeIcon size={32} />
          <div className="text-center">
            <span className="text-xs font-bold block text-[var(--text-main)]">Anthropic Claude</span>
          </div>
          {settings?.has_claude_key && (
            <span className="px-1.5 py-0.5 rounded text-[10px] bg-[#22c55e15] text-[#22c55e] border border-[#22c55e30]">
              Bağlı ✓
            </span>
          )}
        </motion.button>

        {/* OpenAI */}
        <motion.button
          type="button"
          whileTap={{ scale: 0.96 }}
          onClick={() => {
            setSelectedProvider("openai")
            setFetchedModels([])
            setTestResult(null)
          }}
          className={`p-4 rounded-2xl border flex flex-col items-center gap-2.5 transition-all ${
            activeProvider === "openai"
              ? "bg-[var(--bg-card)] border-[var(--text-main)] shadow-md"
              : "bg-[var(--bg-secondary)] border-[var(--border-color)] opacity-70 hover:opacity-100"
          }`}
        >
          <OpenAIIcon size={32} />
          <div className="text-center">
            <span className="text-xs font-bold block text-[var(--text-main)]">OpenAI</span>
          </div>
          {settings?.has_openai_key && (
            <span className="px-1.5 py-0.5 rounded text-[10px] bg-[#22c55e15] text-[#22c55e] border border-[#22c55e30]">
              Bağlı ✓
            </span>
          )}
        </motion.button>
      </div>

      {/* Active Provider Configuration Form */}
      <div className="p-6 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-color)] flex flex-col gap-4 shadow-sm">
        <div className="flex items-center justify-between pb-3 border-b border-[var(--border-color)]">
          <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-main)]">
            {activeProvider.toUpperCase()} Yapılandırması
          </span>
          {currentKey ? (
            <span className="text-[11px] text-[#22c55e] font-semibold flex items-center gap-1">
              <CheckCircle2 size={13} />
              <span>Anahtar Kayıtlı</span>
            </span>
          ) : (
            <span className="text-[11px] text-[var(--text-dim)]">Anahtar Yok</span>
          )}
        </div>

        {/* API Key Input */}
        <div>
          <label className="text-xs font-semibold text-[var(--text-muted)] block mb-1.5">
            {activeProvider.toUpperCase()} API Anahtarı
          </label>
          <input
            type="password"
            placeholder={currentKey ? "••••••••••••••••••••••••••••" : `${activeProvider} API Key girin...`}
            value={apiKeyInput}
            onChange={e => setApiKeyInput(e.target.value)}
            className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-main)] text-xs px-4 py-3 rounded-xl focus:outline-none focus:border-[var(--text-main)] font-mono"
          />
        </div>

        {/* Dynamic Model ComboBox Selector */}
        {modelsList.length > 0 && (
          <div>
            <label className="text-xs font-semibold text-[var(--text-muted)] block mb-1.5">
              Varsayılan AI Modeli (API'den Canlı Çekilen)
            </label>
            <select
              value={selectedModel || settings?.ai_model || modelsList[0]?.id || ""}
              onChange={e => setSelectedModel(e.target.value)}
              className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-main)] text-xs px-4 py-3 rounded-xl focus:outline-none focus:border-[var(--text-main)] font-semibold"
            >
              {modelsList.map((m: any) => (
                <option key={m.id} value={m.id}>
                  {m.name || m.id}
                </option>
              ))}
            </select>
            <span className="text-[11px] text-[var(--text-dim)] mt-1 block">
              Gelen e-postalardan seyahat, kargo, OTP ve faturaları otomatik ayıklamak ve yanıt taslağı oluşturmak için bu model kullanılır.
            </span>
          </div>
        )}

        {testResult && (
          <div
            className={`p-3.5 rounded-xl text-xs ${
              testResult.success
                ? "bg-[#22c55e15] text-[#22c55e] border border-[#22c55e30]"
                : "bg-[#ef444415] text-[#ef4444] border border-[#ef444430]"
            }`}
          >
            {testResult.msg}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-3 border-t border-[var(--border-color)] gap-2">
          <button
            type="button"
            disabled={testing || (!apiKeyInput && !currentKey)}
            onClick={testConnectionAndFetchModels}
            className="border border-[var(--border-color)] bg-[var(--bg-primary)] hover:bg-[var(--bg-card)] text-[var(--text-main)] text-xs px-4 py-2.5 rounded-xl font-semibold flex items-center gap-1.5 disabled:opacity-40 transition-colors shadow-xs"
          >
            <Sparkles size={14} className={testing ? "animate-spin text-[#f59e0b]" : "text-[#f59e0b]"} />
            <span>{testing ? "Modeller API'den Çekiliyor..." : "Bağlantıyı Test Et & Modelleri Getir"}</span>
          </button>

          <button
            type="button"
            disabled={saveAi.isPending}
            onClick={() => saveAi.mutate()}
            className="bg-[var(--accent)] text-[var(--accent-invert)] text-xs px-5 py-2.5 rounded-xl font-bold hover:opacity-90 disabled:opacity-40 shadow-sm"
          >
            {saveAi.isPending ? "Kaydediliyor..." : "Ayarları Kaydet"}
          </button>
        </div>
      </div>
    </motion.div>
  )
}

/* =========================================================================
   6. RSS FEEDS TAB (FULL TURKISH SUPPORT)
   ========================================================================= */
function RssTab() {
  const t = useT()
  const qc = useQueryClient()
  const [newUrl, setNewUrl] = useState("")
  const [category, setCategory] = useState("Teknoloji")

  const { data: feeds = [] } = useQuery({
    queryKey: ["rss-feeds"],
    queryFn: () => api.get<any[]>("/rss/feeds"),
  })

  const addFeed = useMutation({
    mutationFn: () => api.post("/rss/feeds", { url: newUrl, category }),
    onSuccess: () => {
      setNewUrl("")
      qc.invalidateQueries({ queryKey: ["rss-feeds"] })
    }
  })

  const deleteFeed = useMutation({
    mutationFn: (id: number) => api.delete(`/rss/feeds/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["rss-feeds"] })
  })

  const refreshFeed = useMutation({
    mutationFn: (id: number) => api.post(`/rss/feeds/${id}/refresh`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["rss-items"] })
  })

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="flex flex-col gap-6"
    >
      <div>
        <h2 className="text-xl font-bold text-[var(--text-main)]">{t("rss_settings")}</h2>
        <p className="text-xs text-[var(--text-muted)] mt-1">Takip etmek istediğin RSS haber kaynaklarını ve blogları yönet</p>
      </div>

      <div className="p-4 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-color)] flex flex-wrap items-center gap-3">
        <input
          type="text"
          placeholder="https://ornek.com/feed.xml"
          value={newUrl}
          onChange={e => setNewUrl(e.target.value)}
          className="flex-1 min-w-[200px] bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-main)] text-xs px-3.5 py-2.5 rounded-xl"
        />
        <input
          type="text"
          placeholder="Kategori (örn: Teknoloji)"
          value={category}
          onChange={e => setCategory(e.target.value)}
          className="w-36 bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-main)] text-xs px-3.5 py-2.5 rounded-xl"
        />
        <button
          onClick={() => addFeed.mutate()}
          className="bg-[var(--accent)] text-[var(--accent-invert)] text-xs px-5 py-2.5 rounded-xl font-bold flex items-center gap-1 hover:opacity-90 shadow-sm"
        >
          <Plus size={14} />
          <span>Ekle</span>
        </button>
      </div>

      <div className="flex flex-col gap-2">
        {feeds.map(f => (
          <div key={f.id} className="p-4 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-color)] flex items-center justify-between text-xs shadow-xs">
            <div>
              <div className="text-[var(--text-main)] font-bold">{f.title || f.url}</div>
              <div className="text-[11px] text-[var(--text-dim)] truncate max-w-md">{f.url}</div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => refreshFeed.mutate(f.id)}
                className="text-[var(--text-dim)] hover:text-[var(--text-main)] p-1.5"
                title="Yenile"
              >
                <RefreshCw size={14} />
              </button>
              <button
                onClick={() => deleteFeed.mutate(f.id)}
                className="text-[#ef4444] hover:bg-[#ef444415] p-1.5 rounded-lg"
                title="Sil"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  )
}

/* =========================================================================
   7. PRIVACY & SECURITY TAB (CLEAN TOGGLE ONLY)
   ========================================================================= */
function SecurityTab() {
  const t = useT()
  const { data: settings } = useQuery({
    queryKey: ["settings"],
    queryFn: () => api.get<any>("/settings"),
  })
  const qc = useQueryClient()

  const toggleSpy = useMutation({
    mutationFn: (enabled: boolean) => api.patch("/settings", { spy_pixel_blocking: enabled }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["settings"] })
  })

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="flex flex-col gap-6 max-w-xl"
    >
      <div>
        <h2 className="text-xl font-bold text-[var(--text-main)] flex items-center gap-2">
          <Shield size={22} />
          <span>{t("privacy_security")}</span>
        </h2>
        <p className="text-xs text-[var(--text-muted)] mt-1">
          E-postalardaki casus takip piksellerini engeller ve IP adresinizin dış sunuculara sızmasını önler.
        </p>
      </div>

      <div className="p-6 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-color)] flex items-center justify-between shadow-xs">
        <div>
          <span className="text-sm font-bold text-[var(--text-main)] block">Casus Piksel & İzleyici Proxy Koruması</span>
          <span className="text-xs text-[var(--text-muted)] max-w-md block mt-1 leading-relaxed">
            Gelen e-postalardaki tüm harici görseller Dispatch sunucusu üzerinden proxy ile çekilir. Gönderenler IP adresinizi, tarayıcınızı veya konumunuzu asla tespit edemez.
          </span>
        </div>
        <input
          type="checkbox"
          checked={settings?.spy_pixel_blocking ?? true}
          onChange={e => toggleSpy.mutate(e.target.checked)}
          className="w-5 h-5 accent-[var(--text-main)] cursor-pointer"
        />
      </div>
    </motion.div>
  )
}
