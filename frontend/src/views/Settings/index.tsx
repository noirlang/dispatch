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
  LogOut,
  Lock,
  DownloadCloud,
  ShieldCheck,
  ExternalLink,
  UsersRound
} from "lucide-react"

type Tab = "profile" | "appearance" | "contacts" | "speakeasy" | "ai" | "rss" | "security" | "updates"

export default function SettingsView() {
  const { lang, activeSettingsTab, setActiveSettingsTab } = useAppStore()
  const tab = activeSettingsTab
  const setTab = setActiveSettingsTab
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
      {/* Sidebar Nav (Desktop only, mobile accesses via top-right hamburger drawer) */}
      <aside className="hidden md:flex w-64 border-r border-[var(--border-color)] bg-[var(--bg-secondary)] p-4 flex-col justify-between shrink-0">
        <div className="flex flex-col gap-1">
          <div className="px-3 py-2 text-[11px] font-bold text-[var(--text-dim)] uppercase tracking-wider">
            {t("settings")}
          </div>
          <TabBtn id="profile"    icon={<User size={15} />}          label={t("profile")}          active={tab} setTab={setTab} />
          <TabBtn id="appearance" icon={<Palette size={15} />}       label={t("appearance")}       active={tab} setTab={setTab} />
          <TabBtn id="contacts"   icon={<Users size={15} />}         label={t("contact_rules")}    active={tab} setTab={setTab} />
          <TabBtn id="speakeasy"  icon={<Key size={15} />}           label={t("speakeasy_codes")}  active={tab} setTab={setTab} />
          <TabBtn id="ai"         icon={<Bot size={15} />}           label={t("ai_settings")}      active={tab} setTab={setTab} />
          <TabBtn id="rss"        icon={<Rss size={15} />}           label={t("rss_settings")}     active={tab} setTab={setTab} />
          <TabBtn id="security"   icon={<Shield size={15} />}        label={t("privacy_security")} active={tab} setTab={setTab} />
          <TabBtn id="updates"    icon={<DownloadCloud size={15} />} label={lang === "tr" ? "Sistem Güncelleme" : "System Updates"} active={tab} setTab={setTab} />
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
      <main className="flex-1 overflow-y-auto p-4 sm:p-8 max-w-4xl bg-[var(--bg-primary)]">
        <AnimatePresence mode="wait">
          {tab === "profile"    && <ProfileTab key="profile" user={user} onUpdate={fetchMe} />}
          {tab === "appearance" && <AppearanceTab key="appearance" />}
          {tab === "contacts"   && <ContactsTab key="contacts" />}
          {tab === "speakeasy"  && <SpeakeasyTab key="speakeasy" copyText={copyText} copiedKey={copiedKey} />}
          {tab === "ai"         && <AiTab key="ai" />}
          {tab === "rss"        && <RssTab key="rss" />}
          {tab === "security"   && <SecurityTab key="security" />}
          {tab === "updates"    && <UpdatesTab key="updates" />}
        </AnimatePresence>
      </main>
    </div>
  )
}

