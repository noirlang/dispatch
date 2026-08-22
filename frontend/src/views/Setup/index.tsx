import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { api } from "../../lib/api"
import { useAuth } from "../../store/auth"
import { useNavigate } from "react-router-dom"
import { Check, Copy, Server, Shield, ArrowRight, ArrowLeft } from "lucide-react"

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
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [copiedKey, setCopiedKey] = useState<string | null>(null)

  // Form State
  const [domain, setDomain] = useState("dispatch.local")
  const [mailSubdomain, setMailSubdomain] = useState("mail")
  const [mode, setMode] = useState<"local_development" | "production">("local_development")
  const [ipv4, setIpv4] = useState("127.0.0.1")
  const [enableIpv6, setEnableIpv6] = useState(false)
  const [ipv6, setIpv6] = useState("")

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
    api.get<{ domain: string; mail_subdomain: string; ipv4: string; mode: string; detected_ip: string }>("/setup/status")
      .then(res => {
        if (res.domain) setDomain(res.domain)
        if (res.mail_subdomain) setMailSubdomain(res.mail_subdomain)
        if (res.detected_ip && res.detected_ip !== "127.0.0.1") setIpv4(res.detected_ip)
        if (res.mode === "production" || res.mode === "local_development") setMode(res.mode as any)
      })
      .catch(() => {})
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
        enable_ipv6: enableIpv6,
        ipv6: enableIpv6 ? ipv6 : undefined,
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
      setError(err.message || "Failed to configure server")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col items-center justify-center p-6">
      {/* Top Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#161616] border border-[#222] text-xs text-[#888] mb-3">
          <Server size={13} className="text-white" />
          <span>Dispatch Mail Server Setup Wizard</span>
        </div>
        <h1 className="text-3xl font-light tracking-tight">System Configuration</h1>
        <p className="text-[#666] text-sm mt-1">Configure Postfix, Dovecot, and Cloudflare DNS records</p>
      </div>

      {/* Step Indicators */}
      <div className="flex items-center gap-3 mb-8">
        {[
          { num: 1, label: "Environment" },
          { num: 2, label: "Network & IP" },
          { num: 3, label: "Admin User" },
          { num: 4, label: "DNS / Cloudflare" }
        ].map(s => (
          <div key={s.num} className="flex items-center gap-2">
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium transition-all ${
                step === s.num
                  ? "bg-white text-black font-semibold"
                  : step > s.num
                  ? "bg-[#222] text-white"
                  : "bg-[#111] text-[#444] border border-[#222]"
              }`}
            >
              {step > s.num ? <Check size={13} /> : s.num}
            </div>
            <span className={`text-xs hidden sm:inline ${step === s.num ? "text-white" : "text-[#555]"}`}>
              {s.label}
            </span>
            {s.num < 4 && <div className="w-4 h-px bg-[#222]" />}
          </div>
        ))}
      </div>

      {/* Main Wizard Card */}
      <div className="w-full max-w-2xl bg-[#111] border border-[#1f1f1f] rounded-xl p-8 shadow-2xl">
        {error && (
          <div className="mb-6 p-3 rounded-lg bg-[#ff444415] border border-[#ff444430] text-[#ff4444] text-xs">
            {error}
          </div>
        )}

        <AnimatePresence mode="wait">
          {/* STEP 1: Environment & Domain */}
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex flex-col gap-6"
            >
              <div>
                <h2 className="text-lg font-medium">Deployment Mode & Domain</h2>
                <p className="text-xs text-[#666] mt-0.5">Select local testing or a real registered domain for production.</p>
              </div>

              {/* Mode Toggle */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setMode("local_development")
                    setDomain("dispatch.local")
                    setIpv4("127.0.0.1")
                  }}
                  className={`p-4 rounded-lg border text-left flex flex-col gap-1 transition-all ${
                    mode === "local_development"
                      ? "border-white bg-[#1a1a1a]"
                      : "border-[#222] bg-[#0d0d0d] text-[#666] hover:border-[#333]"
                  }`}
                >
                  <span className="text-sm font-medium text-white">Local Development</span>
                  <span className="text-xs text-[#666]">Offline Docker test stack without real domain verification.</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setMode("production")
                    if (domain === "dispatch.local") setDomain("example.com")
                  }}
                  className={`p-4 rounded-lg border text-left flex flex-col gap-1 transition-all ${
                    mode === "production"
                      ? "border-white bg-[#1a1a1a]"
                      : "border-[#222] bg-[#0d0d0d] text-[#666] hover:border-[#333]"
                  }`}
                >
                  <span className="text-sm font-medium text-white">Production Server</span>
                  <span className="text-xs text-[#666]">Real VPS with public static IP and Cloudflare DNS management.</span>
                </button>
              </div>

              {/* Domain inputs */}
              <div className="flex flex-col gap-4">
                <div>
                  <label className="text-xs text-[#888] block mb-1.5">Root Domain</label>
                  <input
                    type="text"
                    value={domain}
                    onChange={e => setDomain(e.target.value)}
                    placeholder="e.g. yourdomain.com or dispatch.local"
                    className="w-full bg-[#0a0a0a] border border-[#222] text-white text-sm px-4 py-2.5 rounded-lg focus:outline-none focus:border-white transition-colors"
                  />
                </div>

                <div>
                  <label className="text-xs text-[#888] block mb-1.5">Mail Subdomain (Hostname)</label>
                  <div className="flex items-center">
                    <input
                      type="text"
                      value={mailSubdomain}
                      onChange={e => setMailSubdomain(e.target.value)}
                      placeholder="mail"
                      className="w-36 bg-[#0a0a0a] border border-[#222] text-white text-sm px-4 py-2.5 rounded-l-lg focus:outline-none focus:border-white transition-colors"
                    />
                    <div className="bg-[#161616] border border-l-0 border-[#222] px-4 py-2.5 rounded-r-lg text-xs text-[#666]">
                      .{domain}
                    </div>
                  </div>
                  <span className="text-[11px] text-[#555] mt-1 block">Full mail host: {mailSubdomain}.{domain}</span>
                </div>
              </div>

              <div className="flex justify-end mt-4">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="bg-white text-black px-6 py-2 rounded-lg text-xs font-medium flex items-center gap-1.5 hover:bg-[#e0e0e0] transition-colors"
                >
                  <span>Next: Network</span>
                  <ArrowRight size={13} />
                </button>
              </div>
            </motion.div>
          )}

          {/* STEP 2: Network & IPv4 / IPv6 */}
          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex flex-col gap-6"
            >
              <div>
                <h2 className="text-lg font-medium">Server Networking & IP Addresses</h2>
                <p className="text-xs text-[#666] mt-0.5">Specify server IP addresses for SPF and A/AAAA records.</p>
              </div>

              <div className="flex flex-col gap-4">
                <div>
                  <label className="text-xs text-[#888] block mb-1.5">Server IPv4 Address</label>
                  <input
                    type="text"
                    value={ipv4}
                    onChange={e => setIpv4(e.target.value)}
                    placeholder="e.g. 198.51.100.1 or 127.0.0.1"
                    className="w-full bg-[#0a0a0a] border border-[#222] text-white text-sm px-4 py-2.5 rounded-lg focus:outline-none focus:border-white transition-colors"
                  />
                  <span className="text-[11px] text-[#555] mt-1 block">This IP will be used in the 'A' record and SPF whitelist.</span>
                </div>

                {/* IPv6 Checkbox */}
                <div className="pt-2 border-t border-[#1a1a1a]">
                  <label className="flex items-center gap-2.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={enableIpv6}
                      onChange={e => setEnableIpv6(e.target.checked)}
                      className="w-4 h-4 rounded border-[#333] bg-[#0a0a0a] accent-white"
                    />
                    <span className="text-xs font-medium text-white">Enable IPv6 support (optional)</span>
                  </label>
                  <span className="text-[11px] text-[#555] mt-0.5 ml-6 block">
                    If your VPS does not have a static IPv6 assigned, keep this unchecked.
                  </span>
                </div>

                {enableIpv6 && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="flex flex-col gap-1.5 pl-6"
                  >
                    <label className="text-xs text-[#888]">Server IPv6 Address</label>
                    <input
                      type="text"
                      value={ipv6}
                      onChange={e => setIpv6(e.target.value)}
                      placeholder="e.g. 2001:db8::1"
                      className="w-full bg-[#0a0a0a] border border-[#222] text-white text-sm px-4 py-2.5 rounded-lg focus:outline-none focus:border-white transition-colors"
                    />
                  </motion.div>
                )}
              </div>

              <div className="flex justify-between mt-4">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="text-[#666] hover:text-white text-xs px-4 py-2 flex items-center gap-1.5"
                >
                  <ArrowLeft size={13} />
                  <span>Back</span>
                </button>
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="bg-white text-black px-6 py-2 rounded-lg text-xs font-medium flex items-center gap-1.5 hover:bg-[#e0e0e0] transition-colors"
                >
                  <span>Next: Admin Account</span>
                  <ArrowRight size={13} />
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
                <h2 className="text-lg font-medium">Initial Administrator Account</h2>
                <p className="text-xs text-[#666] mt-0.5">Create your primary mailbox and administrator user.</p>
              </div>

              <div className="flex flex-col gap-4">
                <div>
                  <label className="text-xs text-[#888] block mb-1.5">Full Name</label>
                  <input
                    type="text"
                    value={adminName}
                    onChange={e => setAdminName(e.target.value)}
                    placeholder="e.g. System Administrator"
                    className="w-full bg-[#0a0a0a] border border-[#222] text-white text-sm px-4 py-2.5 rounded-lg focus:outline-none focus:border-white transition-colors"
                  />
                </div>

                <div>
                  <label className="text-xs text-[#888] block mb-1.5">Email Address</label>
                  <div className="flex items-center">
                    <input
                      type="text"
                      value={adminEmailPrefix}
                      onChange={e => setAdminEmailPrefix(e.target.value)}
                      placeholder="admin"
                      className="w-40 bg-[#0a0a0a] border border-[#222] text-white text-sm px-4 py-2.5 rounded-l-lg focus:outline-none focus:border-white transition-colors text-right"
                    />
                    <div className="bg-[#161616] border border-l-0 border-[#222] px-4 py-2.5 rounded-r-lg text-xs text-[#888]">
                      @{domain}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-xs text-[#888] block mb-1.5">Password</label>
                  <input
                    type="password"
                    value={adminPassword}
                    onChange={e => setAdminPassword(e.target.value)}
                    placeholder="Strong password"
                    className="w-full bg-[#0a0a0a] border border-[#222] text-white text-sm px-4 py-2.5 rounded-lg focus:outline-none focus:border-white transition-colors"
                  />
                </div>
              </div>

              <div className="flex justify-between mt-4">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="text-[#666] hover:text-white text-xs px-4 py-2 flex items-center gap-1.5"
                >
                  <ArrowLeft size={13} />
                  <span>Back</span>
                </button>
                <button
                  type="button"
                  disabled={loading}
                  onClick={handleFinishSetup}
                  className="bg-white text-black px-6 py-2 rounded-lg text-xs font-medium flex items-center gap-1.5 hover:bg-[#e0e0e0] transition-colors disabled:opacity-50"
                >
                  {loading ? (
                    <span>Configuring server...</span>
                  ) : (
                    <>
                      <span>Generate Cloudflare DNS</span>
                      <ArrowRight size={13} />
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          )}

          {/* STEP 4: DNS / Cloudflare Records */}
          {step === 4 && setupResult && (
            <motion.div
              key="step4"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col gap-6"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-medium flex items-center gap-2">
                    <Shield size={18} className="text-[#44ff88]" />
                    <span>Setup Complete! Cloudflare DNS Records</span>
                  </h2>
                  <p className="text-xs text-[#666] mt-0.5">
                    Add the following records to your Cloudflare DNS dashboard for <strong>{setupResult.config.domain}</strong>.
                  </p>
                </div>
                <button
                  onClick={() => copyText(setupResult.bind_zone, "bind_zone")}
                  className="px-3 py-1.5 rounded-lg bg-[#1a1a1a] hover:bg-[#252525] text-xs text-[#bbb] hover:text-white flex items-center gap-1.5 transition-colors"
                >
                  {copiedKey === "bind_zone" ? <Check size={12} className="text-[#44ff88]" /> : <Copy size={12} />}
                  <span>Copy Zone File</span>
                </button>
              </div>

              {/* Cloudflare Note & Auto Sync */}
              <div className="p-4 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-color)] flex flex-col gap-3 shadow-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#f59e0b] animate-pulse" />
                    <span className="text-xs font-bold text-[var(--text-main)]">Cloudflare Otomatik DNS Eşitleme</span>
                  </div>
                  <span className="text-[10px] text-[var(--text-dim)]">API Token ile 1 Tıkla Ekle</span>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="password"
                    placeholder="Cloudflare API Token (Zone.DNS Edit izinli)"
                    id="cf_token_input"
                    className="flex-1 bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-main)] text-xs px-3.5 py-2.5 rounded-xl focus:outline-none font-mono"
                  />
                  <button
                    type="button"
                    onClick={async () => {
                      const input = document.getElementById("cf_token_input") as HTMLInputElement
                      const token = input?.value
                      if (!token) return alert("Lütfen Cloudflare API Token girin.")
                      try {
                        const btn = document.getElementById("cf_sync_btn")
                        if (btn) btn.innerText = "Aktarılıyor..."
                        const res = await api.post<any>("/setup/cloudflare_sync", {
                          api_token: token,
                          domain: setupResult.config.domain,
                          mail_subdomain: setupResult.config.mail_subdomain,
                          web_subdomain: "dispatch",
                          ipv4: setupResult.config.ipv4
                        })
                        alert(res.message || "Tüm DNS kayıtları Cloudflare'a başarıyla aktarıldı!")
                      } catch (err: any) {
                        alert(err.message || "Cloudflare aktarımı başarısız oldu.")
                      } finally {
                        const btn = document.getElementById("cf_sync_btn")
                        if (btn) btn.innerText = "Cloudflare'a Aktar"
                      }
                    }}
                    id="cf_sync_btn"
                    className="bg-[var(--accent)] text-[var(--accent-invert)] text-xs font-bold px-4 py-2.5 rounded-xl hover:opacity-90 transition-all shrink-0 shadow-xs"
                  >
                    Cloudflare'a Aktar
                  </button>
                </div>
              </div>

              {/* Records Table */}
              <div className="flex flex-col gap-3 max-h-96 overflow-y-auto pr-1">
                {setupResult.dns_records.map((r, i) => (
                  <div
                    key={i}
                    onClick={() => copyText(r.content, `rec_${i}`)}
                    className="p-3.5 rounded-xl bg-[var(--bg-card)] border border-[var(--border-color)] flex flex-col gap-2 hover:border-[var(--text-muted)] transition-colors cursor-pointer group"
                    title="Tıklayarak içeriği kopyalayın"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-md bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-main)] text-[11px] font-mono font-bold">
                          {r.type}
                        </span>
                        <span className="text-xs font-mono font-bold text-[var(--text-main)]">{r.name}</span>
                        {r.priority !== undefined && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--bg-primary)] text-[var(--text-dim)]">
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
                        className="text-[var(--text-dim)] group-hover:text-[var(--text-main)] text-xs flex items-center gap-1 p-1 rounded hover:bg-[var(--bg-primary)]"
                        title="Kopyala"
                      >
                        {copiedKey === `rec_${i}` ? <Check size={13} className="text-[#22c55e]" /> : <Copy size={13} />}
                      </button>
                    </div>

                    <div className="bg-[var(--bg-primary)] p-2.5 rounded-lg border border-[var(--border-color)] font-mono text-[11px] text-[var(--text-muted)] break-all select-all">
                      {r.content}
                    </div>

                    <span className="text-[10px] text-[var(--text-dim)]">{r.description}</span>
                  </div>
                ))}
              </div>

              <div className="flex justify-between items-center pt-3 border-t border-[#1a1a1a]">
                <span className="text-xs text-[#555]">
                  Mode: <span className="text-white">{setupResult.config.mode}</span>
                </span>
                <button
                  type="button"
                  onClick={() => navigate("/")}
                  className="bg-white text-black px-6 py-2.5 rounded-lg text-xs font-medium hover:bg-[#e0e0e0] transition-colors flex items-center gap-1.5"
                >
                  <span>Launch Dispatch Webmail</span>
                  <ArrowRight size={13} />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
