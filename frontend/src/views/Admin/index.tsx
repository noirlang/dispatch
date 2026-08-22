import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { motion, AnimatePresence } from "framer-motion"
import {
  Shield,
  Lock,
  DownloadCloud,
  RefreshCw,
  Server,
  Users,
  Key,
  LogOut,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
  AlertCircle,
  Database,
  Mail,
  Eye,
  EyeOff
} from "lucide-react"

export default function AdminView() {
  const [adminToken, setAdminToken] = useState<string | null>(
    localStorage.getItem("dispatch_admin_token")
  )
  const [tab, setTab] = useState<"updates" | "status" | "users" | "security">("updates")

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
            <div className="w-9 h-9 rounded-xl bg-white text-black flex items-center justify-center font-bold text-sm shadow-sm">
              <Shield size={18} />
            </div>
            <div>
              <div className="text-xs font-bold tracking-wide uppercase">Dispatch Admin</div>
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
              id="status"
              icon={<Server size={15} />}
              label="Sunucu & Servisler"
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
          {tab === "status" && <AdminStatusTab key="status" token={adminToken} />}
          {tab === "users" && <AdminUsersTab key="users" token={adminToken} />}
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
  id: "updates" | "status" | "users" | "security"
  icon: React.ReactNode
  label: string
  active: "updates" | "status" | "users" | "security"
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
      const res = await fetch("http://localhost:3000/api/v1/admin/auth/login", {
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
          <div className="w-12 h-12 rounded-2xl bg-white text-black flex items-center justify-center shadow-md">
            <Lock size={22} />
          </div>
          <div>
            <h1 className="text-lg font-bold text-[var(--text-main)]">Yönetici Girişi</h1>
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

        <div className="pt-2 border-t border-[var(--border-color)] text-center">
          <a
            href="/"
            className="text-[11px] text-[var(--text-dim)] hover:text-[var(--text-main)] transition-colors"
          >
            ← Ana Sayfaya Dön
          </a>
        </div>
      </motion.div>
    </div>
  )
}

/* =========================================================================
   1. ADMIN UPDATES TAB (NOIRLANG/DISPATCH SAFE UPDATER)
   ========================================================================= */
function AdminUpdatesTab({ token }: { token: string }) {
  const qc = useQueryClient()

  const { data: updateInfo, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ["admin-updates"],
    queryFn: async () => {
      const res = await fetch("http://localhost:3000/api/v1/admin/updates/check", {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (!res.ok) throw new Error("Güncelleme bilgisi alınamadı")
      return res.json()
    }
  })

  const applyUpdate = useMutation({
    mutationFn: async () => {
      const res = await fetch("http://localhost:3000/api/v1/admin/updates/apply", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Güncelleme uygulanamadı")
      }
      return res.json()
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-updates"] })
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
          <span>Sistem Güncelleme Motoru</span>
        </h2>
        <p className="text-xs text-[var(--text-muted)] mt-1">
          Resmi GitHub deposu (<span className="text-[var(--text-main)] font-mono font-bold">noirlang/dispatch</span>) üzerinden güvenli, veri kaybı yaşatmayan çekirdek sistem güncellemeleri.
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
            Güncelleme işlemi sırasında <strong>veritabanındaki kullanıcılar, gelen/giden e-postalar, şifreler, DNS kayıtları ve ayarlar ASLA silinmez veya bozulmaz</strong>. Yalnızca yeni kodlar, geliştirmeler ve migrasyonlar güvenle entegre edilir.
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
              GitHub üzerindeki son geliştirmeleri tek tıkla güvenle sunucuya uygulayabilirsiniz.
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
          <div className="p-3.5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] font-mono text-[10px] text-[var(--text-muted)] max-h-48 overflow-y-auto whitespace-pre-wrap">
            {applyUpdate.data.logs}
          </div>
        )}
      </div>
    </motion.div>
  )
}

/* =========================================================================
   2. ADMIN STATUS TAB
   ========================================================================= */
function AdminStatusTab({ token }: { token: string }) {
  const { data: status, isLoading } = useQuery({
    queryKey: ["admin-status"],
    queryFn: async () => {
      const res = await fetch("http://localhost:3000/api/v1/admin/system/status", {
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
      <div className="grid grid-cols-3 gap-4">
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
        <div className="flex items-center justify-between">
          <span className="text-[var(--text-muted)]">Çalışma Ortamı:</span>
          <span className="font-mono text-[var(--text-main)] font-bold">{status?.environment}</span>
        </div>
      </div>
    </motion.div>
  )
}

/* =========================================================================
   3. ADMIN USERS TAB
   ========================================================================= */
function AdminUsersTab({ token }: { token: string }) {
  const { data: users = [], isLoading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const res = await fetch("http://localhost:3000/api/v1/admin/system/users", {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (!res.ok) throw new Error("Kullanıcılar alınamadı")
      return res.json()
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
          <Users size={22} />
          <span>Kayıtlı Kullanıcılar ({users.length})</span>
        </h2>
        <p className="text-xs text-[var(--text-muted)] mt-1">
          Sunucudaki tüm e-posta hesapları ve posta kutusu istatistikleri
        </p>
      </div>

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
   4. ADMIN SECURITY TAB
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
      const res = await fetch("http://localhost:3000/api/v1/admin/system/change_password", {
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