function TabBtn({
  id,
  icon,
  label,
  active,
  setTab
}: {
  id: Tab
  icon: React.ReactNode
  label: string
  active: Tab
  setTab: (t: Tab) => void
}) {
  const isActive = active === id
  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      whileHover={{ x: 2 }}
      onClick={() => setTab(id)}
      className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all text-left ${
        isActive
          ? "bg-[var(--bg-card)] text-[var(--text-main)] shadow-xs font-bold border border-[var(--border-color)]"
          : "text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-card)]"
      }`}
    >
      <span className={isActive ? "text-[var(--text-main)]" : "text-[var(--text-dim)]"}>
        {icon}
      </span>
      <span>{label}</span>
    </motion.button>
  )
}

/* =========================================================================
   1. PROFILE TAB
   ========================================================================= */
function ProfileTab({ user, onUpdate }: { user: any; onUpdate: () => void }) {
  const t = useT()
  const [name, setName] = useState(user?.name || "")
  const [signature, setSignature] = useState(user?.default_signature || "")
  const [sigMode, setSigMode] = useState<"edit" | "preview">("edit")
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [pwError, setPwError] = useState("")
  const [pwSuccess, setPwSuccess] = useState("")
  const [saved, setSaved] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const qc = useQueryClient()

  useEffect(() => {
    if (user?.default_signature !== undefined) {
      setSignature(user.default_signature || "")
    }
  }, [user?.default_signature])

  const updateProfile = useMutation({
    mutationFn: () => {
      setPwError("")
      setPwSuccess("")
      if (newPassword && newPassword !== confirmPassword) {
        throw new Error("Yeni şifreler eşleşmiyor!")
      }
      return api.patch("/settings", {
        name,
        default_signature: signature,
        current_password: currentPassword.trim() ? currentPassword.trim() : undefined,
        new_password: newPassword.trim() ? newPassword.trim() : undefined,
      })
    },
    onSuccess: () => {
      onUpdate()
      qc.invalidateQueries({ queryKey: ["settings"] })
      if (newPassword) {
        setPwSuccess("Şifreniz başarıyla değiştirildi.")
        setCurrentPassword("")
        setNewPassword("")
        setConfirmPassword("")
      }
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    },
    onError: (err: any) => {
      setPwError(err.message || "Profil güncellenemedi")
    }
  })

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingAvatar(true)
    try {
      const formData = new FormData()
      formData.append("file", file)
      formData.append("avatar", file)
      await api.upload<{ avatar_path: string }>("/settings/upload_avatar", formData)
      await onUpdate()
      qc.invalidateQueries({ queryKey: ["settings"] })
      qc.invalidateQueries({ queryKey: ["me"] })
    } catch (err: any) {
      alert(err.message || "Avatar yüklenemedi.")
    } finally {
      setUploadingAvatar(false)
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
        <h2 className="text-xl font-bold text-[var(--text-main)]">{t("profile")}</h2>
        <p className="text-xs text-[var(--text-muted)] mt-1">Kişisel profil ve e-posta tercihlerinizi yönetin</p>
      </div>

      <div className="flex flex-col gap-5">
        {/* Avatar Upload */}
        <div className="flex items-center gap-4">
          <div className="relative group cursor-pointer w-16 h-16 rounded-full overflow-hidden border border-[var(--border-color)] bg-[var(--bg-secondary)] flex items-center justify-center text-xl font-bold">
            {user?.avatar_path ? (
              <img src={user.avatar_path} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <span>{user?.name?.[0]?.toUpperCase() || "U"}</span>
            )}
            <label className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-[10px] text-white cursor-pointer transition-opacity">
              <Camera size={16} />
              <input type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
            </label>
          </div>
          <div>
            <div className="text-xs font-bold text-[var(--text-main)]">{user?.name}</div>
            <div className="text-[11px] text-[var(--text-dim)] font-mono">{user?.email}</div>
            <label className="mt-1 text-[11px] text-[var(--text-muted)] hover:text-[var(--text-main)] cursor-pointer underline inline-block">
              {uploadingAvatar ? "Yükleniyor..." : "Profil Fotoğrafı Yükle"}
              <input type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
            </label>
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold text-[var(--text-muted)] block mb-1.5">{t("full_name")}</label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-main)] text-xs px-4 py-2.5 rounded-xl focus:outline-none"
          />
        </div>

        {/* Signature Box */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-semibold text-[var(--text-muted)]">{t("signature")}</label>
            <div className="flex items-center gap-1 p-0.5 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-color)]">
              <button
                type="button"
                onClick={() => setSigMode("edit")}
                className={`px-2.5 py-1 text-[10px] font-semibold rounded-md transition-colors ${
                  sigMode === "edit" ? "bg-[var(--bg-card)] text-[var(--text-main)] shadow-xs" : "text-[var(--text-dim)] hover:text-[var(--text-main)]"
                }`}
              >
                Düzenle
              </button>
              <button
                type="button"
                onClick={() => setSigMode("preview")}
                className={`px-2.5 py-1 text-[10px] font-semibold rounded-md transition-colors ${
                  sigMode === "preview" ? "bg-[var(--bg-card)] text-[var(--text-main)] shadow-xs" : "text-[var(--text-dim)] hover:text-[var(--text-main)]"
                }`}
              >
                Önizleme
              </button>
            </div>
          </div>

          {sigMode === "edit" ? (
            <textarea
              rows={4}
              value={signature}
              onChange={e => setSignature(e.target.value)}
              placeholder="örn: Saygılarımla,\n**Ahmet Yılmaz**"
              className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-main)] text-xs p-3 rounded-xl focus:outline-none font-mono"
            />
          ) : (
            <div className="w-full min-h-[96px] bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-main)] text-xs p-3.5 rounded-xl">
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
   3. CONTACTS & GROUPS TAB
   ========================================================================= */
function ContactsTab() {
  const t = useT()
  const qc = useQueryClient()
  const [subTab, setSubTab] = useState<"rules" | "groups">("rules")
  const [filterType, setFilterType] = useState<"all" | "blocked" | "important">("all")
  const [search, setSearch] = useState("")
  const [newEmail, setNewEmail] = useState("")
  const [newStatus, setNewStatus] = useState<"approved" | "blocked" | "important">("blocked")

  // Group State
  const [groupName, setGroupName] = useState("")
  const [groupDesc, setGroupDesc] = useState("")
  const [groupMembers, setGroupMembers] = useState("")

  const { data: rules = [] } = useQuery({
    queryKey: ["sender-rules"],
    queryFn: () => api.get<any[]>("/sender_rules"),
  })

  const { data: groups = [] } = useQuery({
    queryKey: ["contact-groups"],
    queryFn: () => api.get<any[]>("/contact_groups"),
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

  const addGroup = useMutation({
    mutationFn: () => {
      const membersArr = groupMembers.split(/[,\n]/).map(m => m.trim().toLowerCase()).filter(Boolean)
      return api.post("/contact_groups", {
        name: groupName,
        description: groupDesc,
        members: membersArr
      })
    },
    onSuccess: () => {
      setGroupName("")
      setGroupDesc("")
      setGroupMembers("")
      qc.invalidateQueries({ queryKey: ["contact-groups"] })
    },
    onError: (err: any) => alert(err.message || "Grup eklenemedi.")
  })

  const deleteGroup = useMutation({
    mutationFn: (id: number) => api.delete(`/contact_groups/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["contact-groups"] })
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
      className="flex flex-col gap-6 max-w-2xl"
    >
      <div>
        <h2 className="text-xl font-bold text-[var(--text-main)] flex items-center gap-2">
          <Users size={22} />
          <span>Kişiler ve E-posta Grupları</span>
        </h2>
        <p className="text-xs text-[var(--text-muted)] mt-1">
          Engelli veya VIP önemli kişileri yönetin; birden fazla kişiye tek tıkla e-posta atmak için <span className="font-mono text-[var(--text-main)] font-bold">@grup</span> oluşturun.
        </p>
      </div>

      {/* Main SubTab Toggle */}
      <div className="flex items-center gap-2 p-1 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] w-fit">
        <button
          onClick={() => setSubTab("rules")}
          className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 ${
            subTab === "rules" ? "bg-[var(--bg-card)] text-[var(--text-main)] shadow-xs" : "text-[var(--text-muted)] hover:text-[var(--text-main)]"
          }`}
        >
          <Users size={14} />
          <span>Kişi Kuralları ({rules.length})</span>
        </button>
        <button
          onClick={() => setSubTab("groups")}
          className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 ${
            subTab === "groups" ? "bg-[var(--bg-card)] text-[var(--text-main)] shadow-xs" : "text-[var(--text-muted)] hover:text-[var(--text-main)]"
          }`}
        >
          <UsersRound size={14} />
          <span>E-posta Grupları @Grup ({groups.length})</span>
        </button>
      </div>

      {subTab === "rules" ? (
        <div className="flex flex-col gap-4">
          {/* Filter Tabs */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setFilterType("all")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                filterType === "all" ? "bg-[var(--bg-card)] text-[var(--text-main)] border border-[var(--border-color)] shadow-xs" : "text-[var(--text-muted)] hover:text-[var(--text-main)]"
              }`}
            >
              Tümü ({rules.length})
            </button>
            <button
              onClick={() => setFilterType("blocked")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                filterType === "blocked" ? "bg-[#ef444420] text-[#ef4444] border border-[#ef444440] shadow-xs" : "text-[var(--text-muted)] hover:text-[var(--text-main)]"
              }`}
            >
              🚫 {t("blocked_senders")} ({rules.filter(r => r.status === "blocked").length})
            </button>
            <button
              onClick={() => setFilterType("important")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                filterType === "important" ? "bg-[#f59e0b20] text-[#f59e0b] border border-[#f59e0b40] shadow-xs" : "text-[var(--text-muted)] hover:text-[var(--text-main)]"
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
                className="p-3.5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] flex items-center justify-between gap-3 text-xs"
              >
                <span className="font-mono text-[var(--text-main)] font-semibold truncate">{r.email_address}</span>
                <div className="flex items-center gap-2 shrink-0">
                  <select
                    value={r.status}
                    onChange={e => updateStatus.mutate({ id: r.id, status: e.target.value })}
                    className="bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-main)] text-[11px] px-2.5 py-1 rounded-lg focus:outline-none"
                  >
                    <option value="approved">Onaylı</option>
                    <option value="important">⭐ Önemli</option>
                    <option value="blocked">🚫 Engelli</option>
                  </select>
                  <button
                    onClick={() => deleteRule.mutate(r.id)}
                    className="text-[#ef4444] hover:bg-[#ef444415] p-1.5 rounded-lg transition-colors"
                    title="Kuralı Sil"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* Groups SubTab */
        <div className="flex flex-col gap-5">
          {/* Create Group Box */}
          <div className="p-5 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-color)] flex flex-col gap-3 shadow-xs">
            <div className="flex items-center gap-2 pb-2 border-b border-[var(--border-color)]">
              <Plus size={14} className="text-[var(--text-dim)]" />
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-main)]">
                Yeni E-posta Grubu Oluştur
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-[var(--text-muted)] block mb-1">
                  Grup Adı (örn: <span className="font-mono text-[var(--text-main)]">ekip</span>)
                </label>
                <div className="flex items-center bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl px-3 py-2">
                  <span className="text-[var(--text-dim)] font-mono text-xs">@</span>
                  <input
                    type="text"
                    placeholder="ekip"
                    value={groupName}
                    onChange={e => setGroupName(e.target.value.replace(/[^a-zA-Z0-9_-]/g, ""))}
                    className="w-full bg-transparent text-[var(--text-main)] text-xs focus:outline-none ml-1 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-[var(--text-muted)] block mb-1">
                  Açıklama (Opsiyonel)
                </label>
                <input
                  type="text"
                  placeholder="Yazılım ve Ürün Ekibi"
                  value={groupDesc}
                  onChange={e => setGroupDesc(e.target.value)}
                  className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-main)] text-xs px-3 py-2 rounded-xl focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-[var(--text-muted)] block mb-1">
                Grup Üyeleri (Virgülle veya alt alta e-posta adresleri yazın)
              </label>
              <textarea
                rows={3}
                placeholder="ahmet@dispatch.local, mehmet@dispatch.local, ayse@dispatch.local"
                value={groupMembers}
                onChange={e => setGroupMembers(e.target.value)}
                className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-main)] text-xs p-3 rounded-xl focus:outline-none font-mono"
              />
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                disabled={!groupName.trim() || !groupMembers.trim() || addGroup.isPending}
                onClick={() => addGroup.mutate()}
                className="bg-[var(--accent)] text-[var(--accent-invert)] text-xs px-5 py-2.5 rounded-xl font-bold hover:opacity-90 disabled:opacity-40 shadow-sm flex items-center gap-1.5"
              >
                <Plus size={14} />
                <span>{addGroup.isPending ? "Ekleniyor..." : "Grubu Kaydet"}</span>
              </button>
            </div>
          </div>

          {/* Groups List */}
          <div className="flex flex-col gap-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
              Aktif Gruplar ({groups.length})
            </h3>

            {groups.length === 0 ? (
              <div className="text-xs text-[var(--text-dim)] py-8 text-center bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl">
                Henüz oluşturulmuş bir e-posta grubu yok. Yukarıdan <span className="font-mono text-[var(--text-main)] font-bold">@ekip</span> gibi bir grup tanımlayabilirsiniz.
              </div>
            ) : (
              groups.map((g: any) => (
                <div
                  key={g.id}
                  className="p-4 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-color)] flex flex-col gap-3 shadow-xs"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-1 rounded-lg bg-[#3b82f615] text-[#3b82f6] border border-[#3b82f630] font-mono text-xs font-bold">
                        {g.alias}
                      </span>
                      {g.description && (
                        <span className="text-xs text-[var(--text-main)] font-semibold">{g.description}</span>
                      )}
                      <span className="text-[11px] text-[var(--text-dim)]">({g.member_count} üye)</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => deleteGroup.mutate(g.id)}
                      className="text-[#ef4444] hover:bg-[#ef444415] p-1.5 rounded-lg transition-colors"
                      title="Grubu Sil"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-1.5 pt-2 border-t border-[var(--border-color)]">
                    {g.members?.map((m: string) => (
                      <span
                        key={m}
                        className="px-2 py-0.5 rounded-md bg-[var(--bg-primary)] border border-[var(--border-color)] font-mono text-[10px] text-[var(--text-muted)]"
                      >
                        {m}
                      </span>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </motion.div>
  )
}

/* =========================================================================
   4. SPEAKEASY TAB
   ========================================================================= */
function SpeakeasyTab({ copyText, copiedKey }: { copyText: (v: string, k: string) => void; copiedKey: string | null }) {
  const t = useT()
  const qc = useQueryClient()
  const [label, setLabel] = useState("")
  const [expiresDays, setExpiresDays] = useState(7)
  const [singleUse, setSingleUse] = useState(false)

  const { data: codes = [] } = useQuery({
    queryKey: ["speakeasy-codes"],
    queryFn: () => api.get<any[]>("/speakeasy_codes"),
  })

  const createCode = useMutation({
    mutationFn: () => api.post("/speakeasy_codes", { label, expires_in_days: expiresDays, single_use: singleUse }),
    onSuccess: () => {
      setLabel("")
      qc.invalidateQueries({ queryKey: ["speakeasy-codes"] })
    }
  })

  const deleteCode = useMutation({
    mutationFn: (id: number) => api.delete(`/speakeasy_codes/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["speakeasy-codes"] })
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
          <Key size={22} />
          <span>{t("speakeasy_codes")}</span>
        </h2>
        <p className="text-xs text-[var(--text-muted)] mt-1">
          Bilinmeyen göndericilere vereceğiniz tek kullanımlık veya süreli kodlar. Bu kodu içeren mailler onay kuyruğunu atlayarak doğrudan Gelen Kutunuza düşer.
        </p>
      </div>

      <div className="p-5 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-color)] flex flex-col gap-4 shadow-sm">
        <div>
          <label className="text-xs font-semibold text-[var(--text-muted)] block mb-1.5">Kod Etiketi</label>
          <input
            type="text"
            placeholder="örn: Müşteri Projesi, Freelance İletişim"
            value={label}
            onChange={e => setLabel(e.target.value)}
            className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-main)] text-xs px-3.5 py-2.5 rounded-xl focus:outline-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold text-[var(--text-muted)] block mb-1.5">Geçerlilik Süresi</label>
            <select
              value={expiresDays}
              onChange={e => setExpiresDays(Number(e.target.value))}
              className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-main)] text-xs px-3 py-2.5 rounded-xl focus:outline-none font-medium"
            >
              <option value={1}>1 Gün</option>
              <option value={7}>1 Hafta</option>
              <option value={30}>1 Ay</option>
              <option value={365}>1 Yıl</option>
            </select>
          </div>

          <div className="flex items-center gap-2.5 mt-6">
            <input
              type="checkbox"
              id="singleUse"
              checked={singleUse}
              onChange={e => setSingleUse(e.target.checked)}
              className="w-4 h-4 accent-[var(--text-main)] rounded cursor-pointer"
            />
            <label htmlFor="singleUse" className="text-xs font-semibold text-[var(--text-main)] cursor-pointer select-none">
              Tek Kullanımlık Kod
            </label>
          </div>
        </div>

        <div className="pt-2">
          <button
            onClick={() => createCode.mutate()}
            disabled={createCode.isPending}
            className="bg-[var(--accent)] text-[var(--accent-invert)] text-xs px-5 py-2.5 rounded-xl font-bold flex items-center gap-1.5 hover:opacity-90 shadow-sm"
          >
            <Plus size={14} />
            <span>Yeni Speakeasy Kodu Üret</span>
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {codes.map(c => (
          <div
            key={c.id}
            className="p-4 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-color)] flex items-center justify-between gap-4 shadow-2xs"
          >
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-xs text-[var(--text-main)] bg-[var(--bg-primary)] px-2.5 py-1 rounded-lg border border-[var(--border-color)]">
                  {c.code}
                </span>
                <span className="text-xs text-[var(--text-main)] font-semibold">{c.label}</span>
              </div>
              <span className="text-[10px] text-[var(--text-dim)] font-mono">
                {c.single_use ? "Tek kullanımlık" : "Süreli"} · {c.used ? "Kullanıldı" : "Aktif"}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => copyText(c.code, `c-${c.id}`)}
                className="text-xs flex items-center gap-1 text-[var(--text-muted)] hover:text-[var(--text-main)] border border-[var(--border-color)] bg-[var(--bg-primary)] px-3 py-1.5 rounded-xl font-semibold shadow-xs"
              >
                {copiedKey === `c-${c.id}` ? <Check size={13} className="text-[#22c55e]" /> : <Copy size={13} />}
                <span>{copiedKey === `c-${c.id}` ? "Kopyalandı" : "Kopyala"}</span>
              </button>
              <button
                onClick={() => deleteCode.mutate(c.id)}
                className="text-[#ef4444] hover:bg-[#ef444415] p-2 rounded-xl transition-colors"
                title="Kodu Sil"
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
   5. AI TAB
   ========================================================================= */
function AiTab() {
  const t = useT()
  const { data: settings } = useQuery({
    queryKey: ["settings"],
    queryFn: () => api.get<any>("/settings"),
  })
  const qc = useQueryClient()

  const [selectedProvider, setSelectedProvider] = useState<string | null>(null)
  const [apiKeyInput, setApiKeyInput] = useState("")
  const [selectedModel, setSelectedModel] = useState("")
  const [fetchedModels, setFetchedModels] = useState<any[]>([])
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ success: boolean; msg: string } | null>(null)

  const activeProvider = selectedProvider || settings?.ai_provider || "gemini"
  const currentKey = activeProvider === "gemini" ? settings?.has_gemini_key : activeProvider === "claude" ? settings?.has_claude_key : settings?.has_openai_key

  const modelsList = fetchedModels

  async function testConnectionAndFetchModels() {
    setTesting(true)
    setTestResult(null)
    try {
      const res = await api.post<any>("/settings/ai/test", {
        provider: activeProvider,
        api_key: apiKeyInput.trim() ? apiKeyInput.trim() : undefined,
        ai_model: selectedModel.trim() ? selectedModel.trim() : undefined
      })
      setTestResult({ success: true, msg: res.message || "Bağlantı başarılı!" })
      if (res.models && Array.isArray(res.models)) {
        setFetchedModels(res.models)
        if (res.models[0]?.id && !selectedModel) {
          setSelectedModel(res.models[0].id)
        }
      }
      qc.invalidateQueries({ queryKey: ["settings"] })
    } catch (err: any) {
      setTestResult({ success: false, msg: err.message || "Bağlantı başarısız. Lütfen API anahtarını kontrol edin." })
    } finally {
      setTesting(false)
    }
  }

  const saveAi = useMutation({
    mutationFn: () => {
      const payload: any = {
        ai_provider: activeProvider,
        ai_model: selectedModel || settings?.ai_model,
      }
      if (apiKeyInput.trim()) {
        if (activeProvider === "gemini") payload.gemini_key = apiKeyInput.trim()
        if (activeProvider === "claude") payload.claude_key = apiKeyInput.trim()
        if (activeProvider === "openai") payload.openai_key = apiKeyInput.trim()
      }
      return api.patch("/settings", payload)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["settings"] })
      setApiKeyInput("")
      alert("AI ayarları başarıyla kaydedildi.")
    }
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
          <Bot size={22} />
          <span>{t("ai_settings")}</span>
        </h2>
        <p className="text-xs text-[var(--text-muted)] mt-1">
          Kullanmak istediğin yapay zeka sağlayıcısını seç, API anahtarını bağla ve resmi API üzerinden canlı modelleri getir.
        </p>
      </div>

      {/* Official Provider Cards */}
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

      {/* Selected Provider Config Box */}
      <div className="p-5 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-color)] flex flex-col gap-4 shadow-sm">
        <div>
          <label className="text-xs font-semibold text-[var(--text-muted)] block mb-1.5">
            {activeProvider.toUpperCase()} API Key
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
   6. RSS FEEDS TAB
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
    onSuccess: () => qc.invalidateQueries({ queryKey: ["rss-feeds"] })
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
          <Rss size={22} />
          <span>{t("rss_settings")}</span>
        </h2>
        <p className="text-xs text-[var(--text-muted)] mt-1">Takip ettiğiniz haber ve bülten RSS kaynaklarını ekleyin</p>
      </div>

      <div className="p-5 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-color)] flex flex-col gap-4 shadow-sm">
        <div>
          <label className="text-xs font-semibold text-[var(--text-muted)] block mb-1.5">RSS Akış URL'si</label>
          <input
            type="url"
            placeholder="https://news.ycombinator.com/rss"
            value={newUrl}
            onChange={e => setNewUrl(e.target.value)}
            className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-main)] text-xs px-3.5 py-2.5 rounded-xl focus:outline-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-[var(--text-muted)] block mb-1.5">Kategori</label>
            <select
              value={category}
              onChange={e => setCategory(e.target.value)}
              className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-main)] text-xs px-3 py-2.5 rounded-xl focus:outline-none font-medium"
            >
              <option value="Teknoloji">Teknoloji</option>
              <option value="Haberler">Haberler</option>
              <option value="Finans">Finans</option>
              <option value="Yazılım">Yazılım</option>
              <option value="Genel">Genel</option>
            </select>
          </div>
        </div>

        <div className="pt-2">
          <button
            onClick={() => addFeed.mutate()}
            disabled={addFeed.isPending || !newUrl}
            className="bg-[var(--accent)] text-[var(--accent-invert)] text-xs px-5 py-2.5 rounded-xl font-bold flex items-center gap-1.5 hover:opacity-90 shadow-sm disabled:opacity-40"
          >
            <Plus size={14} />
            <span>{addFeed.isPending ? "Ekleniyor..." : "RSS Kaynağını Ekle"}</span>
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {feeds.map(f => (
          <div
            key={f.id}
            className="p-4 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-color)] flex items-center justify-between gap-4 shadow-2xs"
          >
            <div className="flex flex-col gap-0.5 truncate">
              <span className="text-xs font-bold text-[var(--text-main)] truncate">{f.title || f.url}</span>
              <span className="text-[10px] text-[var(--text-dim)] font-mono truncate">{f.url}</span>
              <span className="text-[10px] text-[var(--text-muted)] mt-1">Kategori: {f.category}</span>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => refreshFeed.mutate(f.id)}
                className="text-[var(--text-dim)] hover:text-[var(--text-main)] p-1.5 rounded-lg border border-[var(--border-color)] bg-[var(--bg-primary)]"
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
   7. PRIVACY & SECURITY TAB
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

/* =========================================================================
   8. UPDATES TAB (NOIRLANG/DISPATCH SAFE UPDATER)
   ========================================================================= */
function UpdatesTab() {
  const { addToast } = useAppStore()
  const qc = useQueryClient()

  const { data: updateInfo, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ["system-updates"],
    queryFn: () => api.get<any>("/updates/check"),
  })

  const applyUpdate = useMutation({
    mutationFn: () => api.post<any>("/updates/apply"),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["system-updates"] })
      addToast({
        title: "Sistem Güncelleme",
        from: "Dispatch Updater",
        subject: res.message || "Sistem başarıyla güncellendi! ✓"
      })
    },
    onError: (err: any) => {
      alert(`Güncelleme hatası: ${err.message || "Bilinmeyen hata"}`)
    }
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
          <DownloadCloud size={22} />
          <span>Sistem Güncelleme</span>
        </h2>
        <p className="text-xs text-[var(--text-muted)] mt-1">
          Resmi GitHub deposu (<span className="text-[var(--text-main)] font-mono font-bold">noirlang/dispatch</span>) üzerinden güvenli, sıfır veri kayıplı sistem güncellemeleri.
        </p>
      </div>

      {/* Safety Guarantee Card */}
      <div className="p-4 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-color)] flex items-start gap-3 shadow-xs">
        <div className="p-2 rounded-xl bg-[#22c55e15] text-[#22c55e] border border-[#22c55e30] shrink-0 mt-0.5">
          <ShieldCheck size={18} />
        </div>
        <div>
          <div className="text-xs font-bold text-[var(--text-main)] mb-1">
            %100 Güvenli Güncelleme Garantisi
          </div>
          <div className="text-[11px] text-[var(--text-muted)] leading-relaxed">
            Güncelleme işlemi sırasında <strong>veritabanındaki e-postalarınız, şifreleriniz, DNS ayarlarınız ve özel anahtarlarınız asla silinmez veya bozulmaz</strong>. Yalnızca yeni kodlar ve geliştirmeler entegre edilir.
          </div>
        </div>
      </div>

      {/* Version Status Box */}
      <div className="p-5 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-color)] flex flex-col gap-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] flex items-center justify-center text-[var(--text-main)] font-mono text-xs font-bold">
              GIT
            </div>
            <div>
              <div className="text-xs font-bold text-[var(--text-main)]">
                Mevcut Yerel Sürüm: <span className="font-mono text-[#3b82f6]">#{updateInfo?.current_commit || "dev"}</span>
              </div>
              <div className="text-[11px] text-[var(--text-dim)] truncate max-w-sm">
                {updateInfo?.current_message || "Yerel çalışma kopyası"}
              </div>
            </div>
          </div>

          <button
            type="button"
            disabled={isLoading || isRefetching}
            onClick={() => refetch()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-primary)] hover:bg-[var(--bg-card)] text-xs font-medium text-[var(--text-main)] transition-colors shadow-xs"
          >
            <RefreshCw size={12} className={isLoading || isRefetching ? "animate-spin" : ""} />
            <span>Kontrol Et</span>
          </button>
        </div>

        <div className="pt-3 border-t border-[var(--border-color)] flex items-center justify-between text-xs">
          <span className="text-[var(--text-muted)]">GitHub Uzak Depo:</span>
          <a
            href="https://github.com/noirlang/dispatch"
            target="_blank"
            rel="noreferrer"
            className="font-mono text-xs text-[var(--text-main)] hover:underline flex items-center gap-1 font-bold"
          >
            <span>noirlang/dispatch</span>
            <ExternalLink size={12} />
          </a>
        </div>

        {updateInfo?.remote_commit && (
          <div className="pt-2 border-t border-[var(--border-color)] flex items-center justify-between text-xs">
            <span className="text-[var(--text-muted)]">Son GitHub Commit:</span>
            <span className="font-mono text-xs text-[var(--text-main)] font-semibold">
              #{updateInfo.remote_commit} ({updateInfo.remote_message || "Son güncelleme"})
            </span>
          </div>
        )}
      </div>

      {/* Action Update Button */}
      <div className="flex flex-col gap-3">
        {updateInfo?.update_available ? (
          <div className="p-4 rounded-2xl bg-[#f59e0b15] border border-[#f59e0b30] flex flex-col gap-3">
            <div className="flex items-center gap-2 text-xs font-bold text-[#f59e0b]">
              <Sparkles size={16} />
              <span>Yeni bir güncelleme mevcut!</span>
            </div>
            <p className="text-[11px] text-[var(--text-muted)]">
              GitHub üzerindeki son geliştirmeleri ve hata düzeltmelerini tek tıkla güvenle yükleyebilirsiniz.
            </p>
            <button
              type="button"
              disabled={applyUpdate.isPending}
              onClick={() => applyUpdate.mutate()}
              className="w-full bg-[#f59e0b] hover:bg-[#d97706] text-black font-bold text-xs py-3 px-4 rounded-xl flex items-center justify-center gap-2 shadow-sm transition-all"
            >
              <DownloadCloud size={15} />
              <span>{applyUpdate.isPending ? "Sistem Güncelleniyor..." : "Sistemi Güvenle Güncelle"}</span>
            </button>
          </div>
        ) : (
          <div className="p-4 rounded-2xl bg-[#22c55e15] border border-[#22c55e30] flex items-center justify-between text-xs text-[#22c55e] font-bold">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={16} />
              <span>Sisteminiz en son sürümde (Güncel ✓)</span>
            </div>
            <button
              type="button"
              disabled={applyUpdate.isPending}
              onClick={() => {
                if (confirm("Sistemi zorla tekrar derlemek ve servisleri yenilemek istiyor musunuz?")) {
                  applyUpdate.mutate()
                }
              }}
              className="text-[11px] text-[var(--text-muted)] hover:text-[var(--text-main)] underline font-normal"
            >
              Yeniden Derle / Eşitle
            </button>
          </div>
        )}

        {applyUpdate.data?.logs && (
          <div className="p-3 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] font-mono text-[10px] text-[var(--text-muted)] max-h-40 overflow-y-auto whitespace-pre-wrap">
            {applyUpdate.data.logs}
          </div>
        )}
      </div>
    </motion.div>
  )
}
