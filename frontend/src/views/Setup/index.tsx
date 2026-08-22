import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { api } from "../../lib/api"
import { useAuth } from "../../store/auth"
import { useAppStore } from "../../store/themeAndLocale"
import { useNavigate, Link } from "react-router-dom"
import { Check, Copy, Server, Shield, ArrowRight, ArrowLeft, Lock, Globe } from "lucide-react"

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

  // Generated DNS result
  const [setupResult, setSetupResult] = useState<SetupResult | null>(null)

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

      setSetupResult(res)
      if (res.token) {
        localStorage.setItem("dispatch_token", res.token)
        await fetchMe()
      }
      setStep(4)
    } catch (err: any) {
      setError(err.message || (lang === "tr" ? "Sunucu yapılandırılamadı" : "Failed to configure server"))
    } finally {
      setLoading(false)
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

      {/* Brand Logo */}
      <div className="text-center mb-6">
        <img src="/dispatch.png" alt="Dispatch" className="h-9 w-auto object-contain mx-auto mb-3" />
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--bg-secondary)] border border-[var(--border-color)] text-xs text-[var(--text-muted)] shadow-xs">
          <Server size={13} className="text-[var(--text-main)]" />
          <span>{lang === "tr" ? "Dispatch E-Posta Sunucusu Kurulum Sihirbazı" : "Dispatch Mail Server Setup Wizard"}</span>
        </div>
      </div>

      {/* Steps Indicator */}
      <div className="flex items-center gap-2 mb-8">
        {[1, 2, 3, 4].map(s => (
          <div
            key={s}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              s === step ? "w-10 bg-[var(--accent)]" : s < step ? "w-4 bg-[var(--text-muted)]" : "w-4 bg-[var(--border-color)]"
            }`}
          />
        ))}
      </div>

      {/* Card Container */}
      <div className="w-full max-w-2xl bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-3xl p-8 shadow-2xl">
        <AnimatePresence mode="wait">
          {/* STEP 1: Domain & Subdomain Configuration */}
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex flex-col gap-6"
            >
              <div>
                <h2 className="text-lg font-bold text-[var(--text-main)]">
                  {lang === "tr" ? "1. Alan Adı ve Subdomain Yapılandırması" : "1. Domain & Subdomain Configuration"}
                </h2>
                <p className="text-xs text-[var(--text-muted)] mt-1">
                  {lang === "tr"
                    ? "Ana sitenizi (Cloudflare Pages vb.) bozmadan Dispatch e-posta ve web arayüzünü bağlayın."
                    : "Configure Dispatch email and webmail without breaking your existing website."}
                </p>
              </div>

              {/* Ultra-Detailed Architecture Guidance Box */}
              <div className="p-4 rounded-2xl bg-[var(--bg-primary)] border border-[var(--border-color)] flex flex-col gap-2.5 text-xs">
                <div className="flex items-center gap-2 font-bold text-[var(--text-main)]">
                  <Globe size={15} className="text-[#3b82f6]" />
                  <span>{lang === "tr" ? "Alan Adı Mimarisi Nasıl Çalışır?" : "How Domain Architecture Works"}</span>
                </div>
                <div className="text-[11px] text-[var(--text-muted)] leading-relaxed space-y-1.5">
                  <p>
                    • <strong>{lang === "tr" ? "Ana Domain (Root / Apex):" : "Root Domain:"}</strong> <code className="text-[var(--text-main)]">{domain}</code> ➔ {lang === "tr" ? "Mevcut web siteniz aynen kalır. E-postalarınız" : "Your existing website stays intact. Email addresses will be"} <strong className="text-[var(--text-main)]">adiniz@{domain}</strong> {lang === "tr" ? "olarak açılır." : "."}
                  </p>
                  <p>
                    • <strong>{lang === "tr" ? "Webmail Subdomain:" : "Webmail Subdomain:"}</strong> <code className="text-[var(--text-main)]">{webSubdomain}.{domain}</code> ➔ {lang === "tr" ? "Dispatch web posta arayüzüne tarayıcıdan girilen adres." : "The URL to access Dispatch webmail."}
                  </p>
                  <p>
                    • <strong>{lang === "tr" ? "Mail Host Subdomain:" : "Mail Host Subdomain:"}</strong> <code className="text-[var(--text-main)]">{mailSubdomain}.{domain}</code> ➔ {lang === "tr" ? "Postfix ve Dovecot'un (Thunderbird, SMTP/IMAP) bağlandığı sunucu hostu." : "Hostname for Postfix and Dovecot (SMTP/IMAP)."}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-semibold text-[var(--text-muted)] block mb-1.5">
                    {lang === "tr" ? "Ana Alan Adı (Root TLD)" : "Root Domain (TLD)"}
                  </label>
                  <input
                    type="text"
                    value={domain}
                    onChange={e => setDomain(e.target.value)}
                    placeholder="noirlang.tr"
                    className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-main)] text-xs px-3.5 py-2.5 rounded-xl focus:outline-none focus:border-[var(--text-main)] font-mono"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-[var(--text-muted)] block mb-1.5">
                    {lang === "tr" ? "Webmail Subdomain" : "Webmail Subdomain"}
                  </label>
                  <input
                    type="text"
                    value={webSubdomain}
                    onChange={e => setWebSubdomain(e.target.value)}
                    placeholder="dispatch"
                    className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-main)] text-xs px-3.5 py-2.5 rounded-xl focus:outline-none focus:border-[var(--text-main)] font-mono"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-[var(--text-muted)] block mb-1.5">
                    {lang === "tr" ? "Mail Host Subdomain" : "Mail Host Subdomain"}
                  </label>
                  <input
                    type="text"
                    value={mailSubdomain}
                    onChange={e => setMailSubdomain(e.target.value)}
                    placeholder="mail"
                    className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-main)] text-xs px-3.5 py-2.5 rounded-xl focus:outline-none focus:border-[var(--text-main)] font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end mt-2">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="bg-[var(--accent)] text-[var(--accent-invert)] px-6 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 hover:opacity-90 transition-all shadow-sm"
                >
                  <span>{lang === "tr" ? "İleri: Sunucu IP & SSL" : "Next: Server IP & SSL"}</span>
                  <ArrowRight size={14} />
                </button>
              </div>
            </motion.div>
          )}

          {/* STEP 2: Server IP & Environment */}
          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex flex-col gap-6"
            >
              <div>
                <h2 className="text-lg font-bold text-[var(--text-main)]">
                  {lang === "tr" ? "2. Sunucu IP Adresi & Çalışma Ortamı" : "2. Server IP & Environment"}
                </h2>
                <p className="text-xs text-[var(--text-muted)] mt-1">
                  {lang === "tr"
                    ? "Dispatch sunucunuzun dış statik IPv4 adresi."
                    : "Public static IPv4 address of your Dispatch server."}
                </p>
              </div>

              <div className="flex flex-col gap-4">
                <div>
                  <label className="text-xs font-semibold text-[var(--text-muted)] block mb-1.5">
                    {lang === "tr" ? "Sunucu Statik IPv4 Adresi" : "Server Static IPv4 Address"}
                  </label>
                  <input
                    type="text"
                    value={ipv4}
                    onChange={e => setIpv4(e.target.value)}
                    placeholder="123.45.67.89"
                    className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-main)] text-xs px-3.5 py-2.5 rounded-xl focus:outline-none focus:border-[var(--text-main)] font-mono"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-[var(--text-muted)] block mb-1.5">
                    {lang === "tr" ? "Çalışma Modu" : "Environment Mode"}
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setMode("production")}
                      className={`p-3.5 rounded-xl border text-left text-xs transition-all ${
                        mode === "production"
                          ? "bg-[var(--bg-card)] border-[var(--text-main)] font-bold text-[var(--text-main)] shadow-xs"
                          : "border-[var(--border-color)] bg-[var(--bg-primary)] text-[var(--text-muted)] opacity-70"
                      }`}
                    >
                      <span className="block font-bold">Production (Canlı Sunucu)</span>
                      <span className="text-[10px] text-[var(--text-dim)] font-normal block mt-0.5">
                        Gerçek DNS, Let's Encrypt SSL ve Postfix
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setMode("local_development")}
                      className={`p-3.5 rounded-xl border text-left text-xs transition-all ${
                        mode === "local_development"
                          ? "bg-[var(--bg-card)] border-[var(--text-main)] font-bold text-[var(--text-main)] shadow-xs"
                          : "border-[var(--border-color)] bg-[var(--bg-primary)] text-[var(--text-muted)] opacity-70"
                      }`}
                    >
                      <span className="block font-bold">Local Development</span>
                      <span className="text-[10px] text-[var(--text-dim)] font-normal block mt-0.5">
                        Lokal test ortamı (dispatch.local)
                      </span>
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex justify-between mt-2">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="text-xs font-semibold text-[var(--text-muted)] hover:text-[var(--text-main)] flex items-center gap-1.5"
                >
                  <ArrowLeft size={14} />
                  <span>{lang === "tr" ? "Geri" : "Back"}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="bg-[var(--accent)] text-[var(--accent-invert)] px-6 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 hover:opacity-90 transition-all shadow-sm"
                >
                  <span>{lang === "tr" ? "İleri: İlk Yönetici Hesabı" : "Next: Admin Account"}</span>
                  <ArrowRight size={14} />
                </button>
              </div>
            </motion.div>
          )}

          {/* STEP 3: Admin Account */}
          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex flex-col gap-6"
            >
              <div>
                <h2 className="text-lg font-bold text-[var(--text-main)]">
                  {lang === "tr" ? "3. İlk Yönetici E-Posta Hesabı" : "3. Initial Administrator Account"}
                </h2>
                <p className="text-xs text-[var(--text-muted)] mt-1">
                  {lang === "tr"
                    ? "Sunucunuzdaki ilk ana posta kutusu ve yönetici kullanıcısını oluşturun."
                    : "Create your primary mailbox and administrator user."}
                </p>
              </div>

              <div className="flex flex-col gap-4">
                <div>
                  <label className="text-xs font-semibold text-[var(--text-muted)] block mb-1.5">
                    {lang === "tr" ? "Adınız ve Soyadınız" : "Full Name"}
                  </label>
                  <input
                    type="text"
                    value={adminName}
                    onChange={e => setAdminName(e.target.value)}
                    placeholder="Melih Emik"
                    className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-main)] text-xs px-3.5 py-2.5 rounded-xl focus:outline-none focus:border-[var(--text-main)]"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-[var(--text-muted)] block mb-1.5">
                    {lang === "tr" ? "E-Posta Adresiniz" : "Email Address"}
                  </label>
                  <div className="flex items-center">
                    <input
                      type="text"
                      value={adminEmailPrefix}
                      onChange={e => setAdminEmailPrefix(e.target.value)}
                      placeholder="admin"
                      className="w-40 bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-main)] text-xs px-3.5 py-2.5 rounded-l-xl focus:outline-none focus:border-[var(--text-main)] text-right font-mono"
                    />
                    <div className="bg-[var(--bg-card)] border border-l-0 border-[var(--border-color)] px-4 py-2.5 rounded-r-xl text-xs font-mono text-[var(--text-muted)] font-bold">
                      @{domain}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-[var(--text-muted)] block mb-1.5">
                    {lang === "tr" ? "Şifre" : "Password"}
                  </label>
                  <input
                    type="password"
                    value={adminPassword}
                    onChange={e => setAdminPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-main)] text-xs px-3.5 py-2.5 rounded-xl focus:outline-none focus:border-[var(--text-main)] font-mono"
                  />
                </div>
              </div>

              {error && (
                <div className="p-3 rounded-xl bg-[#ef444415] border border-[#ef444430] text-[#ef4444] text-xs">
                  {error}
                </div>
              )}

              <div className="flex justify-between mt-2">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="text-xs font-semibold text-[var(--text-muted)] hover:text-[var(--text-main)] flex items-center gap-1.5"
                >
                  <ArrowLeft size={14} />
                  <span>{lang === "tr" ? "Geri" : "Back"}</span>
                </button>
                <button
                  type="button"
                  disabled={loading}
                  onClick={handleFinishSetup}
                  className="bg-[var(--accent)] text-[var(--accent-invert)] px-6 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 hover:opacity-90 transition-all shadow-sm disabled:opacity-50"
                >
                  {loading ? (
                    <span>{lang === "tr" ? "Sunucu Yapılandırılıyor..." : "Configuring server..."}</span>
                  ) : (
                    <>
                      <span>{lang === "tr" ? "DNS Kayıtlarını Üret →" : "Generate DNS Records →"}</span>
                      <ArrowRight size={14} />
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          )}

          {/* STEP 4: DNS / Cloudflare Records Table */}
          {step === 4 && setupResult && (
            <motion.div
              key="step4"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col gap-6"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-[var(--text-main)] flex items-center gap-2">
                    <Shield size={20} className="text-[#22c55e]" />
                    <span>{lang === "tr" ? "Kurulum Tamamlandı! DNS Kayıtları" : "Setup Complete! DNS Records"}</span>
                  </h2>
                  <p className="text-xs text-[var(--text-muted)] mt-0.5">
                    {lang === "tr"
                      ? `${setupResult.config.domain} için Cloudflare DNS tablosuna eklenecek kayıtlar.`
                      : `Records to add to your Cloudflare DNS dashboard for ${setupResult.config.domain}.`}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => copyText(setupResult.bind_zone, "bind_zone")}
                  className="px-3 py-1.5 rounded-xl bg-[var(--bg-primary)] hover:bg-[var(--bg-card)] border border-[var(--border-color)] text-xs text-[var(--text-muted)] hover:text-[var(--text-main)] flex items-center gap-1.5 transition-colors shadow-xs"
                >
                  {copiedKey === "bind_zone" ? <Check size={13} className="text-[#22c55e]" /> : <Copy size={13} />}
                  <span>{lang === "tr" ? "Tümünü Kopyala" : "Copy All"}</span>
                </button>
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
                    onClick={async () => {
                      const input = document.getElementById("cf_token_input") as HTMLInputElement
                      const token = input?.value
                      if (!token) return alert(lang === "tr" ? "Lütfen Cloudflare API Token girin." : "Please enter API token.")
                      try {
                        const btn = document.getElementById("cf_sync_btn")
                        if (btn) btn.innerText = lang === "tr" ? "Aktarılıyor..." : "Syncing..."
                        const res = await api.post<any>("/setup/cloudflare_sync", {
                          api_token: token,
                          domain: setupResult.config.domain,
                          mail_subdomain: setupResult.config.mail_subdomain,
                          web_subdomain: webSubdomain,
                          ipv4: setupResult.config.ipv4
                        })
                        alert(res.message || (lang === "tr" ? "Tüm DNS kayıtları Cloudflare'a başarıyla aktarıldı!" : "Synced successfully!"))
                      } catch (err: any) {
                        alert(err.message || (lang === "tr" ? "Cloudflare aktarımı başarısız oldu." : "Sync failed."))
                      } finally {
                        const btn = document.getElementById("cf_sync_btn")
                        if (btn) btn.innerText = lang === "tr" ? "Cloudflare'a Aktar" : "Sync to Cloudflare"
                      }
                    }}
                    id="cf_sync_btn"
                    className="bg-[var(--accent)] text-[var(--accent-invert)] text-xs font-bold px-4 py-2.5 rounded-xl hover:opacity-90 transition-all shrink-0 shadow-xs"
                  >
                    {lang === "tr" ? "Cloudflare'a Aktar" : "Sync to Cloudflare"}
                  </button>
                </div>
              </div>

              {/* Records Table */}
              <div className="flex flex-col gap-3 max-h-96 overflow-y-auto pr-1">
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
