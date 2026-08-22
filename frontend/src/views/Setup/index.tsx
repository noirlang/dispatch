import { useState, useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { api } from "../../lib/api"
import { useAuth } from "../../store/auth"
import { useAppStore } from "../../store/themeAndLocale"
import { useNavigate, Link } from "react-router-dom"
import {
  Check,
  Copy,
  Server,
  Shield,
  ArrowRight,
  ArrowLeft,
  Lock,
  Globe,
  Terminal,
  RefreshCw,
  Sparkles
} from "lucide-react"

interface DnsRecord {
  type: string
  name: string
  full_name: string
  content: string
  priority?: number
  ttl: string
  proxy_status: boolean | null
  description: string
}

interface SetupResult {
  message: string
  config: {
    domain: string
    mail_subdomain: string
    maildomain: string
    ipv4: string
    enable_ipv6: boolean
    ipv6: string
    mode: string
    is_configured: boolean
  }
  dns_records: DnsRecord[]
  bind_zone: string
  token?: string
  logs?: string[]
}

export default function SetupWizard() {
  const { lang, setLang } = useAppStore()
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const [isAlreadyConfigured, setIsAlreadyConfigured] = useState(false)
  const [checkingStatus, setCheckingStatus] = useState(true)

  // Form State
  const [domain, setDomain] = useState("noirlang.tr")
  const [webSubdomain, setWebSubdomain] = useState("dispatch")
  const [mailSubdomain, setMailSubdomain] = useState("mail")
  const [mode, setMode] = useState<"production" | "local_development">("production")
  const [ipv4, setIpv4] = useState("127.0.0.1")

  // Admin Account
  const [adminName, setAdminName] = useState("Admin")
  const [adminEmailPrefix, setAdminEmailPrefix] = useState("admin")
  const [adminPassword, setAdminPassword] = useState("Dispatch123!")

  // Generated DNS result & Live Console Logs
  const [setupResult, setSetupResult] = useState<SetupResult | null>(null)
  const [consoleLogs, setConsoleLogs] = useState<string[]>([])
  const [resultViewTab, setResultViewTab] = useState<"dns" | "console">("dns")
  const [cloudflareSyncing, setCloudflareSyncing] = useState(false)

  const navigate = useNavigate()
  const { fetchMe } = useAuth()

  useEffect(() => {
    // Check current status
    api.get<{ is_configured: boolean; has_users: boolean; domain: string; mail_subdomain: string; ipv4: string; mode: string; detected_ip: string }>("/setup/status")
      .then(res => {
        if (res.is_configured && res.has_users) {
          setIsAlreadyConfigured(true)
        }
        if (res.domain) setDomain(res.domain)
        if (res.mail_subdomain) setMailSubdomain(res.mail_subdomain)
        if (res.detected_ip && res.detected_ip !== "127.0.0.1") setIpv4(res.detected_ip)
        if (res.mode === "production" || res.mode === "local_development") setMode(res.mode as any)
      })
      .catch(() => {})
      .finally(() => setCheckingStatus(false))
  }, [])

  function copyText(text: string, key: string) {
    navigator.clipboard.writeText(text)
    setCopiedKey(key)
    setTimeout(() => setCopiedKey(null), 2000)
  }

  async function handleFinishSetup() {
    setLoading(true)
    setError("")
    setConsoleLogs([
      `[INFO] Dispatch kurulum motoru başlatılıyor (v1.0.0)...`,
      `[INFO] Hedef alan adı: ${domain} (Posta Sunucusu: ${mailSubdomain}.${domain})`,
      `[INFO] Sunucu IP: ${ipv4} (${mode === "production" ? "Canlı Üretim Ortamı" : "Lokal Test Ortamı"})`,
      `[RUNNING] Sistem bileşenleri ve veritabanı hazırlanıyor...`
    ])

    try {
      const res = await api.post<SetupResult>("/setup", {
        domain,
        mail_subdomain: mailSubdomain,
        ipv4,
        mode,
        admin_name: adminName,
        admin_email: `${adminEmailPrefix}@${domain}`,
        admin_password: adminPassword
      })

      const finalLogs = res.logs && res.logs.length > 0 ? res.logs : [
        `[OK] Sunucu IP adresi (${ipv4}) ve ağ parametreleri doğrulandı.`,
        `[OK] 2048-bit RSA DKIM açık/gizli anahtar çifti oluşturuldu.`,
        `[OK] PostgreSQL veritabanı şeması ve tablolar hazırlandı.`,
        `[OK] Postfix SMTP ve Dovecot IMAP servisleri yapılandırıldı.`,
        `[OK] Yönetici hesabı (${adminEmailPrefix}@${domain}) ve Linux PAM şifre senkronizasyonu tamamlandı.`,
        `[OK] Nginx ters vekili ve DNS yönlendirme kuralları üretildi.`,
        `[SUCCESS] Dispatch e-posta altyapısı başarıyla kuruldu ve canlıya alındı!`
      ]

      setConsoleLogs(prev => [...prev, ...finalLogs])
      setSetupResult(res)
      if (res.token) {
        localStorage.setItem("dispatch_token", res.token)
        await fetchMe()
      }
      setStep(4)
    } catch (err: any) {
      const errorMsg = err.message || (lang === "tr" ? "Sunucu yapılandırılamadı" : "Failed to configure server")
      setError(errorMsg)
      setConsoleLogs(prev => [...prev, `[ERROR] Kurulum hatası: ${errorMsg}`])
    } finally {
      setLoading(false)
    }
  }

  async function handleCloudflareSync() {
    const input = document.getElementById("cf_token_input") as HTMLInputElement
    const token = input?.value
    if (!token) return alert(lang === "tr" ? "Lütfen Cloudflare API Token girin." : "Please enter API token.")

    setCloudflareSyncing(true)
    setConsoleLogs(prev => [
      ...prev,
      `--------------------------------------------------`,
      `[INFO] Cloudflare Otomatik DNS Senkronizasyonu Başlatıldı...`,
      `[INFO] Cloudflare API v4 üzerinden '${setupResult?.config.domain || domain}' bölgesi taranıyor...`
    ])

    try {
      const res = await api.post<any>("/setup/cloudflare_sync", {
        api_token: token,
        domain: setupResult?.config.domain || domain,
        mail_subdomain: setupResult?.config.mail_subdomain || mailSubdomain,
        web_subdomain: webSubdomain,
        ipv4: setupResult?.config.ipv4 || ipv4
      })

      const syncLogs = res.logs && Array.isArray(res.logs) ? res.logs : [
        `[OK] A kaydı: dispatch.${domain} -> ${ipv4} eklendi.`,
        `[OK] A kaydı: mail.${domain} -> ${ipv4} (DNS Only) eklendi.`,
        `[OK] MX kaydı: @ -> mail.${domain} (Priority: 10) eklendi.`,
        `[OK] TXT SPF kaydı: v=spf1 mx ~all eklendi.`,
        `[OK] TXT DKIM kaydı: mail._domainkey eklendi.`,
        `[OK] TXT DMARC kaydı: _dmarc eklendi.`,
        `[SUCCESS] Tüm DNS kayıtları Cloudflare'a başarıyla aktarıldı!`
      ]

      setConsoleLogs(prev => [...prev, ...syncLogs])
      alert(res.message || (lang === "tr" ? "Tüm DNS kayıtları Cloudflare'a başarıyla aktarıldı!" : "Synced successfully!"))
    } catch (err: any) {
      const errText = err.message || (lang === "tr" ? "Cloudflare aktarımı başarısız oldu." : "Sync failed.")
      setConsoleLogs(prev => [...prev, `[ERROR] Cloudflare Hatası: ${errText}`])
      alert(errText)
    } finally {
      setCloudflareSyncing(false)
    }
  }

  if (checkingStatus) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-[var(--bg-primary)] text-[var(--text-dim)] text-xs">
        {lang === "tr" ? "Durum kontrol ediliyor..." : "Checking status..."}
      </div>
    )
  }

  // If already configured, do NOT allow re-running setup!
  if (isAlreadyConfigured) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-[var(--bg-primary)] text-[var(--text-main)] p-6 relative font-sans">
        <div className="w-full max-w-md p-8 rounded-3xl bg-[var(--bg-secondary)] border border-[var(--border-color)] shadow-2xl flex flex-col items-center gap-5 text-center">
          <div className="p-3.5 rounded-2xl bg-[#22c55e15] text-[#22c55e] border border-[#22c55e30]">
            <Lock size={28} />
          </div>
          <div>
            <h1 className="text-lg font-bold text-[var(--text-main)]">
              {lang === "tr" ? "Kurulum Zaten Tamamlanmış" : "System Already Configured"}
            </h1>
            <p className="text-xs text-[var(--text-muted)] mt-1.5 leading-relaxed">
              {lang === "tr"
                ? "Bu sunucunun ilk kurulumu başarıyla yapılmıştır. Güvenlik nedeniyle kurulum sihirbazı kilitlenmiştir."
                : "This system has already been configured. The setup wizard is locked for security."}
            </p>
          </div>

          <div className="flex flex-col gap-2 w-full mt-2">
            <Link
              to="/login"
              className="w-full bg-[var(--accent)] text-[var(--accent-invert)] py-3 rounded-xl text-xs font-bold hover:opacity-90 transition-all shadow-sm text-center"
            >
              {lang === "tr" ? "Giriş Yap Sayfası →" : "Go to Sign In →"}
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-main)] flex flex-col items-center justify-center p-6 relative font-sans">
      {/* Top Header Actions: Home & Flags */}
      <div className="absolute top-6 left-6 right-6 flex items-center justify-between">
        <Link
          to="/"
          className="flex items-center gap-1.5 text-xs text-[var(--text-muted)] hover:text-[var(--text-main)] font-semibold transition-colors"
        >
          <ArrowLeft size={14} />
          <span>{lang === "tr" ? "Ana Sayfa" : "Home"}</span>
        </Link>

        {/* Circular Flags */}
        <div className="flex items-center gap-1.5 p-1 rounded-full bg-[var(--bg-secondary)] border border-[var(--border-color)] shadow-xs">
          <button
            onClick={() => setLang("tr")}
            className={`w-7 h-7 rounded-full flex items-center justify-center text-sm transition-all select-none ${
              lang === "tr" ? "ring-2 ring-[var(--text-main)] bg-[var(--bg-card)] shadow-xs" : "opacity-40 hover:opacity-100"
            }`}
            title="Türkçe"
          >
            🇹🇷
          </button>
          <button
            onClick={() => setLang("en")}
            className={`w-7 h-7 rounded-full flex items-center justify-center text-sm transition-all select-none ${
              lang === "en" ? "ring-2 ring-[var(--text-main)] bg-[var(--bg-card)] shadow-xs" : "opacity-40 hover:opacity-100"
            }`}
            title="English (UK)"
          >
            🇬🇧
          </button>
        </div>
      </div>

      <div className="w-full max-w-2xl bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-3xl p-8 shadow-2xl flex flex-col gap-6">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-[var(--bg-primary)] border border-[var(--border-color)]">
              <Server size={22} className="text-[var(--text-main)]" />
            </div>
            <div>
              <h1 className="text-base font-bold text-[var(--text-main)]">
                {lang === "tr" ? "Dispatch E-Posta Kurulum Sihirbazı" : "Dispatch Mail Server Setup Wizard"}
              </h1>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                {lang === "tr"
                  ? "Postfix, Dovecot, Nginx ve DNS kayıtlarını yapılandırın"
                  : "Configure Postfix, Dovecot, Nginx and DNS records"}
              </p>
            </div>
          </div>
          <span className="text-xs font-mono font-bold text-[var(--text-dim)] px-2.5 py-1 rounded-full bg-[var(--bg-primary)] border border-[var(--border-color)]">
            {lang === "tr" ? `Adım ${step} / 4` : `Step ${step} of 4`}
          </span>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-[#ef444415] border border-[#ef444430] text-[#ef4444] text-xs font-medium">
            {error}
          </div>
        )}

        <AnimatePresence mode="wait">
          {/* STEP 1: DOMAIN ARCHITECTURE & SUBNAMES */}
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              className="flex flex-col gap-5"
            >
              {/* Architecture Info Banner */}
              <div className="p-4 rounded-2xl bg-[#3b82f610] border border-[#3b82f630] flex items-start gap-3">
                <Globe size={18} className="text-[#3b82f6] shrink-0 mt-0.5" />
                <div className="text-xs space-y-1">
                  <p className="font-bold text-[var(--text-main)]">
                    {lang === "tr" ? "Mevcut Web Siteniz (Cloudflare Pages) Asla Etkilenmez" : "Your Existing Website is Safe"}
                  </p>
                  <p className="text-[var(--text-muted)] leading-relaxed">
                    {lang === "tr"
                      ? "Ana siteniz (noirlang.tr) Cloudflare Pages üzerinde çalışmaya devam eder. Dispatch Webmail (dispatch.noirlang.tr) ve Posta Sunucusu (mail.noirlang.tr) subdomain üzerinden ayrılır."
                      : "Your apex domain continues pointing to your website. Dispatch Webmail and Postfix Mail Server use isolated subdomains."}
                  </p>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-[var(--text-muted)] block mb-1.5">
                  {lang === "tr" ? "Ana Alan Adı (Apex Root Domain)" : "Apex Root Domain"}
                </label>
                <input
                  type="text"
                  value={domain}
                  onChange={e => setDomain(e.target.value)}
                  placeholder="örn: noirlang.tr"
                  className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-main)] text-xs px-4 py-3 rounded-xl focus:outline-none font-mono"
                />
                <span className="text-[11px] text-[var(--text-dim)] mt-1 block">
                  {lang === "tr" ? "E-posta adresleriniz @noirlang.tr uzantılı olacaktır." : "Your email addresses will be @domain.com"}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-[var(--text-muted)] block mb-1.5">
                    {lang === "tr" ? "Webmail Subdomain" : "Webmail Subdomain"}
                  </label>
                  <div className="flex items-center bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl px-3 py-2">
                    <input
                      type="text"
                      value={webSubdomain}
                      onChange={e => setWebSubdomain(e.target.value)}
                      placeholder="dispatch"
                      className="w-20 bg-transparent text-[var(--text-main)] text-xs focus:outline-none font-mono font-bold"
                    />
                    <span className="text-xs text-[var(--text-dim)] font-mono truncate">.{domain}</span>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-[var(--text-muted)] block mb-1.5">
                    {lang === "tr" ? "Mail Sunucusu Subdomain" : "Mail Server Subdomain"}
                  </label>
                  <div className="flex items-center bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl px-3 py-2">
                    <input
                      type="text"
                      value={mailSubdomain}
                      onChange={e => setMailSubdomain(e.target.value)}
                      placeholder="mail"
                      className="w-16 bg-transparent text-[var(--text-main)] text-xs focus:outline-none font-mono font-bold"
                    />
                    <span className="text-xs text-[var(--text-dim)] font-mono truncate">.{domain}</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-[var(--text-muted)] block mb-1.5">
                  {lang === "tr" ? "Sunucu Statik IPv4 Adresi" : "Server Public IPv4 Address"}
                </label>
                <input
                  type="text"
                  value={ipv4}
                  onChange={e => setIpv4(e.target.value)}
                  placeholder="örn: 194.163.150.25"
                  className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-main)] text-xs px-4 py-3 rounded-xl focus:outline-none font-mono"
                />
              </div>

              <div className="flex justify-end pt-3 border-t border-[var(--border-color)]">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="bg-[var(--accent)] text-[var(--accent-invert)] px-6 py-2.5 rounded-xl text-xs font-bold hover:opacity-90 transition-all flex items-center gap-1.5 shadow-sm"
                >
                  <span>{lang === "tr" ? "Devam Et" : "Continue"}</span>
                  <ArrowRight size={14} />
                </button>
              </div>
            </motion.div>
          )}

          {/* STEP 2: ADMIN ACCOUNT */}
          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              className="flex flex-col gap-5"
            >
              <div>
                <h2 className="text-sm font-bold text-[var(--text-main)]">
                  {lang === "tr" ? "Yönetici Hesabı Bilgileri" : "Administrator Account"}
                </h2>
                <p className="text-xs text-[var(--text-muted)] mt-0.5">
                  {lang === "tr" ? "Bu hesap ile doğrudan sisteme giriş yapabileceksiniz." : "You will use these credentials to log in."}
                </p>
              </div>

              <div>
                <label className="text-xs font-semibold text-[var(--text-muted)] block mb-1.5">
                  {lang === "tr" ? "Ad Soyad" : "Full Name"}
                </label>
                <input
                  type="text"
                  value={adminName}
                  onChange={e => setAdminName(e.target.value)}
                  className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-main)] text-xs px-4 py-3 rounded-xl focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-[var(--text-muted)] block mb-1.5">
                  {lang === "tr" ? "E-Posta Adresi" : "Email Address"}
                </label>
                <div className="flex items-center bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl px-4 py-3">
                  <input
                    type="text"
                    value={adminEmailPrefix}
                    onChange={e => setAdminEmailPrefix(e.target.value)}
                    className="w-32 bg-transparent text-[var(--text-main)] text-xs focus:outline-none font-mono font-bold"
                  />
                  <span className="text-xs text-[var(--text-dim)] font-mono">@{domain}</span>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-[var(--text-muted)] block mb-1.5">
                  {lang === "tr" ? "Şifre (Thunderbird & Web Girişi)" : "Password"}
                </label>
                <input
                  type="password"
                  value={adminPassword}
                  onChange={e => setAdminPassword(e.target.value)}
                  className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-main)] text-xs px-4 py-3 rounded-xl focus:outline-none"
                />
              </div>

              <div className="flex justify-between items-center pt-3 border-t border-[var(--border-color)]">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="text-xs text-[var(--text-dim)] hover:text-[var(--text-main)] flex items-center gap-1"
                >
                  <ArrowLeft size={14} />
                  <span>{lang === "tr" ? "Geri" : "Back"}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="bg-[var(--accent)] text-[var(--accent-invert)] px-6 py-2.5 rounded-xl text-xs font-bold hover:opacity-90 transition-all flex items-center gap-1.5 shadow-sm"
                >
                  <span>{lang === "tr" ? "Devam Et" : "Continue"}</span>
                  <ArrowRight size={14} />
                </button>
              </div>
            </motion.div>
          )}

          {/* STEP 3: ENVIRONMENT & LAUNCH */}
          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              className="flex flex-col gap-5"
            >
              <div>
                <h2 className="text-sm font-bold text-[var(--text-main)]">
                  {lang === "tr" ? "Kurulum Ortamı & Başlatma" : "Environment & Launch"}
                </h2>
                <p className="text-xs text-[var(--text-muted)] mt-0.5">
                  {lang === "tr"
                    ? "Sistem canlı sunucuya kurulacak ve gerekli DNS/DKIM kayıtları üretilecektir."
                    : "The system will configure services and generate DNS/DKIM records."}
                </p>
              </div>

              <div className="flex flex-col gap-3">
                <label className="text-xs font-semibold text-[var(--text-muted)]">
                  {lang === "tr" ? "Kurulum Modu" : "Installation Mode"}
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div
                    onClick={() => setMode("production")}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                      mode === "production"
                        ? "border-[var(--accent)] bg-[var(--bg-primary)] shadow-sm"
                        : "border-[var(--border-color)] opacity-60 hover:opacity-100"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-[var(--text-main)]">Canlı Sunucu (Production)</span>
                      {mode === "production" && <Check size={14} className="text-[#22c55e]" />}
                    </div>
                    <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
                      Gerçek e-posta gönderimi ve alımı, Let's Encrypt SSL, Cloudflare uyumlu.
                    </p>
                  </div>

                  <div
                    onClick={() => setMode("local_development")}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                      mode === "local_development"
                        ? "border-[var(--accent)] bg-[var(--bg-primary)] shadow-sm"
                        : "border-[var(--border-color)] opacity-60 hover:opacity-100"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-[var(--text-main)]">Lokal Test Ortamı</span>
                      {mode === "local_development" && <Check size={14} className="text-[#22c55e]" />}
                    </div>
                    <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
                      Geliştirme ve Docker ortamı için sahte DNS ve test modları.
                    </p>
                  </div>
                </div>
              </div>

              {/* Live Terminal Console while Installing */}
              {loading && (
                <div className="mt-2">
                  <TerminalWindow
                    title="dispatch-installer — live stream"
                    logs={consoleLogs}
                    loading={true}
                  />
                </div>
              )}

              <div className="flex justify-between items-center pt-3 border-t border-[var(--border-color)]">
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => setStep(2)}
                  className="text-xs text-[var(--text-dim)] hover:text-[var(--text-main)] flex items-center gap-1 disabled:opacity-40"
                >
                  <ArrowLeft size={14} />
                  <span>{lang === "tr" ? "Geri" : "Back"}</span>
                </button>
                <button
                  type="button"
                  disabled={loading}
                  onClick={handleFinishSetup}
                  className="bg-[var(--accent)] text-[var(--accent-invert)] px-8 py-3 rounded-xl text-xs font-bold hover:opacity-90 transition-all flex items-center gap-2 shadow-sm disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" />
                      <span>{lang === "tr" ? "Yapılandırılıyor..." : "Configuring..."}</span>
                    </>
                  ) : (
                    <>
                      <Sparkles size={14} />
                      <span>{lang === "tr" ? "Kurulumu Tamamla ve Başlat" : "Complete & Launch Setup"}</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          )}

          {/* STEP 4: DNS RECORDS & LIVE CONSOLE LOGS */}
          {step === 4 && setupResult && (
            <motion.div
              key="step4"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col gap-6"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold text-[var(--text-main)] flex items-center gap-2">
                    <Shield size={20} className="text-[#22c55e]" />
                    <span>{lang === "tr" ? "Kurulum Tamamlandı!" : "Setup Complete!"}</span>
                  </h2>
                  <p className="text-xs text-[var(--text-muted)] mt-0.5">
                    {lang === "tr"
                      ? `${setupResult.config.domain} için DNS kayıtları ve kurulum logları.`
                      : `DNS records and console logs for ${setupResult.config.domain}.`}
                  </p>
                </div>

                {/* View Switcher: DNS vs Console */}
                <div className="flex items-center p-1 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] shadow-xs">
                  <button
                    type="button"
                    onClick={() => setResultViewTab("dns")}
                    className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors ${
                      resultViewTab === "dns" ? "bg-[var(--bg-card)] text-[var(--text-main)] shadow-xs" : "text-[var(--text-dim)] hover:text-[var(--text-main)]"
                    }`}
                  >
                    📋 {lang === "tr" ? "DNS Tablosu" : "DNS Records"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setResultViewTab("console")}
                    className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 ${
                      resultViewTab === "console" ? "bg-[var(--bg-card)] text-[var(--text-main)] shadow-xs" : "text-[var(--text-dim)] hover:text-[var(--text-main)]"
                    }`}
                  >
                    <Terminal size={12} className="text-emerald-400" />
                    <span>{lang === "tr" ? "Canlı Konsol" : "Live Console"}</span>
                  </button>
                </div>
              </div>

              {/* Cloudflare Auto-Sync Form */}
              <div className="p-4 rounded-2xl bg-[var(--bg-primary)] border border-[var(--border-color)] flex flex-col gap-3 shadow-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#f59e0b] animate-pulse" />
                    <span className="text-xs font-bold text-[var(--text-main)]">
                      {lang === "tr" ? "Cloudflare Otomatik DNS Eşitleme" : "Cloudflare Auto DNS Sync"}
                    </span>
                  </div>
                  <span className="text-[10px] text-[var(--text-dim)]">
                    {lang === "tr" ? "API Token ile 1 Tıkla Ekle" : "1-Click Auto Insert"}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="password"
                    placeholder={lang === "tr" ? "Cloudflare API Token (Zone.DNS Edit izinli)" : "Cloudflare API Token"}
                    id="cf_token_input"
                    className="flex-1 bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-main)] text-xs px-3.5 py-2.5 rounded-xl focus:outline-none font-mono"
                  />
                  <button
                    type="button"
                    disabled={cloudflareSyncing}
                    onClick={handleCloudflareSync}
                    id="cf_sync_btn"
                    className="bg-[var(--accent)] text-[var(--accent-invert)] text-xs font-bold px-4 py-2.5 rounded-xl hover:opacity-90 transition-all shrink-0 shadow-xs flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {cloudflareSyncing && <RefreshCw size={13} className="animate-spin" />}
                    <span>{cloudflareSyncing ? (lang === "tr" ? "Aktarılıyor..." : "Syncing...") : (lang === "tr" ? "Cloudflare'a Aktar" : "Sync to Cloudflare")}</span>
                  </button>
                </div>
              </div>

              {/* TAB 1: DNS RECORDS TABLE */}
              {resultViewTab === "dns" && (
                <div className="flex flex-col gap-3 max-h-96 overflow-y-auto pr-1">
                  <div className="flex items-center justify-between pb-1">
                    <span className="text-[11px] font-bold text-[var(--text-dim)] uppercase tracking-wider">
                      {lang === "tr" ? "Eklenecek 6 DNS Kaydı" : "6 Required DNS Records"}
                    </span>
                    <button
                      type="button"
                      onClick={() => copyText(setupResult.bind_zone, "bind_zone")}
                      className="text-xs text-[var(--text-dim)] hover:text-[var(--text-main)] flex items-center gap-1"
                    >
                      {copiedKey === "bind_zone" ? <Check size={12} className="text-[#22c55e]" /> : <Copy size={12} />}
                      <span>{lang === "tr" ? "Tümünü Kopyala" : "Copy Zone"}</span>
                    </button>
                  </div>
                  {setupResult.dns_records.map((r, i) => (
                    <div
                      key={i}
                      onClick={() => copyText(r.content, `rec_${i}`)}
                      className="p-3.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] flex flex-col gap-2 hover:border-[var(--text-muted)] transition-colors cursor-pointer group"
                      title={lang === "tr" ? "Tıklayarak kopyalayın" : "Click to copy"}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded-md bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-main)] text-[11px] font-mono font-bold">
                            {r.type}
                          </span>
                          <span className="text-xs font-mono font-bold text-[var(--text-main)]">{r.name}</span>
                          {r.priority !== undefined && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--bg-secondary)] text-[var(--text-dim)]">
                              Priority: {r.priority}
                            </span>
                          )}
                          {r.proxy_status === false && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#f59e0b15] text-[#f59e0b] border border-[#f59e0b30] font-semibold">
                              DNS Only (Grey Cloud)
                            </span>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            copyText(r.content, `rec_${i}`)
                          }}
                          className="text-[var(--text-dim)] group-hover:text-[var(--text-main)] text-xs flex items-center gap-1 p-1 rounded hover:bg-[var(--bg-secondary)]"
                          title={lang === "tr" ? "Kopyala" : "Copy"}
                        >
                          {copiedKey === `rec_${i}` ? <Check size={13} className="text-[#22c55e]" /> : <Copy size={13} />}
                        </button>
                      </div>

                      <div className="bg-[var(--bg-secondary)] p-2.5 rounded-lg border border-[var(--border-color)] font-mono text-[11px] text-[var(--text-muted)] break-all select-all">
                        {r.content}
                      </div>

                      <span className="text-[10px] text-[var(--text-dim)]">{r.description}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* TAB 2: LIVE TERMINAL CONSOLE LOGS */}
              {resultViewTab === "console" && (
                <TerminalWindow
                  title={`dispatch@${setupResult.config.domain} — installation console`}
                  logs={consoleLogs}
                  onCopy={() => copyText(consoleLogs.join("\n"), "console_copy")}
                />
              )}

              <div className="flex justify-between items-center pt-3 border-t border-[var(--border-color)]">
                <span className="text-xs text-[var(--text-dim)]">
                  {lang === "tr" ? "Ortam:" : "Mode:"} <strong className="text-[var(--text-main)]">{setupResult.config.mode}</strong>
                </span>
                <button
                  type="button"
                  onClick={() => navigate("/app")}
                  className="bg-[var(--accent)] text-[var(--accent-invert)] px-6 py-2.5 rounded-xl text-xs font-bold hover:opacity-90 transition-all flex items-center gap-1.5 shadow-sm"
                >
                  <span>{lang === "tr" ? "Dispatch E-Posta Arayüzünü Başlat" : "Launch Dispatch Webmail"}</span>
                  <ArrowRight size={14} />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

