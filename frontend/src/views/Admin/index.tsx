const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3000"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { motion, AnimatePresence } from "framer-motion"
import {
  DownloadCloud,
  Server,
  Users,
  Key,
  LogOut,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Database,
  Mail,
  Eye,
  EyeOff,
  RefreshCw,
  Ticket,
  Plus,
  Trash2,
  Copy,
  Check,
  UserPlus,
  Settings
} from "lucide-react"

export default function AdminView() {
  const [adminToken, setAdminToken] = useState<string | null>(
    localStorage.getItem("dispatch_admin_token")
  )
  const [tab, setTab] = useState<"updates" | "invites" | "users" | "status" | "security">("updates")

  if (!adminToken) {
    return <AdminLogin onLogin={(token) => setAdminToken(token)} />
  }

  return (
    <div className="h-screen w-screen flex bg-[var(--bg-primary)] text-[var(--text-main)] overflow-hidden font-sans">
      {/* Sidebar Nav */}
      <aside className="w-64 border-r border-[var(--border-color)] bg-[var(--bg-secondary)] p-4 flex flex-col justify-between shrink-0">
        <div className="flex flex-col gap-5">
          {/* Logo & Title */}
          <div className="flex items-center gap-3 px-2 py-1">
            <img src="/dispatch.png" alt="Dispatch" className="h-7 w-auto object-contain" />
            <div>
              <div className="text-[10px] text-[var(--text-dim)] flex items-center gap-1.5 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#22c55e] animate-pulse" />
                <span>Yönetici Paneli</span>
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex flex-col gap-1">
            <AdminTabBtn
              id="updates"
              icon={<DownloadCloud size={15} />}
              label="Sistem Güncelleme"
              active={tab}
              setTab={setTab}
            />
            <AdminTabBtn
              id="invites"
              icon={<Ticket size={15} />}
              label="Kayıt & Davet Kodları"
              active={tab}
              setTab={setTab}
            />
            <AdminTabBtn
              id="users"
              icon={<Users size={15} />}
              label="Kullanıcılar"
              active={tab}
              setTab={setTab}
            />
            <AdminTabBtn
              id="status"
              icon={<Server size={15} />}
              label="Sunucu & Servisler"
              active={tab}
              setTab={setTab}
            />
            <AdminTabBtn
              id="security"
              icon={<Key size={15} />}
              label="Admin Şifresi"
              active={tab}
              setTab={setTab}
            />
          </div>
        </div>

        {/* Bottom Actions */}
        <div className="flex flex-col gap-2 pt-4 border-t border-[var(--border-color)]">
          <div className="flex items-center justify-between px-2 py-1 mb-1">
            <span className="text-[10px] text-[var(--text-dim)]">Altyapı:</span>
            <a href="https://noirlang.tr" target="_blank" rel="noopener noreferrer" title="NoirLang">
              <img src="/sirket.png" alt="NoirLang" className="h-5 w-auto object-contain opacity-80 hover:opacity-100 transition-opacity" />
            </a>
          </div>

          <a
            href="/app"
            className="flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-card)] transition-colors"
          >
            <Mail size={14} />
            <span>E-Posta Arayüzüne Dön</span>
          </a>

          <button
            type="button"
            onClick={() => {
              localStorage.removeItem("dispatch_admin_token")
              setAdminToken(null)
            }}
            className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-bold bg-[#ef444415] text-[#ef4444] border border-[#ef444430] hover:bg-[#ef444425] transition-all shadow-xs"
          >
            <LogOut size={14} />
            <span>Çıkış Yap</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto p-10 max-w-4xl bg-[var(--bg-primary)]">
        <AnimatePresence mode="wait">
          {tab === "updates" && <AdminUpdatesTab key="updates" token={adminToken} />}
          {tab === "invites" && <AdminInvitesTab key="invites" token={adminToken} />}
          {tab === "users" && <AdminUsersTab key="users" token={adminToken} />}
          {tab === "status" && <AdminStatusTab key="status" token={adminToken} />}
          {tab === "security" && <AdminSecurityTab key="security" token={adminToken} />}
        </AnimatePresence>
      </main>
    </div>
  )
}

function AdminTabBtn({
  id,
  icon,
  label,
  active,
  setTab
}: {
  id: "updates" | "invites" | "status" | "users" | "security"
  icon: React.ReactNode
  label: string
  active: "updates" | "invites" | "status" | "users" | "security"
  setTab: (t: any) => void
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
   ADMIN LOGIN SCREEN
   ========================================================================= */
function AdminLogin({ onLogin }: { onLogin: (token: string) => void }) {
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    if (!password) return
    setError("")
    setLoading(true)

    try {
      const res = await fetch(`${API_BASE}/api/v1/admin/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password })
      })
      const data = await res.json()
      if (res.ok && data.token) {
        localStorage.setItem("dispatch_admin_token", data.token)
        onLogin(data.token)
      } else {
        setError(data.error || "Geçersiz yönetici şifresi!")
      }
    } catch {
      setError("Sunucuya bağlanılamadı. Lütfen sunucunun çalıştığından emin olun.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="h-screen w-screen flex flex-col items-center justify-center bg-[var(--bg-primary)] p-4 relative overflow-hidden font-sans">
      {/* Subtle Background Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-white/5 rounded-full blur-3xl pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: "spring", damping: 24, stiffness: 280 }}
        className="w-full max-w-sm bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-3xl p-8 shadow-2xl flex flex-col gap-6 relative z-10"
      >
        <div className="flex flex-col items-center text-center gap-3">
          <img src="/dispatch.png" alt="Dispatch" className="h-9 w-auto object-contain" />
          <div>
            <h1 className="text-base font-bold text-[var(--text-main)]">Yönetici Girişi</h1>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              Dispatch sistem yönetimi ve güncelleme paneli
            </p>
          </div>
        </div>

        <form onSubmit={handleLogin} className="flex flex-col gap-4">
          <div>
            <label className="text-xs font-semibold text-[var(--text-muted)] block mb-1.5">
              Admin Şifresi (Master Key)
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="••••••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoFocus
                className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-main)] text-xs px-4 py-3 rounded-xl focus:outline-none focus:border-[var(--text-main)] transition-colors pr-10 font-mono"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-dim)] hover:text-[var(--text-main)]"
              >
                {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-3 rounded-xl bg-[#ef444415] border border-[#ef444430] text-xs text-[#ef4444] flex items-center gap-2"
            >
              <AlertCircle size={14} className="shrink-0" />
              <span>{error}</span>
            </motion.div>
          )}

          <motion.button
            whileTap={{ scale: 0.97 }}
            type="submit"
            disabled={loading || !password}
            className="w-full bg-[var(--accent)] text-[var(--accent-invert)] text-xs font-bold py-3 px-4 rounded-xl hover:opacity-90 disabled:opacity-40 transition-all shadow-sm flex items-center justify-center gap-2 mt-2"
          >
            {loading ? "Doğrulanıyor..." : "Yönetici Paneline Giriş Yap"}
          </motion.button>
        </form>

        <div className="pt-2 border-t border-[var(--border-color)] flex items-center justify-between text-[11px] text-[var(--text-dim)]">
          <a href="/" className="hover:text-[var(--text-main)] transition-colors">
            ← Ana Sayfaya Dön
          </a>
          <a href="https://noirlang.tr" target="_blank" rel="noopener noreferrer" title="NoirLang">
            <img src="/sirket.png" alt="NoirLang" className="h-4 w-auto object-contain opacity-70 hover:opacity-100 transition-opacity" />
          </a>
        </div>
      </motion.div>
    </div>
  )
}

/* =========================================================================
   1. ADMIN UPDATES TAB (SYSTEM CORE & REPO SYNC)
   ========================================================================= */
function AdminUpdatesTab({ token }: { token: string }) {
  const qc = useQueryClient()

  const { data: updateInfo } = useQuery({
    queryKey: ["admin-updates"],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/api/v1/admin/updates/check`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (!res.ok) throw new Error("Durum bilgisi alınamadı")
      return res.json()
    }
  })

  const applyUpdate = useMutation({
    mutationFn: async () => {
      const res = await fetch(`${API_BASE}/api/v1/admin/updates/apply`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Güncelleme başarısız oldu")
      }
      return res.json()
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-updates"] })
      qc.invalidateQueries({ queryKey: ["admin-status"] })
    }
  })

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="flex flex-col gap-6 max-w-2xl"
    >
      <div>
        <h2 className="text-xl font-bold text-[var(--text-main)] flex items-center gap-2">
          <DownloadCloud size={22} />
          <span>Sistem Güncelleme & Eşitleme</span>
        </h2>
        <p className="text-xs text-[var(--text-muted)] mt-1">
          <strong className="text-[var(--text-main)]">Git / Sistem Çekirdeği</strong> üzerinden sıfır kesinti ve %100 veri korumasıyla çekirdek sistem güncellemeleri.
        </p>
      </div>

      {/* Safety Guarantee Card */}
      <div className="p-4 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-color)] flex items-start gap-3 shadow-xs">
        <div className="p-2 rounded-xl bg-[#22c55e15] text-[#22c55e] border border-[#22c55e30] shrink-0 mt-0.5">
          <ShieldCheck size={18} />
        </div>
        <div>
          <div className="text-xs font-bold text-[var(--text-main)] mb-1">
            %100 Güvenli Güncelleme Garantisi (Zero-Data Loss)
          </div>
          <div className="text-[11px] text-[var(--text-muted)] leading-relaxed">
            Güncelleme sırasında <strong>kullanıcılar, gelen ve giden e-postalar, şifreler, DNS kayıtları ve ayarlar ASLA silinmez veya bozulmaz</strong>. Yalnızca yeni migrasyonlar ve optimize edilmiş frontend varlıkları güncellenir.
          </div>
        </div>
      </div>

      {/* Current Version Box */}
      <div className="p-5 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-color)] flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] flex items-center justify-center font-mono text-xs font-bold text-[#3b82f6]">
            SYS
          </div>
          <div>
            <div className="text-xs font-bold text-[var(--text-main)]">
              Güncelleme Kaynağı: <span className="font-mono text-[#3b82f6]">Git / Sistem Çekirdeği</span>
            </div>
            <div className="text-[11px] text-[var(--text-dim)] mt-0.5">
              Çekirdek: #{updateInfo?.current_commit || "v1.2.0"} · {updateInfo?.current_message || "Dispatch Sistemi"}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#22c55e15] text-[#22c55e] border border-[#22c55e30] text-xs font-bold">
          <CheckCircle2 size={14} />
          <span>Sistem Hazır</span>
        </div>
      </div>

      {/* Rebuild Action Card */}
      <div className="p-6 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-color)] flex flex-col gap-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-sm font-bold text-[var(--text-main)] block">Sistemi Güncelle ve Servisleri Eşitle</span>
            <span className="text-xs text-[var(--text-muted)] block mt-0.5">
              Git / Sistem Çekirdeği üzerinden güncellemeleri çeker ve servisleri yeniler.
            </span>
          </div>

          <motion.button
            whileTap={{ scale: 0.96 }}
            whileHover={{ scale: 1.02 }}
            disabled={applyUpdate.isPending}
            onClick={() => applyUpdate.mutate()}
            className="bg-[var(--accent)] text-[var(--accent-invert)] text-xs font-bold px-5 py-2.5 rounded-xl flex items-center gap-2 shadow-sm disabled:opacity-40 hover:opacity-90 transition-all shrink-0"
          >
            <RefreshCw size={13} className={applyUpdate.isPending ? "animate-spin" : ""} />
            <span>{applyUpdate.isPending ? "Güncelleniyor..." : "Güncelle ve Eşitle"}</span>
          </motion.button>
        </div>

        {applyUpdate.data?.logs && (
          <div className="p-4 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] font-mono text-[10px] text-[var(--text-main)] whitespace-pre-wrap leading-relaxed">
            {applyUpdate.data.logs}
          </div>
        )}
      </div>
    </motion.div>
  )
}

/* =========================================================================
   2. ADMIN REGISTRATION MODES & INVITE CODES TAB
   ========================================================================= */
function AdminInvitesTab({ token }: { token: string }) {
  const qc = useQueryClient()
  const [copiedId, setCopiedId] = useState<number | null>(null)
  const [newLabel, setNewLabel] = useState("")
  const [newMaxUses, setNewMaxUses] = useState(1)
  const [showAddModal, setShowAddModal] = useState(false)

  // 1. Fetch system settings (registration mode)
  const { data: settings } = useQuery({
    queryKey: ["admin-settings"],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/api/v1/admin/system/settings`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (!res.ok) throw new Error("Ayarlar alınamadı")
      return res.json()
    }
  })

  // 2. Fetch invite codes
  const { data: invites = [], isLoading } = useQuery({
    queryKey: ["admin-invites"],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/api/v1/admin/invite_codes`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (!res.ok) throw new Error("Davet kodları alınamadı")
      return res.json()
    }
  })

  // Update registration mode mutation
  const updateMode = useMutation({
    mutationFn: async (mode: string) => {
      const res = await fetch(`${API_BASE}/api/v1/admin/system/settings`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ registration_mode: mode })
      })
      if (!res.ok) throw new Error("Kayıt modu güncellenemedi")
      return res.json()
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-settings"] })
      qc.invalidateQueries({ queryKey: ["registration-status"] })
    }
  })

  // Create invite code mutation
  const createInvite = useMutation({
    mutationFn: async () => {
      const res = await fetch(`${API_BASE}/api/v1/admin/invite_codes`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          label: newLabel || "Yeni Davet Kodu",
          max_uses: newMaxUses
        })
      })
      if (!res.ok) throw new Error("Davet kodu oluşturulamadı")
      return res.json()
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-invites"] })
      setShowAddModal(false)
      setNewLabel("")
      setNewMaxUses(1)
    }
  })

  // Delete invite mutation
  const deleteInvite = useMutation({
    mutationFn: async (id: number) => {
      await fetch(`${API_BASE}/api/v1/admin/invite_codes/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-invites"] })
    }
  })

  const currentMode = settings?.registration_mode || "public"

  function copyToClipboard(text: string, id: number) {
    navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="flex flex-col gap-8 max-w-3xl"
    >
      <div>
        <h2 className="text-xl font-bold text-[var(--text-main)] flex items-center gap-2">
          <Ticket size={22} />
          <span>Kullanıcı Kayıt Modu & Davet Kodları</span>
        </h2>
        <p className="text-xs text-[var(--text-muted)] mt-1">
          Sunucunuza yeni kullanıcıların nasıl katılabileceğini belirleyin ve davet kodlarını yönetin.
        </p>
      </div>

      {/* Registration Mode Selector */}
      <div className="p-6 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-color)] flex flex-col gap-4 shadow-sm">
        <div className="flex items-center gap-2 text-xs font-bold text-[var(--text-main)]">
          <Settings size={15} />
          <span>Kayıt Erişim Modu</span>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {/* Public */}
          <button
            type="button"
            onClick={() => updateMode.mutate("public")}
            className={`p-4 rounded-xl border text-left transition-all flex flex-col justify-between gap-3 ${
              currentMode === "public"
                ? "bg-[var(--bg-card)] border-[var(--text-main)] shadow-sm"
                : "border-[var(--border-color)] bg-[var(--bg-primary)] opacity-70 hover:opacity-100"
            }`}
          >
            <div>
              <div className="text-xs font-bold text-[var(--text-main)]">1. Herkese Açık</div>
              <div className="text-[11px] text-[var(--text-muted)] mt-1 leading-relaxed">
                İsteyen herkes kayıt formu üzerinden doğrudan e-posta hesabı oluşturabilir.
              </div>
            </div>
            <span className="text-[10px] font-bold text-[#22c55e]">Giriş & Kayıt Açık ✓</span>
          </button>

          {/* Admin Only */}
          <button
            type="button"
            onClick={() => updateMode.mutate("admin_only")}
            className={`p-4 rounded-xl border text-left transition-all flex flex-col justify-between gap-3 ${
              currentMode === "admin_only"
                ? "bg-[var(--bg-card)] border-[var(--text-main)] shadow-sm"
                : "border-[var(--border-color)] bg-[var(--bg-primary)] opacity-70 hover:opacity-100"
            }`}
          >
            <div>
              <div className="text-xs font-bold text-[var(--text-main)]">2. Sadece Admin</div>
              <div className="text-[11px] text-[var(--text-muted)] mt-1 leading-relaxed">
                Dışarıdan kayıt kapalıdır. Hesaplar yalnızca /admin panelinden elle açılabilir.
              </div>
            </div>
            <span className="text-[10px] font-bold text-[#f59e0b]">Sadece Giriş Açık</span>
          </button>

          {/* Invite Only */}
          <button
            type="button"
            onClick={() => updateMode.mutate("invite_only")}
            className={`p-4 rounded-xl border text-left transition-all flex flex-col justify-between gap-3 ${
              currentMode === "invite_only"
                ? "bg-[var(--bg-card)] border-[var(--text-main)] shadow-sm"
                : "border-[var(--border-color)] bg-[var(--bg-primary)] opacity-70 hover:opacity-100"
            }`}
          >
            <div>
              <div className="text-xs font-bold text-[var(--text-main)]">3. Davet Koduyla</div>
              <div className="text-[11px] text-[var(--text-muted)] mt-1 leading-relaxed">
                Kayıt formunda ilk aşamada geçerli bir Davet Kodu istenir.
              </div>
            </div>
            <span className="text-[10px] font-bold text-[#3b82f6]">Kodlu Kayıt Açık</span>
          </button>
        </div>
      </div>

      {/* Invite Codes Section */}
      <div className="p-6 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-color)] flex flex-col gap-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-[var(--text-main)]">Aktif Davet Kodları ({invites.length})</h3>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              Kullanıcılara verilecek kayıt kodları
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="bg-[var(--accent)] text-[var(--accent-invert)] text-xs font-bold px-3.5 py-2 rounded-xl flex items-center gap-1.5 shadow-sm hover:opacity-90 transition-all"
          >
            <Plus size={14} />
            <span>Yeni Kod Oluştur</span>
          </button>
        </div>

        {/* Modal for new invite */}
        {showAddModal && (
          <div className="p-4 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] flex flex-col gap-3">
            <span className="text-xs font-bold text-[var(--text-main)]">Yeni Davet Kodu Tanımla</span>
            <div className="grid grid-cols-2 gap-3">
              <input
                type="text"
                placeholder="Açıklama (örn: Yazılım Ekibi)"
                value={newLabel}
                onChange={e => setNewLabel(e.target.value)}
                className="bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-main)] text-xs px-3 py-2 rounded-xl focus:outline-none"
              />
              <input
                type="number"
                min="1"
                placeholder="Kullanım Limiti (örn: 1)"
                value={newMaxUses}
                onChange={e => setNewMaxUses(Number(e.target.value))}
                className="bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-main)] text-xs px-3 py-2 rounded-xl focus:outline-none"
              />
            </div>
            <div className="flex justify-end gap-2 mt-1">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold text-[var(--text-muted)] hover:text-[var(--text-main)]"
              >
                İptal
              </button>
              <button
                type="button"
                disabled={createInvite.isPending}
                onClick={() => createInvite.mutate()}
                className="bg-[var(--accent)] text-[var(--accent-invert)] px-4 py-1.5 rounded-xl text-xs font-bold hover:opacity-90"
              >
                {createInvite.isPending ? "Oluşturuluyor..." : "Kodu Oluştur"}
              </button>
            </div>
          </div>
        )}

        {/* List of Invites */}
        <div className="flex flex-col gap-2">
          {isLoading && <div className="text-xs text-[var(--text-dim)] p-4 text-center">Yükleniyor...</div>}
          {invites.length === 0 && !isLoading && (
            <div className="text-xs text-[var(--text-muted)] p-6 text-center border border-dashed border-[var(--border-color)] rounded-xl">
              Henüz tanımlanmış bir davet kodu bulunmuyor.
            </div>
          )}
          {invites.map((inv: any) => (
            <div
              key={inv.id}
              className="p-3.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] flex items-center justify-between gap-3 text-xs"
            >
              <div className="flex items-center gap-3">
                <span className="font-mono font-bold text-sm text-[#3b82f6] tracking-wider px-2.5 py-1 rounded-lg bg-[#3b82f615] border border-[#3b82f630]">
                  {inv.code}
                </span>
                <div>
                  <div className="text-xs font-semibold text-[var(--text-main)]">{inv.label || "Davet Kodu"}</div>
                  <div className="text-[10px] text-[var(--text-dim)]">
                    Kullanım: {inv.used_count} / {inv.max_uses || "Sınırsız"}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => copyToClipboard(inv.code, inv.id)}
                  className="p-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)] hover:bg-[var(--bg-card)] text-[var(--text-main)] transition-colors"
                  title="Kodu Kopyala"
                >
                  {copiedId === inv.id ? <Check size={14} className="text-[#22c55e]" /> : <Copy size={14} />}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (confirm("Bu davet kodunu silmek istiyor musunuz?")) deleteInvite.mutate(inv.id)
                  }}
                  className="p-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)] hover:bg-[#ef444420] text-[var(--text-dim)] hover:text-[#ef4444] transition-colors"
                  title="Sil"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  )
}

/* =========================================================================
   3. ADMIN USERS TAB
   ========================================================================= */
function AdminUsersTab({ token }: { token: string }) {
  const qc = useQueryClient()
  const [showAddUser, setShowAddUser] = useState(false)
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [msg, setMsg] = useState<{ success: boolean; text: string } | null>(null)
  const [loading, setLoading] = useState(false)

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/api/v1/admin/system/users`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (!res.ok) throw new Error("Kullanıcılar alınamadı")
      return res.json()
    }
  })

  async function handleCreateUser(e: React.FormEvent) {
    e.preventDefault()
    if (!name || !email || !password) return
    setLoading(true)
    setMsg(null)

    try {
      const res = await fetch(`${API_BASE}/api/v1/admin/system/create_user`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ name, email, password })
      })
      const data = await res.json()
      if (res.ok) {
        setMsg({ success: true, text: "Kullanıcı başarıyla oluşturuldu." })
        setName("")
        setEmail("")
        setPassword("")
        setShowAddUser(false)
        qc.invalidateQueries({ queryKey: ["admin-users"] })
        qc.invalidateQueries({ queryKey: ["admin-status"] })
      } else {
        setMsg({ success: false, text: data.error || "Kullanıcı oluşturulamadı!" })
      }
    } catch {
      setMsg({ success: false, text: "Sunucu hatası." })
    } finally {
      setLoading(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="flex flex-col gap-6 max-w-2xl"
    >
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-[var(--text-main)] flex items-center gap-2">
            <Users size={22} />
            <span>Kayıtlı Kullanıcılar ({users.length})</span>
          </h2>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            Sunucudaki tüm e-posta hesapları ve posta kutusu yönetimi
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowAddUser(!showAddUser)}
          className="bg-[var(--accent)] text-[var(--accent-invert)] text-xs font-bold px-3.5 py-2 rounded-xl flex items-center gap-1.5 shadow-sm hover:opacity-90 transition-all"
        >
          <UserPlus size={14} />
          <span>Hesap Ekle</span>
        </button>
      </div>

      {/* Manual Create User Modal */}
      {showAddUser && (
        <form onSubmit={handleCreateUser} className="p-5 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-color)] flex flex-col gap-3">
          <span className="text-xs font-bold text-[var(--text-main)]">Yeni E-Posta Hesabı Oluştur</span>
          <div className="grid grid-cols-3 gap-3">
            <input
              type="text"
              placeholder="Ad Soyad"
              value={name}
              onChange={e => setName(e.target.value)}
              className="bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-main)] text-xs px-3 py-2 rounded-xl focus:outline-none"
            />
            <input
              type="email"
              placeholder="E-posta"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-main)] text-xs px-3 py-2 rounded-xl focus:outline-none"
            />
            <input
              type="password"
              placeholder="Şifre"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-main)] text-xs px-3 py-2 rounded-xl focus:outline-none font-mono"
            />
          </div>

          {msg && (
            <div className={`p-2 rounded-lg text-xs ${msg.success ? "text-[#22c55e]" : "text-[#ef4444]"}`}>
              {msg.text}
            </div>
          )}

          <div className="flex justify-end gap-2 mt-1">
            <button
              type="button"
              onClick={() => setShowAddUser(false)}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold text-[var(--text-muted)] hover:text-[var(--text-main)]"
            >
              İptal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="bg-[var(--accent)] text-[var(--accent-invert)] px-4 py-1.5 rounded-xl text-xs font-bold hover:opacity-90"
            >
              {loading ? "Oluşturuluyor..." : "Hesabı Oluştur"}
            </button>
          </div>
        </form>
      )}

      <div className="flex flex-col gap-2">
        {isLoading && <div className="text-xs text-[var(--text-dim)] p-8 text-center">Yükleniyor...</div>}
        {users.map((u: any) => (
          <div
            key={u.id}
            className="p-4 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-color)] flex items-center justify-between gap-3 text-xs"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-full bg-[var(--bg-primary)] border border-[var(--border-color)] flex items-center justify-center font-bold text-xs text-[var(--text-main)] shrink-0">
                {u.name?.[0]?.toUpperCase() || "U"}
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-[var(--text-main)] truncate">{u.name}</div>
                <div className="text-[10px] text-[var(--text-dim)] font-mono truncate">{u.email}</div>
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <span className="text-[11px] text-[var(--text-muted)]">{u.emails_count} İleti</span>
              {u.has_ai && (
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#3b82f615] text-[#3b82f6] border border-[#3b82f630]">
                  AI: {u.ai_provider}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  )
}

/* =========================================================================
   4. ADMIN STATUS TAB
   ========================================================================= */
function AdminStatusTab({ token }: { token: string }) {
  const { data: status, isLoading } = useQuery({
    queryKey: ["admin-status"],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/api/v1/admin/system/status`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (!res.ok) throw new Error("Sunucu durumu alınamadı")
      return res.json()
    },
    refetchInterval: 5000
  })

  if (isLoading) {
    return <div className="text-xs text-[var(--text-dim)] p-8 text-center">Yükleniyor...</div>
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="flex flex-col gap-6 max-w-2xl"
    >
      <div>
        <h2 className="text-xl font-bold text-[var(--text-main)] flex items-center gap-2">
          <Server size={22} />
          <span>Sunucu ve Servis Durumu</span>
        </h2>
        <p className="text-xs text-[var(--text-muted)] mt-1">
          E-posta sunucusu, veritabanı ve arka plan iş parçacıklarının canlı durumu
        </p>
      </div>

      {/* Services Health Grid */}
      <div className="grid grid-cols-2 gap-4">
        {/* Database */}
        <div className="p-4 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-color)] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-main)]">
              <Database size={16} />
            </div>
            <div>
              <div className="text-xs font-bold text-[var(--text-main)]">PostgreSQL Veritabanı</div>
              <div className="text-[10px] text-[var(--text-dim)] font-mono">Port 5432</div>
            </div>
          </div>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#22c55e15] text-[#22c55e] border border-[#22c55e30]">
            🟢 {status?.database_status === "connected" ? "Bağlı" : "Hata"}
          </span>
        </div>

        {/* Redis & Sidekiq */}
        <div className="p-4 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-color)] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-main)]">
              <Server size={16} />
            </div>
            <div>
              <div className="text-xs font-bold text-[var(--text-main)]">Redis & Sidekiq</div>
              <div className="text-[10px] text-[var(--text-dim)] font-mono">Port 6379</div>
            </div>
          </div>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#22c55e15] text-[#22c55e] border border-[#22c55e30]">
            🟢 {status?.redis_status === "connected" ? "Bağlı" : "Hata"}
          </span>
        </div>
      </div>

      {/* Stats Counter Grid */}
      <div className="grid grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-color)] flex flex-col gap-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-dim)]">Kayıtlı Kullanıcı</span>
          <span className="text-xl font-bold text-[var(--text-main)]">{status?.stats?.users_count || 0}</span>
        </div>

        <div className="p-4 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-color)] flex flex-col gap-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-dim)]">Toplam E-Posta</span>
          <span className="text-xl font-bold text-[var(--text-main)]">{status?.stats?.emails_count || 0}</span>
        </div>

        <div className="p-4 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-color)] flex flex-col gap-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-dim)]">E-Posta Grupları</span>
          <span className="text-xl font-bold text-[var(--text-main)]">{status?.stats?.groups_count || 0}</span>
        </div>

        <div className="p-4 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-color)] flex flex-col gap-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-dim)]">Aktif Davet Kodu</span>
          <span className="text-xl font-bold text-[var(--text-main)]">{status?.stats?.invites_count || 0}</span>
        </div>
      </div>

      {/* Host & Domain Info */}
      <div className="p-5 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-color)] flex flex-col gap-3 text-xs">
        <div className="flex items-center justify-between pb-2 border-b border-[var(--border-color)]">
          <span className="text-[var(--text-muted)]">Ana Alan Adı (Mail Domain):</span>
          <span className="font-mono text-[var(--text-main)] font-bold">{status?.domain}</span>
        </div>
        <div className="flex items-center justify-between pb-2 border-b border-[var(--border-color)]">
          <span className="text-[var(--text-muted)]">Mail Sunucu Hostu:</span>
          <span className="font-mono text-[var(--text-main)] font-bold">{status?.mail_host}</span>
        </div>
        <div className="flex items-center justify-between pb-2 border-b border-[var(--border-color)]">
          <span className="text-[var(--text-muted)]">Kayıt Erişim Modu:</span>
          <span className="font-mono text-[var(--text-main)] font-bold uppercase">{status?.registration_mode}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[var(--text-muted)]">Çalışma Ortamı:</span>
          <span className="font-mono text-[var(--text-main)] font-bold">{status?.environment}</span>
        </div>
      </div>
    </motion.div>
  )
}

/* =========================================================================
   5. ADMIN SECURITY TAB
   ========================================================================= */
function AdminSecurityTab({ token }: { token: string }) {
  const [currentPw, setCurrentPw] = useState("")
  const [newPw, setNewPw] = useState("")
  const [confirmPw, setConfirmPw] = useState("")
  const [msg, setMsg] = useState<{ success: boolean; text: string } | null>(null)
  const [loading, setLoading] = useState(false)

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault()
    if (!currentPw || !newPw) return
    if (newPw !== confirmPw) {
      setMsg({ success: false, text: "Yeni şifreler birbiriyle eşleşmiyor!" })
      return
    }
    setLoading(true)
    setMsg(null)

    try {
      const res = await fetch(`${API_BASE}/api/v1/admin/system/change_password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          current_password: currentPw,
          new_password: newPw
        })
      })
      const data = await res.json()
      if (res.ok) {
        setMsg({ success: true, text: "Yönetici şifresi başarıyla güncellendi." })
        setCurrentPw("")
        setNewPw("")
        setConfirmPw("")
      } else {
        setMsg({ success: false, text: data.error || "Şifre değiştirilemedi!" })
      }
    } catch {
      setMsg({ success: false, text: "Sunucu hatası meydana geldi." })
    } finally {
      setLoading(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="flex flex-col gap-6 max-w-md"
    >
      <div>
        <h2 className="text-xl font-bold text-[var(--text-main)] flex items-center gap-2">
          <Key size={22} />
          <span>Yönetici Şifresi Değiştir</span>
        </h2>
        <p className="text-xs text-[var(--text-muted)] mt-1">
          /admin yönetim paneline erişim için kullanılan master admin şifresini güncelleyin.
        </p>
      </div>

      <form onSubmit={handlePasswordChange} className="p-6 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-color)] flex flex-col gap-4 shadow-sm">
        <div>
          <label className="text-xs font-semibold text-[var(--text-muted)] block mb-1">Mevcut Admin Şifresi</label>
          <input
            type="password"
            placeholder="••••••••••••"
            value={currentPw}
            onChange={e => setCurrentPw(e.target.value)}
            className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-main)] text-xs px-3.5 py-2.5 rounded-xl focus:outline-none font-mono"
          />
        </div>

        <div>
          <label className="text-xs font-semibold text-[var(--text-muted)] block mb-1">Yeni Admin Şifresi</label>
          <input
            type="password"
            placeholder="••••••••••••"
            value={newPw}
            onChange={e => setNewPw(e.target.value)}
            className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-main)] text-xs px-3.5 py-2.5 rounded-xl focus:outline-none font-mono"
          />
        </div>

        <div>
          <label className="text-xs font-semibold text-[var(--text-muted)] block mb-1">Yeni Şifre Tekrar</label>
          <input
            type="password"
            placeholder="••••••••••••"
            value={confirmPw}
            onChange={e => setConfirmPw(e.target.value)}
            className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-main)] text-xs px-3.5 py-2.5 rounded-xl focus:outline-none font-mono"
          />
        </div>

        {msg && (
          <div
            className={`p-3 rounded-xl text-xs ${
              msg.success
                ? "bg-[#22c55e15] text-[#22c55e] border border-[#22c55e30]"
                : "bg-[#ef444415] text-[#ef4444] border border-[#ef444430]"
            }`}
          >
            {msg.text}
          </div>
        )}

        <button
          type="submit"
          disabled={loading || !currentPw || !newPw}
          className="bg-[var(--accent)] text-[var(--accent-invert)] text-xs font-bold py-2.5 px-4 rounded-xl hover:opacity-90 disabled:opacity-40 transition-all shadow-sm mt-2"
        >
          {loading ? "Kaydediliyor..." : "Şifreyi Güncelle"}
        </button>
      </form>
    </motion.div>
  )
}
