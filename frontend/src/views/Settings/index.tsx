import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "../../lib/api"
import { useAuth } from "../../store/auth"
import {
  User,
  Users,
  Key,
  Bot,
  Rss,
  Shield,
  Server,
  Check,
  Copy,
  Trash2,
  Plus,
  RefreshCw,
  Sparkles,
  AlertCircle
} from "lucide-react"

type Tab = "profile" | "contacts" | "speakeasy" | "ai" | "rss" | "security" | "dns"

export default function SettingsView() {
  const [tab, setTab] = useState<Tab>("profile")
  const { user, logout, fetchMe } = useAuth()
  const qc = useQueryClient()

  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  function copyText(val: string, key: string) {
    navigator.clipboard.writeText(val)
    setCopiedKey(key)
    setTimeout(() => setCopiedKey(null), 2000)
  }

  return (
    <div className="h-full flex bg-[#0a0a0a] text-white">
      {/* Sidebar Nav */}
      <aside className="w-56 border-r border-[#1a1a1a] p-3 flex flex-col justify-between shrink-0">
        <div className="flex flex-col gap-1">
          <div className="px-3 py-2 text-xs font-semibold text-[#555] uppercase tracking-wider">
            Settings
          </div>
          <TabBtn id="profile"   icon={<User size={14} />}   label="Profile"            active={tab} setTab={setTab} />
          <TabBtn id="contacts"  icon={<Users size={14} />}  label="Contact Rules"      active={tab} setTab={setTab} />
          <TabBtn id="speakeasy" icon={<Key size={14} />}    label="Speakeasy Codes"    active={tab} setTab={setTab} />
          <TabBtn id="ai"        icon={<Bot size={14} />}    label="Artificial Intelligence" active={tab} setTab={setTab} />
          <TabBtn id="rss"       icon={<Rss size={14} />}    label="RSS Feeds"          active={tab} setTab={setTab} />
          <TabBtn id="security"  icon={<Shield size={14} />} label="Privacy & Security" active={tab} setTab={setTab} />
          <TabBtn id="dns"       icon={<Server size={14} />} label="Cloudflare & DNS"   active={tab} setTab={setTab} />
        </div>

        <button
          onClick={logout}
          className="px-3 py-2 text-xs text-[#ff4444] hover:bg-[#ff444415] rounded transition-colors text-left"
        >
          Sign Out
        </button>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto p-8 max-w-4xl">
        {tab === "profile"   && <ProfileTab user={user} onUpdate={fetchMe} />}
        {tab === "contacts"  && <ContactsTab />}
        {tab === "speakeasy" && <SpeakeasyTab copyText={copyText} copiedKey={copiedKey} />}
        {tab === "ai"        && <AiTab />}
        {tab === "rss"       && <RssTab />}
        {tab === "security"  && <SecurityTab />}
        {tab === "dns"       && <DnsTab copyText={copyText} copiedKey={copiedKey} />}
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
      className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors text-left ${
        isActive ? "bg-[#1a1a1a] text-white" : "text-[#777] hover:text-white hover:bg-[#111]"
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
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-medium">Profile Settings</h2>
        <p className="text-xs text-[#666] mt-0.5">Manage your identity and email signature</p>
      </div>

      <div className="flex flex-col gap-4">
        <div>
          <label className="text-xs text-[#888] block mb-1">Full Name</label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            className="w-full max-w-md bg-[#111] border border-[#222] text-white text-sm px-4 py-2 rounded-lg focus:outline-none focus:border-white"
          />
        </div>

        <div>
          <label className="text-xs text-[#888] block mb-1">Email Address</label>
          <input
            type="text"
            disabled
            value={user?.email || ""}
            className="w-full max-w-md bg-[#0a0a0a] border border-[#1a1a1a] text-[#666] text-sm px-4 py-2 rounded-lg cursor-not-allowed"
          />
        </div>

        <div>
          <label className="text-xs text-[#888] block mb-1">Default Email Signature</label>
          <textarea
            value={signature}
            onChange={e => setSignature(e.target.value)}
            placeholder="e.g. Best regards,&#10;Melih"
            className="w-full max-w-md bg-[#111] border border-[#222] text-white text-sm px-4 py-2 rounded-lg h-24 resize-none focus:outline-none focus:border-white"
          />
        </div>

        <div>
          <button
            onClick={() => update.mutate()}
            className="bg-white text-black text-xs px-6 py-2 rounded-lg font-medium hover:bg-[#e0e0e0] transition-colors"
          >
            {saved ? "Saved ✓" : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  )
}

/* =========================================================================
   2. CONTACTS TAB (Sender Rules)
   ========================================================================= */
function ContactsTab() {
  const qc = useQueryClient()
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

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-medium">Contact Management (Sender Rules)</h2>
        <p className="text-xs text-[#666] mt-0.5">Control which email addresses or domains bypass approvals or get blocked.</p>
      </div>

      {/* Add New Rule Form */}
      <div className="p-4 rounded-xl bg-[#111] border border-[#222] flex flex-wrap items-center gap-3">
        <input
          type="text"
          placeholder="email@example.com or @company.com"
          value={newEmail}
          onChange={e => setNewEmail(e.target.value)}
          className="flex-1 min-w-[200px] bg-[#0a0a0a] border border-[#222] text-white text-xs px-3 py-2 rounded focus:outline-none focus:border-white"
        />
        <select
          value={newStatus}
          onChange={e => setNewStatus(e.target.value as any)}
          className="bg-[#0a0a0a] border border-[#222] text-white text-xs px-3 py-2 rounded focus:outline-none"
        >
          <option value="approved">Approved (Direct to Inbox)</option>
          <option value="important">Important (⭐ Starred)</option>
          <option value="blocked">Blocked (Trash)</option>
        </select>
        <button
          onClick={() => addRule.mutate()}
          className="bg-white text-black text-xs px-4 py-2 rounded font-medium hover:bg-[#e0e0e0] flex items-center gap-1"
        >
          <Plus size={13} />
          <span>Add Rule</span>
        </button>
      </div>

      {/* Rules List */}
      <div className="flex flex-col gap-2">
        {rules.length === 0 && <div className="text-xs text-[#555] py-4">No sender rules created yet.</div>}
        {rules.map(r => (
          <div
            key={r.id}
            className="flex items-center justify-between p-3 rounded-lg bg-[#111] border border-[#1a1a1a] text-xs"
          >
            <span className="font-mono text-white">{r.email_address}</span>
            <div className="flex items-center gap-3">
              <select
                value={r.status}
                onChange={e => updateStatus.mutate({ id: r.id, status: e.target.value })}
                className="bg-[#0a0a0a] border border-[#222] text-xs px-2.5 py-1 rounded text-[#ccc] focus:outline-none"
              >
                <option value="approved">Approved</option>
                <option value="important">⭐ Important</option>
                <option value="blocked">Blocked</option>
              </select>
              <button
                onClick={() => deleteRule.mutate(r.id)}
                className="text-[#555] hover:text-[#ff4444] p-1"
                title="Delete rule"
              >
                <Trash2 size={13} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/* =========================================================================
   3. SPEAKEASY CODES TAB
   ========================================================================= */
function SpeakeasyTab({ copyText, copiedKey }: { copyText: (val: string, k: string) => void; copiedKey: string | null }) {
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
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-medium">Speakeasy Codes</h2>
        <p className="text-xs text-[#666] mt-0.5">
          Generate temporary secret passcodes. Anyone who includes this code in their email subject or body is automatically trusted and lands in your Inbox without approval.
        </p>
      </div>

      {/* Generator Form */}
      <div className="p-4 rounded-xl bg-[#111] border border-[#222] flex flex-col gap-3">
        <span className="text-xs font-medium text-white">Generate New Speakeasy Code</span>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <input
            type="text"
            placeholder="Label (e.g. Freelance Client, Friend)"
            value={label}
            onChange={e => setLabel(e.target.value)}
            className="bg-[#0a0a0a] border border-[#222] text-white text-xs px-3 py-2 rounded focus:outline-none focus:border-white"
          />
          <select
            value={expiryDays}
            onChange={e => setExpiryDays(Number(e.target.value))}
            className="bg-[#0a0a0a] border border-[#222] text-white text-xs px-3 py-2 rounded focus:outline-none"
          >
            <option value={1}>Expires in 1 Day</option>
            <option value={7}>Expires in 7 Days</option>
            <option value={30}>Expires in 30 Days</option>
            <option value={365}>Expires in 1 Year</option>
          </select>
          <label className="flex items-center gap-2 text-xs text-[#ccc] cursor-pointer">
            <input
              type="checkbox"
              checked={singleUse}
              onChange={e => setSingleUse(e.target.checked)}
              className="accent-white"
            />
            <span>Single-use only</span>
          </label>
        </div>
        <div className="flex justify-end">
          <button
            onClick={() => createCode.mutate()}
            className="bg-white text-black text-xs px-4 py-2 rounded font-medium hover:bg-[#e0e0e0] flex items-center gap-1"
          >
            <Plus size={13} />
            <span>Generate Code</span>
          </button>
        </div>
      </div>

      {/* Code List */}
      <div className="flex flex-col gap-2">
        {codes.map(c => (
          <div
            key={c.id}
            className="p-3.5 rounded-lg bg-[#111] border border-[#1a1a1a] flex items-center justify-between"
          >
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-white text-xs font-semibold select-all">{c.code}</span>
                <button
                  onClick={() => copyText(c.code, `code_${c.id}`)}
                  className="text-[#666] hover:text-white p-0.5"
                  title="Copy code"
                >
                  {copiedKey === `code_${c.id}` ? <Check size={12} className="text-[#44ff88]" /> : <Copy size={12} />}
                </button>
              </div>
              <div className="text-[11px] text-[#666] mt-0.5">
                {c.label} · {c.single_use ? "Single Use" : "Multi-use"} · Expires: {new Date(c.expires_at).toLocaleDateString()}
              </div>
            </div>
            <button
              onClick={() => revokeCode.mutate(c.id)}
              className="text-[#ff4444] hover:bg-[#ff444415] px-2.5 py-1 rounded text-xs transition-colors"
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
   4. ARTIFICIAL INTELLIGENCE TAB
   ========================================================================= */
function AiTab() {
  const qc = useQueryClient()
  const { data: settings } = useQuery({
    queryKey: ["settings"],
    queryFn: () => api.get<any>("/settings"),
  })

  const [provider, setProvider] = useState<string>("gemini")
  const [geminiKey, setGeminiKey] = useState("")
  const [claudeKey, setClaudeKey] = useState("")
  const [openaiKey, setOpenaiKey] = useState("")
  const [testResult, setTestResult] = useState<{ success: boolean; msg: string } | null>(null)
  const [testing, setTesting] = useState(false)

  const saveAi = useMutation({
    mutationFn: () => api.patch("/settings", {
      ai_provider: provider,
      gemini_key: geminiKey || undefined,
      claude_key: claudeKey || undefined,
      openai_key: openaiKey || undefined
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["settings"] })
      setTestResult({ success: true, msg: "AI settings saved successfully!" })
    }
  })

  async function testConnection() {
    setTesting(true)
    setTestResult(null)
    try {
      const res = await api.post<any>("/settings/ai/test")
      setTestResult({ success: true, msg: `${res.provider.toUpperCase()} connection successful! ✓` })
    } catch (err: any) {
      setTestResult({ success: false, msg: err.message || "Connection failed" })
    } finally {
      setTesting(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-medium flex items-center gap-2">
          <Bot size={18} />
          <span>AI Integration & API Keys</span>
        </h2>
        <p className="text-xs text-[#666] mt-0.5">
          Enter your own API keys. All keys are encrypted at rest with AES-256. If no API key is provided, AI buttons and background processors remain hidden.
        </p>
      </div>

      <div className="flex flex-col gap-4">
        {/* Active Provider Selector */}
        <div>
          <label className="text-xs text-[#888] block mb-1.5">Active AI Model Provider</label>
          <div className="grid grid-cols-3 gap-2 max-w-md">
            {["gemini", "claude", "openai"].map(p => (
              <button
                key={p}
                type="button"
                onClick={() => setProvider(p)}
                className={`py-2 rounded-lg border text-xs font-medium uppercase tracking-wider transition-all ${
                  (provider || settings?.ai_provider) === p
                    ? "border-white bg-[#1a1a1a] text-white"
                    : "border-[#222] bg-[#0a0a0a] text-[#666] hover:border-[#333]"
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* Gemini Key */}
        <div>
          <div className="flex items-center justify-between max-w-md mb-1">
            <label className="text-xs text-[#888]">Google Gemini API Key</label>
            {settings?.has_gemini_key && <span className="text-[10px] text-[#44ff88]">Configured ✓</span>}
          </div>
          <input
            type="password"
            placeholder={settings?.has_gemini_key ? "••••••••••••••••" : "AIzaSy..."}
            value={geminiKey}
            onChange={e => setGeminiKey(e.target.value)}
            className="w-full max-w-md bg-[#111] border border-[#222] text-white text-xs px-3 py-2 rounded-lg focus:outline-none focus:border-white"
          />
        </div>

        {/* Claude Key */}
        <div>
          <div className="flex items-center justify-between max-w-md mb-1">
            <label className="text-xs text-[#888]">Anthropic Claude API Key</label>
            {settings?.has_claude_key && <span className="text-[10px] text-[#44ff88]">Configured ✓</span>}
          </div>
          <input
            type="password"
            placeholder={settings?.has_claude_key ? "••••••••••••••••" : "sk-ant-api..."}
            value={claudeKey}
            onChange={e => setClaudeKey(e.target.value)}
            className="w-full max-w-md bg-[#111] border border-[#222] text-white text-xs px-3 py-2 rounded-lg focus:outline-none focus:border-white"
          />
        </div>

        {/* OpenAI Key */}
        <div>
          <div className="flex items-center justify-between max-w-md mb-1">
            <label className="text-xs text-[#888]">OpenAI API Key</label>
            {settings?.has_openai_key && <span className="text-[10px] text-[#44ff88]">Configured ✓</span>}
          </div>
          <input
            type="password"
            placeholder={settings?.has_openai_key ? "••••••••••••••••" : "sk-proj-..."}
            value={openaiKey}
            onChange={e => setOpenaiKey(e.target.value)}
            className="w-full max-w-md bg-[#111] border border-[#222] text-white text-xs px-3 py-2 rounded-lg focus:outline-none focus:border-white"
          />
        </div>

        {/* Test Result banner */}
        {testResult && (
          <div className={`p-3 rounded-lg text-xs max-w-md ${testResult.success ? "bg-[#44ff8815] text-[#44ff88] border border-[#44ff8830]" : "bg-[#ff444415] text-[#ff4444] border border-[#ff444430]"}`}>
            {testResult.msg}
          </div>
        )}

        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={() => saveAi.mutate()}
            className="bg-white text-black text-xs px-5 py-2 rounded-lg font-medium hover:bg-[#e0e0e0] transition-colors"
          >
            Save API Keys
          </button>
          <button
            onClick={testConnection}
            disabled={testing}
            className="border border-[#333] hover:border-white text-white text-xs px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-1.5"
          >
            {testing ? <RefreshCw size={12} className="animate-spin" /> : <Sparkles size={12} />}
            <span>Test Active AI</span>
          </button>
        </div>
      </div>
    </div>
  )
}

/* =========================================================================
   5. RSS FEEDS TAB
   ========================================================================= */
function RssTab() {
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
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-medium">RSS Feed Subscriptions</h2>
        <p className="text-xs text-[#666] mt-0.5">Add blogs, news sites, and newsletters to your Feed tab.</p>
      </div>

      <div className="p-4 rounded-xl bg-[#111] border border-[#222] flex flex-wrap items-center gap-3">
        <input
          type="text"
          placeholder="https://news.ycombinator.com/rss"
          value={newUrl}
          onChange={e => setNewUrl(e.target.value)}
          className="flex-1 min-w-[200px] bg-[#0a0a0a] border border-[#222] text-white text-xs px-3 py-2 rounded focus:outline-none focus:border-white"
        />
        <input
          type="text"
          placeholder="Category (e.g. Tech, News)"
          value={category}
          onChange={e => setCategory(e.target.value)}
          className="w-32 bg-[#0a0a0a] border border-[#222] text-white text-xs px-3 py-2 rounded focus:outline-none"
        />
        <button
          onClick={() => addFeed.mutate()}
          className="bg-white text-black text-xs px-4 py-2 rounded font-medium hover:bg-[#e0e0e0] flex items-center gap-1"
        >
          <Plus size={13} />
          <span>Add Feed</span>
        </button>
      </div>

      <div className="flex flex-col gap-2">
        {feeds.map(f => (
          <div key={f.id} className="p-3.5 rounded-lg bg-[#111] border border-[#1a1a1a] flex items-center justify-between text-xs">
            <div>
              <div className="text-white font-medium">{f.title || f.url}</div>
              <div className="text-[11px] text-[#666] truncate max-w-md">{f.url}</div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => refreshFeed.mutate(f.id)}
                className="text-[#666] hover:text-white p-1 rounded"
                title="Fetch updates now"
              >
                <RefreshCw size={13} />
              </button>
              <button
                onClick={() => deleteFeed.mutate(f.id)}
                className="text-[#ff4444] hover:bg-[#ff444415] p-1 rounded"
                title="Delete feed"
              >
                <Trash2 size={13} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/* =========================================================================
   6. PRIVACY & SECURITY TAB
   ========================================================================= */
function SecurityTab() {
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
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-medium flex items-center gap-2">
          <Shield size={18} />
          <span>Privacy & Security Defenses</span>
        </h2>
        <p className="text-xs text-[#666] mt-0.5">Control email trackers and proxy protections.</p>
      </div>

      <div className="p-5 rounded-xl bg-[#111] border border-[#222] flex items-center justify-between">
        <div>
          <span className="text-sm font-medium text-white block">Spy Pixel & Tracker Proxy</span>
          <span className="text-xs text-[#666] max-w-lg block mt-0.5">
            Routes all embedded images through the Dispatch backend server proxy with SSRF protections. Senders will only see the server IP and will never track your physical device or location. Known tracking beacons are neutralized.
          </span>
        </div>
        <input
          type="checkbox"
          checked={settings?.spy_pixel_blocking ?? true}
          onChange={e => toggleSpy.mutate(e.target.checked)}
          className="w-5 h-5 accent-white cursor-pointer"
        />
      </div>

      <div className="p-5 rounded-xl bg-[#111] border border-[#1a1a1a]">
        <span className="text-xs font-semibold text-[#888] uppercase tracking-wider block mb-2">
          Neutralized Tracker Domains (Active List)
        </span>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 font-mono text-[11px] text-[#777]">
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

/* =========================================================================
   7. CLOUDFLARE & DNS TAB
   ========================================================================= */
function DnsTab({ copyText, copiedKey }: { copyText: (val: string, k: string) => void; copiedKey: string | null }) {
  const { data: dnsData } = useQuery({
    queryKey: ["dns-records"],
    queryFn: () => api.get<any>("/setup/dns"),
  })

  if (!dnsData) return <div className="text-xs text-[#555]">Loading DNS records...</div>

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-medium">Cloudflare & DNS Records</h2>
          <p className="text-xs text-[#666] mt-0.5">Configured for <strong>{dnsData.domain}</strong></p>
        </div>
        <button
          onClick={() => copyText(dnsData.bind_zone, "bind_zone")}
          className="px-3 py-1.5 rounded-lg bg-[#1a1a1a] hover:bg-[#252525] text-xs text-[#bbb] hover:text-white flex items-center gap-1.5 transition-colors"
        >
          {copiedKey === "bind_zone" ? <Check size={12} className="text-[#44ff88]" /> : <Copy size={12} />}
          <span>Copy Zone File</span>
        </button>
      </div>

      <div className="flex flex-col gap-3">
        {dnsData.records?.map((r: any, i: number) => (
          <div key={i} className="p-3.5 rounded-lg bg-[#111] border border-[#1a1a1a] flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-[#1f1f1f] text-white text-[11px] font-mono font-semibold">
                  {r.type}
                </span>
                <span className="text-xs font-mono text-[#ccc]">{r.name}</span>
                {r.priority !== undefined && <span className="text-[10px] text-[#888]">Priority: {r.priority}</span>}
              </div>
              <button
                onClick={() => copyText(r.content, `rec_${i}`)}
                className="text-[#666] hover:text-white text-xs flex items-center gap-1 p-1 rounded hover:bg-[#1a1a1a]"
              >
                {copiedKey === `rec_${i}` ? <Check size={12} className="text-[#44ff88]" /> : <Copy size={12} />}
              </button>
            </div>
            <div className="bg-[#0a0a0a] p-2 rounded border border-[#1a1a1a] font-mono text-[11px] text-[#aaa] break-all select-all">
              {r.content}
            </div>
            <span className="text-[10px] text-[#555]">{r.description}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
