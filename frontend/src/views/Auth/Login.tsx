import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useAuth } from "../../store/auth"
import { useAppStore } from "../../store/themeAndLocale"
import { useNavigate, Link } from "react-router-dom"
import { ArrowLeft, ArrowRight, User as UserIcon } from "lucide-react"
import { api } from "../../lib/api"

const steps = ["email", "password"] as const
type Step = typeof steps[number]

interface CheckedUser {
  exists: boolean
  name?: string
  email?: string
  avatar_path?: string | null
}

export default function Login() {
  const [step, setStep] = useState<Step>("email")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [checkedUser, setCheckedUser] = useState<CheckedUser | null>(null)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const { login } = useAuth()
  const { lang, setLang } = useAppStore()
  const navigate = useNavigate()

  const stepIdx = steps.indexOf(step)

  const labelsTR: Record<Step, string> = {
    email: "E-posta adresiniz nedir?",
    password: "Şifrenizi girin",
  }

  const labelsEN: Record<Step, string> = {
    email: "What's your email address?",
    password: "Enter your password",
  }

  const placeholdersTR: Record<Step, string> = {
    email: "kullanici@dispatch.local",
    password: "••••••••",
  }

  const placeholdersEN: Record<Step, string> = {
    email: "username@dispatch.local",
    password: "••••••••",
  }

  const labels = lang === "tr" ? labelsTR : labelsEN
  const placeholders = lang === "tr" ? placeholdersTR : placeholdersEN

  async function handleNext(e: React.FormEvent) {
    e.preventDefault()
    setError("")

    if (step === "email") {
      const cleanEmail = email.trim().toLowerCase()
      if (!cleanEmail) {
        setError(lang === "tr" ? "Lütfen e-posta adresinizi girin" : "Please enter your email address")
        return
      }

      setLoading(true)
      try {
        const res = await api.post<CheckedUser>("/auth/check_email", { email: cleanEmail })
        if (res.exists) {
          setCheckedUser(res)
          setStep("password")
        } else {
          setError(lang === "tr" ? "Bu e-posta adresine ait bir hesap bulunamadı" : "No account found with this email")
        }
      } catch {
        setError(lang === "tr" ? "Bu e-posta adresine ait bir hesap bulunamadı" : "No account found with this email")
      } finally {
        setLoading(false)
      }
      return
    }

    // Step 2: Password
    if (!password) {
      setError(lang === "tr" ? "Lütfen şifrenizi girin" : "Please enter your password")
      return
    }

    setLoading(true)
    try {
      await login(email.trim().toLowerCase(), password)
      navigate("/app")
    } catch {
      setError(lang === "tr" ? "Geçersiz şifre. Lütfen tekrar deneyin." : "Invalid password. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  function handleBackToEmail() {
    setStep("email")
    setPassword("")
    setError("")
  }

  return (
    <div className="h-screen w-screen flex flex-col items-center justify-center bg-[var(--bg-primary)] text-[var(--text-main)] p-6 relative select-none">
      {/* Top Header Actions */}
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
      <div className="flex items-center gap-2.5 mb-12">
        <div className="w-3.5 h-3.5 rounded-full bg-[var(--accent)]" />
        <span className="text-2xl font-bold tracking-tight">Dispatch</span>
      </div>

      {/* Step Indicators */}
      <div className="flex items-center gap-2 mb-10">
        {steps.map((s, idx) => (
          <div
            key={s}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              idx === stepIdx
                ? "w-8 bg-[var(--accent)]"
                : idx < stepIdx
                ? "w-3 bg-[var(--text-muted)]"
                : "w-3 bg-[var(--border-color)]"
            }`}
          />
        ))}
      </div>

      {/* Main Step Form */}
      <div className="w-full max-w-md">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.2 }}
          >
            {/* Account Card (When in Password Step) */}
            {step === "password" && checkedUser && (
              <div className="flex items-center justify-between p-3 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-color)] mb-6 shadow-xs">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-[var(--bg-card)] border border-[var(--border-color)] flex items-center justify-center font-bold text-xs text-[var(--text-main)]">
                    {checkedUser.name ? checkedUser.name[0]?.toUpperCase() : <UserIcon size={16} />}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-[var(--text-main)]">{checkedUser.name || email}</div>
                    <div className="text-[11px] text-[var(--text-dim)] font-mono">{email}</div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleBackToEmail}
                  className="text-xs text-[var(--text-muted)] hover:text-[var(--text-main)] underline font-medium px-2 py-1"
                >
                  {lang === "tr" ? "Farklı hesap" : "Change"}
                </button>
              </div>
            )}

            <h2 className="text-2xl font-bold mb-2 tracking-tight text-center">
              {labels[step]}
            </h2>
            <p className="text-xs text-[var(--text-muted)] mb-8 text-center">
              {step === "email"
                ? lang === "tr"
                  ? "Devam etmek için sistemde kayıtlı e-posta adresinizi yazın."
                  : "Enter your registered email address to proceed."
                : lang === "tr"
                ? "Hesabınıza erişmek için şifrenizi girin."
                : "Enter your password to access your mailbox."}
            </p>

            <form onSubmit={handleNext} className="flex flex-col gap-4">
              {step === "email" ? (
                <input
                  type="email"
                  autoFocus
                  placeholder={placeholders.email}
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-main)] px-5 py-4 rounded-2xl text-base text-center focus:outline-none focus:border-[var(--text-main)] transition-colors shadow-xs"
                  required
                />
              ) : (
                <input
                  type="password"
                  autoFocus
                  placeholder={placeholders.password}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-main)] px-5 py-4 rounded-2xl text-base text-center focus:outline-none focus:border-[var(--text-main)] transition-colors shadow-xs font-mono"
                  required
                />
              )}

              {error && (
                <motion.p
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-[#ef4444] text-xs text-center font-medium bg-[#ef444415] border border-[#ef444430] p-2.5 rounded-xl"
                >
                  {error}
                </motion.p>
              )}

              <div className="flex items-center gap-3 mt-4">
                {step === "password" && (
                  <button
                    type="button"
                    onClick={handleBackToEmail}
                    className="p-3.5 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-secondary)] hover:bg-[var(--bg-card)] text-[var(--text-main)] transition-colors"
                    title={lang === "tr" ? "Geri" : "Back"}
                  >
                    <ArrowLeft size={16} />
                  </button>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-[var(--accent)] text-[var(--accent-invert)] py-4 rounded-2xl text-sm font-bold hover:opacity-90 transition-all flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
                >
                  <span>
                    {loading
                      ? lang === "tr"
                        ? "Kontrol Ediliyor..."
                        : "Checking..."
                      : step === "email"
                      ? lang === "tr"
                        ? "İlerle"
                        : "Continue"
                      : lang === "tr"
                      ? "Giriş Yap"
                      : "Sign In"}
                  </span>
                  {!loading && <ArrowRight size={16} />}
                </button>
              </div>
            </form>
          </motion.div>
        </AnimatePresence>

        <div className="mt-12 text-center text-xs text-[var(--text-muted)]">
          <span>{lang === "tr" ? "Hesabınız yok mu?" : "Don't have an account?"} </span>
          <Link to="/register" className="text-[var(--text-main)] font-semibold hover:underline">
            {lang === "tr" ? "Kayıt Ol" : "Register"}
          </Link>
        </div>
      </div>
    </div>
  )
}
