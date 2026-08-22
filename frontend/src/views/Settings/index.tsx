import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "../../lib/api"
import { useAuth } from "../../store/auth"
import { useAppStore, useT, type Theme } from "../../store/themeAndLocale"
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

        <button
          onClick={logout}
          className="px-3.5 py-2.5 text-xs text-[#ef4444] hover:bg-[#ef444415] rounded-xl transition-colors text-left font-semibold"
        >
          Sign Out
        </button>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto p-10 max-w-4xl bg-[var(--bg-primary)]">
        {tab === "profile"    && <ProfileTab user={user} onUpdate={fetchMe} />}
        {tab === "appearance" && <AppearanceTab />}
        {tab === "contacts"   && <ContactsTab />}
        {tab === "speakeasy"  && <SpeakeasyTab copyText={copyText} copiedKey={copiedKey} />}
        {tab === "ai"         && <AiTab />}
        {tab === "rss"        && <RssTab />}
        {tab === "security"   && <SecurityTab />}
      </main>
    </div>
  )
}

function TabBtn({ id, icon, label, active, setTab }: {
  id: Tab; icon: React.ReactNode; label: string; active: Tab; setTab: (t: Tab) => void
}) {
  const isActive = active === id
  return (
    <button
      onClick={() => setTab(id)}
      className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all text-left ${
        isActive
          ? "bg-[var(--bg-card)] text-[var(--text-main)] shadow-sm font-semibold border border-[var(--border-color)]"
          : "text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-card)]"
      }`}
    >
      {icon}
      <span>{label}</span>
    </button>
  )
}

/* =========================================================================
   1. PROFILE TAB
   ========================================================================= */
function ProfileTab({ user, onUpdate }: { user: any; onUpdate: () => void }) {
  const t = useT()
  const [name, setName] = useState(user?.name || "")
  const [signature, setSignature] = useState(user?.default_signature || "")
  const [saved, setSaved] = useState(false)

  const update = useMutation({
    mutationFn: () => api.patch("/settings", { name, default_signature: signature }),
    onSuccess: () => {
      onUpdate()
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    }
  })

  return (
    <div className="flex flex-col gap-6 animate-fadeIn">
      <div>
        <h2 className="text-xl font-bold text-[var(--text-main)]">{t("profile")}</h2>
        <p className="text-xs text-[var(--text-muted)] mt-1">Manage your identity and signature</p>
      </div>

      <div className="flex flex-col gap-4 max-w-lg">
        <div>
          <label className="text-xs font-semibold text-[var(--text-muted)] block mb-1.5">{t("full_name")}</label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-main)] text-sm px-4 py-2.5 rounded-xl focus:outline-none focus:border-[var(--text-main)]"
          />
        </div>

        <div>
          <label className="text-xs font-semibold text-[var(--text-muted)] block mb-1.5">{t("email_address")}</label>
          <input
            type="text"
            disabled
            value={user?.email || ""}
            className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-dim)] text-sm px-4 py-2.5 rounded-xl cursor-not-allowed font-mono opacity-70"
          />
        </div>

        <div>
          <label className="text-xs font-semibold text-[var(--text-muted)] block mb-1.5">{t("signature")}</label>
          <textarea
            value={signature}
            onChange={e => setSignature(e.target.value)}
            placeholder="e.g. Best regards,&#10;Melih"
            className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-main)] text-sm p-4 rounded-xl h-28 resize-none focus:outline-none focus:border-[var(--text-main)]"
          />
        </div>

        <div className="pt-2">
          <button
            onClick={() => update.mutate()}
            className="bg-[var(--accent)] text-[var(--accent-invert)] text-xs px-6 py-2.5 rounded-xl font-bold hover:opacity-90 transition-all shadow-sm"
          >
            {saved ? t("saved") : t("save_changes")}
          </button>
        </div>
      </div>
    </div>
  )
}

/* =========================================================================
   2. APPEARANCE & LANGUAGE TAB
   ========================================================================= */
function AppearanceTab() {
  const t = useT()
  const { theme, setTheme, lang, setLang } = useAppStore()

  return (
    <div className="flex flex-col gap-8 animate-fadeIn max-w-xl">
      <div>
        <h2 className="text-xl font-bold text-[var(--text-main)]">{t("appearance")}</h2>
        <p className="text-xs text-[var(--text-muted)] mt-1">Configure theme and language</p>
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
            <button
              key={opt.id}
              onClick={() => setTheme(opt.id)}
              className={`p-4 rounded-2xl border flex flex-col items-center gap-2.5 transition-all ${
                theme === opt.id
                  ? "bg-[var(--bg-card)] text-[var(--text-main)] border-[var(--text-main)] shadow-md font-bold"
                  : "bg-[var(--bg-secondary)] text-[var(--text-muted)] border-[var(--border-color)] hover:border-[var(--text-dim)]"
              }`}
            >
              {opt.icon}
              <span className="text-xs">{opt.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Language Picker */}
      <div className="flex flex-col gap-3 pt-4 border-t border-[var(--border-color)]">
        <label className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
          {t("language")}
        </label>
        <div className="grid grid-cols-2 gap-3">
          <button
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
          </button>

          <button
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
          </button>
        </div>
      </div>
    </div>
  )
}

/* =========================================================================
   3. CONTACT RULES TAB (WITH SEARCH FILTER)
   ========================================================================= */
function ContactsTab() {
  const t = useT()
  const qc = useQueryClient()
  const [search, setSearch] = useState("")
  const [newEmail, setNewEmail] = useState("")
  const [newStatus, setNewStatus] = useState<"approved" | "blocked" | "important">("approved")

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

  const filteredRules = rules.filter(r =>
    r.email_address?.toLowerCase().includes(search.toLowerCase()) ||
    r.status?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="flex flex-col gap-6 animate-fadeIn">
      <div>
        <h2 className="text-xl font-bold text-[var(--text-main)]">{t("contact_rules")}</h2>
        <p className="text-xs text-[var(--text-muted)] mt-1">Control sender bypass permissions and blocks</p>
      </div>

      {/* Add New Rule */}
      <div className="p-4 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-color)] flex flex-wrap items-center gap-3">
        <input
          type="text"
          placeholder="email@example.com or @domain.com"
          value={newEmail}
          onChange={e => setNewEmail(e.target.value)}
          className="flex-1 min-w-[200px] bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-main)] text-xs px-3.5 py-2.5 rounded-xl focus:outline-none"
        />
        <select
          value={newStatus}
          onChange={e => setNewStatus(e.target.value as any)}
          className="bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-main)] text-xs px-3.5 py-2.5 rounded-xl focus:outline-none font-medium"
        >
          <option value="approved">Approved (Inbox)</option>
          <option value="important">⭐ Important</option>
          <option value="blocked">Blocked (Trash)</option>
        </select>
        <button
          onClick={() => addRule.mutate()}
          className="bg-[var(--accent)] text-[var(--accent-invert)] text-xs px-5 py-2.5 rounded-xl font-bold flex items-center gap-1 hover:opacity-90 shadow-sm"
        >
          <Plus size={14} />
          <span>Add Rule</span>
        </button>
      </div>

      {/* Search Input for Rules */}
      <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] text-xs">
        <Search size={14} className="text-[var(--text-dim)]" />
        <input
          type="text"
          placeholder="Search sender rules..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full bg-transparent text-[var(--text-main)] placeholder-[var(--text-dim)] focus:outline-none text-xs"
        />
      </div>

      {/* Rules list */}
      <div className="flex flex-col gap-2">
        {filteredRules.length === 0 && (
          <div className="text-xs text-[var(--text-dim)] py-6 text-center">No sender rules match your search.</div>
        )}
        {filteredRules.map(r => (
          <div
            key={r.id}
            className="flex items-center justify-between p-3.5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] text-xs shadow-xs"
          >
            <span className="font-mono text-[var(--text-main)] font-medium">{r.email_address}</span>
            <div className="flex items-center gap-3">
              <select
                value={r.status}
                onChange={e => updateStatus.mutate({ id: r.id, status: e.target.value })}
                className="bg-[var(--bg-primary)] border border-[var(--border-color)] text-xs px-3 py-1.5 rounded-lg text-[var(--text-main)] font-medium"
              >
                <option value="approved">Approved</option>
                <option value="important">⭐ Important</option>
                <option value="blocked">Blocked</option>
              </select>
              <button
                onClick={() => deleteRule.mutate(r.id)}
                className="text-[var(--text-dim)] hover:text-[#ef4444] p-1 transition-colors"
                title="Delete rule"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/* =========================================================================
   4. SPEAKEASY CODES TAB
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
        label: label || "VIP Access",
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
    <div className="flex flex-col gap-6 animate-fadeIn">
      <div>
        <h2 className="text-xl font-bold text-[var(--text-main)]">{t("speakeasy_codes")}</h2>
        <p className="text-xs text-[var(--text-muted)] mt-1">
          Temporary trusted passcodes. Incoming emails containing this code land directly in your Inbox without approval.
        </p>
      </div>

      <div className="p-5 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-color)] flex flex-col gap-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <input
            type="text"
            placeholder="Label (e.g. VIP Client)"
            value={label}
            onChange={e => setLabel(e.target.value)}
            className="bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-main)] text-xs px-3.5 py-2.5 rounded-xl"
          />
          <select
            value={expiryDays}
            onChange={e => setExpiryDays(Number(e.target.value))}
            className="bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-main)] text-xs px-3.5 py-2.5 rounded-xl font-medium"
          >
            <option value={1}>Expires in 1 Day</option>
            <option value={7}>Expires in 7 Days</option>
            <option value={30}>Expires in 30 Days</option>
            <option value={365}>Expires in 1 Year</option>
          </select>
          <label className="flex items-center gap-2 text-xs text-[var(--text-muted)] cursor-pointer">
            <input
              type="checkbox"
              checked={singleUse}
              onChange={e => setSingleUse(e.target.checked)}
              className="accent-[var(--text-main)] w-4 h-4 rounded"
            />
            <span>Single-use only</span>
          </label>
        </div>
        <div className="flex justify-end">
          <button
            onClick={() => createCode.mutate()}
            className="bg-[var(--accent)] text-[var(--accent-invert)] text-xs px-5 py-2.5 rounded-xl font-bold flex items-center gap-1 hover:opacity-90 shadow-sm"
          >
            <Plus size={14} />
            <span>Generate Code</span>
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
                {c.label} · {c.single_use ? "Single Use" : "Multi-use"} · Expires: {new Date(c.expires_at).toLocaleDateString()}
              </div>
            </div>
            <button
              onClick={() => revokeCode.mutate(c.id)}
              className="text-[#ef4444] hover:bg-[#ef444415] px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
            >
              Revoke
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

/* =========================================================================
   5. ARTIFICIAL INTELLIGENCE TAB (WITH BRAND ICONS & ACTIVE COMBOBOX)
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
  const [testResult, setTestResult] = useState<{ success: boolean; msg: string } | null>(null)
  const [testing, setTesting] = useState(false)

  const activeProvider = selectedProvider || (settings?.ai_provider as any) || "gemini"
  const currentKey = activeProvider === "gemini" ? settings?.has_gemini_key : activeProvider === "claude" ? settings?.has_claude_key : settings?.has_openai_key

  const modelsList = settings?.all_models?.[activeProvider] || []

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
      setTestResult({ success: true, msg: "AI settings & model saved successfully! ✓" })
    }
  })

  async function testConnection() {
    setTesting(true)
    setTestResult(null)
    try {
      const res = await api.post<any>("/settings/ai/test", { provider: activeProvider, ai_model: selectedModel })
      setTestResult({ success: true, msg: `${res.provider.toUpperCase()} (${res.model || "Default Model"}) connection verified! ✓` })
    } catch (err: any) {
      setTestResult({ success: false, msg: err.message || "Connection failed" })
    } finally {
      setTesting(false)
    }
  }

  return (
    <div className="flex flex-col gap-6 animate-fadeIn max-w-xl">
      <div>
        <h2 className="text-xl font-bold text-[var(--text-main)] flex items-center gap-2">
          <Bot size={22} />
          <span>{t("ai_settings")}</span>
        </h2>
        <p className="text-xs text-[var(--text-muted)] mt-1">
          Select an AI provider, enter your key, and pick your preferred default model.
        </p>
      </div>

      {/* Provider Selector Cards with Brand Logos */}
      <div className="grid grid-cols-3 gap-3">
        {/* Gemini */}
        <button
          type="button"
          onClick={() => {
            setSelectedProvider("gemini")
            setSelectedModel(settings?.ai_model || "gemini-1.5-flash")
          }}
          className={`p-4 rounded-2xl border flex flex-col items-center gap-2.5 transition-all ${
            activeProvider === "gemini"
              ? "bg-[var(--bg-card)] border-[var(--text-main)] shadow-md"
              : "bg-[var(--bg-secondary)] border-[var(--border-color)] opacity-70 hover:opacity-100"
          }`}
        >
          <img
            src="https://img.icons8.com/color/48/google-logo.png"
            alt="Google Gemini"
            className="w-7 h-7 object-contain"
          />
          <div className="text-center">
            <span className="text-xs font-bold block text-[var(--text-main)]">Google Gemini</span>
            <span className="text-[10px] text-[var(--text-dim)]">Flash / Pro</span>
          </div>
          {settings?.has_gemini_key && (
            <span className="px-1.5 py-0.5 rounded text-[10px] bg-[#22c55e15] text-[#22c55e] border border-[#22c55e30]">
              Active ✓
            </span>
          )}
        </button>

        {/* Claude */}
        <button
          type="button"
          onClick={() => {
            setSelectedProvider("claude")
            setSelectedModel(settings?.ai_model || "claude-3-5-sonnet-latest")
          }}
          className={`p-4 rounded-2xl border flex flex-col items-center gap-2.5 transition-all ${
            activeProvider === "claude"
              ? "bg-[var(--bg-card)] border-[var(--text-main)] shadow-md"
              : "bg-[var(--bg-secondary)] border-[var(--border-color)] opacity-70 hover:opacity-100"
          }`}
        >
          <div className="w-7 h-7 rounded-full bg-[#d97706] text-white flex items-center justify-center font-bold text-xs">
            C
          </div>
          <div className="text-center">
            <span className="text-xs font-bold block text-[var(--text-main)]">Anthropic Claude</span>
            <span className="text-[10px] text-[var(--text-dim)]">Sonnet / Haiku</span>
          </div>
          {settings?.has_claude_key && (
            <span className="px-1.5 py-0.5 rounded text-[10px] bg-[#22c55e15] text-[#22c55e] border border-[#22c55e30]">
              Active ✓
            </span>
          )}
        </button>

        {/* OpenAI */}
        <button
          type="button"
          onClick={() => {
            setSelectedProvider("openai")
            setSelectedModel(settings?.ai_model || "gpt-4o-mini")
          }}
          className={`p-4 rounded-2xl border flex flex-col items-center gap-2.5 transition-all ${
            activeProvider === "openai"
              ? "bg-[var(--bg-card)] border-[var(--text-main)] shadow-md"
              : "bg-[var(--bg-secondary)] border-[var(--border-color)] opacity-70 hover:opacity-100"
          }`}
        >
          <div className="w-7 h-7 rounded-full bg-[var(--text-main)] text-[var(--bg-primary)] flex items-center justify-center font-bold text-xs">
            ⚡
          </div>
          <div className="text-center">
            <span className="text-xs font-bold block text-[var(--text-main)]">OpenAI</span>
            <span className="text-[10px] text-[var(--text-dim)]">GPT-4o / Mini</span>
          </div>
          {settings?.has_openai_key && (
            <span className="px-1.5 py-0.5 rounded text-[10px] bg-[#22c55e15] text-[#22c55e] border border-[#22c55e30]">
              Active ✓
            </span>
          )}
        </button>
      </div>

      {/* Selected Provider Form */}
      <div className="p-6 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-color)] flex flex-col gap-4 shadow-sm">
        <div className="flex items-center justify-between pb-3 border-b border-[var(--border-color)]">
          <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-main)]">
            Configure {activeProvider.toUpperCase()}
          </span>
          {currentKey ? (
            <span className="text-[11px] text-[#22c55e] font-semibold flex items-center gap-1">
              <CheckCircle2 size={13} />
              <span>Key Configured</span>
            </span>
          ) : (
            <span className="text-[11px] text-[var(--text-dim)]">No Key Saved</span>
          )}
        </div>

        {/* API Key Input */}
        <div>
          <label className="text-xs font-semibold text-[var(--text-muted)] block mb-1.5">
            {activeProvider.toUpperCase()} API Key
          </label>
          <input
            type="password"
            placeholder={currentKey ? "••••••••••••••••••••••••••••" : `Enter ${activeProvider} API key...`}
            value={apiKeyInput}
            onChange={e => setApiKeyInput(e.target.value)}
            className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-main)] text-xs px-4 py-3 rounded-xl focus:outline-none focus:border-[var(--text-main)]"
          />
        </div>

        {/* Model ComboBox Selector */}
        <div>
          <label className="text-xs font-semibold text-[var(--text-muted)] block mb-1.5">
            Default AI Model (ComboBox)
          </label>
          <select
            value={selectedModel || settings?.ai_model || modelsList[0]?.id || ""}
            onChange={e => setSelectedModel(e.target.value)}
            className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-main)] text-xs px-4 py-3 rounded-xl focus:outline-none focus:border-[var(--text-main)] font-semibold"
          >
            {modelsList.map((m: any) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
          <span className="text-[11px] text-[var(--text-dim)] mt-1 block">
            This model will be used by Sidekiq workers to parse inbound emails for travel, tickets, and OTP codes.
          </span>
        </div>

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

        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={() => saveAi.mutate()}
            className="bg-[var(--accent)] text-[var(--accent-invert)] text-xs px-6 py-2.5 rounded-xl font-bold hover:opacity-90 shadow-sm"
          >
            Save AI Configuration
          </button>
          <button
            onClick={testConnection}
            disabled={testing}
            className="border border-[var(--border-color)] bg-[var(--bg-primary)] text-[var(--text-main)] text-xs px-4 py-2.5 rounded-xl font-semibold hover:bg-[var(--bg-card)] flex items-center gap-1.5 transition-colors shadow-xs"
          >
            {testing ? <RefreshCw size={13} className="animate-spin" /> : <Sparkles size={13} />}
            <span>Test Connection</span>
          </button>
        </div>
      </div>
    </div>
  )
}

/* =========================================================================
   6. RSS FEEDS TAB
   ========================================================================= */
function RssTab() {
  const t = useT()
  const qc = useQueryClient()
  const [newUrl, setNewUrl] = useState("")
  const [category, setCategory] = useState("Tech")

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
    <div className="flex flex-col gap-6 animate-fadeIn">
      <div>
        <h2 className="text-xl font-bold text-[var(--text-main)]">{t("rss_settings")}</h2>
        <p className="text-xs text-[var(--text-muted)] mt-1">Subscribe to blogs and RSS feeds</p>
      </div>

      <div className="p-4 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-color)] flex flex-wrap items-center gap-3">
        <input
          type="text"
          placeholder="https://example.com/feed.xml"
          value={newUrl}
          onChange={e => setNewUrl(e.target.value)}
          className="flex-1 min-w-[200px] bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-main)] text-xs px-3.5 py-2.5 rounded-xl"
        />
        <input
          type="text"
          placeholder="Category"
          value={category}
          onChange={e => setCategory(e.target.value)}
          className="w-32 bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-main)] text-xs px-3.5 py-2.5 rounded-xl"
        />
        <button
          onClick={() => addFeed.mutate()}
          className="bg-[var(--accent)] text-[var(--accent-invert)] text-xs px-5 py-2.5 rounded-xl font-bold flex items-center gap-1 hover:opacity-90 shadow-sm"
        >
          <Plus size={14} />
          <span>Add</span>
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
                title="Refresh"
              >
                <RefreshCw size={14} />
              </button>
              <button
                onClick={() => deleteFeed.mutate(f.id)}
                className="text-[#ef4444] hover:bg-[#ef444415] p-1.5 rounded-lg"
                title="Delete"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
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
    <div className="flex flex-col gap-6 animate-fadeIn">
      <div>
        <h2 className="text-xl font-bold text-[var(--text-main)] flex items-center gap-2">
          <Shield size={22} />
          <span>{t("privacy_security")}</span>
        </h2>
        <p className="text-xs text-[var(--text-muted)] mt-1">
          Real-time tracker shield synchronized with uBlock Origin / EasyPrivacy blocklists.
        </p>
      </div>

      <div className="p-6 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-color)] flex items-center justify-between shadow-xs">
        <div>
          <span className="text-sm font-bold text-[var(--text-main)] block">Spy Pixel & Tracker Proxy</span>
          <span className="text-xs text-[var(--text-muted)] max-w-lg block mt-1 leading-relaxed">
            Routes all embedded images through the Dispatch backend server proxy with SSRF protections. Senders will never track your IP address or physical location.
          </span>
        </div>
        <input
          type="checkbox"
          checked={settings?.spy_pixel_blocking ?? true}
          onChange={e => toggleSpy.mutate(e.target.checked)}
          className="w-5 h-5 accent-[var(--text-main)] cursor-pointer"
        />
      </div>

      <div className="p-6 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-color)]">
        <span className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider block mb-2">
          Live Tracker Shield Domains (uBlock Origin & EasyPrivacy Sync)
        </span>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 font-mono text-[11px] text-[var(--text-dim)]">
          <span>• tracking.mailchimp.com</span>
          <span>• click.sendgrid.net</span>
          <span>• trk.klaviyo.com</span>
          <span>• open.convertkit.com</span>
          <span>• t.dripemail.com</span>
          <span>• pixel.hubspot.com</span>
          <span>• mailtrack.io</span>
          <span>• t.sidekickopen.com</span>
          <span>• track.customer.io</span>
        </div>
      </div>
    </div>
  )
}