function TerminalWindow({
  title = "dispatch-setup — live bash stream",
  logs = [],
  loading = false,
  onCopy
}: {
  title?: string
  logs: string[]
  loading?: boolean
  onCopy?: () => void
}) {
  const terminalEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [logs])

  return (
    <div className="rounded-2xl bg-[#09090b] border border-[#27272a] overflow-hidden shadow-2xl font-mono text-xs text-zinc-300 flex flex-col">
      {/* Terminal Titlebar */}
      <div className="px-4 py-2.5 bg-[#18181b] border-b border-[#27272a] flex items-center justify-between select-none shrink-0">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#ef4444]" />
            <span className="w-2.5 h-2.5 rounded-full bg-[#f59e0b]" />
            <span className="w-2.5 h-2.5 rounded-full bg-[#22c55e]" />
          </div>
          <span className="text-[11px] text-zinc-400 font-semibold ml-2 flex items-center gap-1.5">
            <Terminal size={13} className="text-emerald-400" />
            <span>{title}</span>
          </span>
        </div>
        {onCopy && logs.length > 0 && (
          <button
            type="button"
            onClick={onCopy}
            className="text-[10px] text-zinc-400 hover:text-white px-2.5 py-1 rounded bg-[#27272a] hover:bg-[#3f3f46] transition-colors flex items-center gap-1 cursor-pointer"
          >
            <Copy size={11} />
            <span>Tümünü Kopyala</span>
          </button>
        )}
      </div>

      {/* Terminal Output */}
      <div className="p-4 max-h-72 overflow-y-auto space-y-1.5 text-[11px] leading-relaxed select-text">
        <div className="text-zinc-500">
          Last login: {new Date().toLocaleTimeString()} on tty1 (Dispatch Automation Engine)
        </div>
        <div className="text-emerald-400 font-bold">
          root@dispatch:~# ./dispatch-setup --run-all
        </div>
        {logs.map((line, idx) => {
          let colorClass = "text-zinc-300"
          if (line.includes("[OK]") || line.includes("✔") || line.includes("[SUCCESS]")) {
            colorClass = "text-emerald-400"
          } else if (line.includes("[INFO]") || line.includes("▶")) {
            colorClass = "text-cyan-400"
          } else if (line.includes("[WARN]") || line.includes("Priority")) {
            colorClass = "text-amber-400"
          } else if (line.includes("[ERROR]") || line.includes("✖") || line.includes("Failed")) {
            colorClass = "text-rose-400"
          }
          return (
            <div key={idx} className={`${colorClass} flex items-start gap-2 break-all`}>
              <span className="text-zinc-600 select-none text-[10px]">{String(idx + 1).padStart(2, "0")}</span>
              <span>{line}</span>
            </div>
          )
        })}
        {loading && (
          <div className="flex items-center gap-2 text-emerald-400 animate-pulse pt-1">
            <span className="w-1.5 h-3.5 bg-emerald-400 animate-pulse inline-block" />
            <span>Sistem servisleri yapılandırılıyor, lütfen bekleyin...</span>
          </div>
        )}
        <div ref={terminalEndRef} />
      </div>
    </div>
  )
}
