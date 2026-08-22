import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useAuth } from "../../store/auth"
import { useAppStore } from "../../store/themeAndLocale"
import { useNavigate, Link } from "react-router-dom"
import { ArrowLeft } from "lucide-react"

const steps = ["name", "email", "password"] as const
type Step = typeof steps[number]

export default function Register() {
  const [step, setStep] = useState<Step>("name")
  const [form, setForm] = useState({ name: "", email: "", password: "" })
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const { register } = useAuth()
  const { lang, setLang } = useAppStore()
  const navigate = useNavigate()

  const stepIdx = steps.indexOf(step)

  const labelsTR: Record<Step, string> = {
    name: "Adınız ve Soyadınız?",
    email: "E-posta adresinizi belirleyin",
    password: "Güçlü bir şifre oluşturun",
  }

  const labelsEN: Record<Step, string> = {
    name: "What's your full name?",
    email: "Choose your email address",
    password: "Create a secure password",
  }

  const placeholdersTR: Record<Step, string> = {
    name: "örn: Ahmet Yılmaz",
    email: "kullanici@dispatch.local",
    password: "En az 8 karakter",
  }

  const placeholdersEN: Record<Step, string> = {
    name: "e.g. John Doe",
    email: "username@dispatch.local",
    password: "Min 8 characters",
  }

  const labels = lang === "tr" ? labelsTR : labelsEN
  const placeholders = lang === "tr" ? placeholdersTR : placeholdersEN

  async function handleNext(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    if (step !== "password") {
      const next = steps[stepIdx + 1]
      setStep(next)
      return
    }
    setLoading(true)
    try {
      await register(form.name, form.email, form.password)
      navigate("/app")
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Registration failed")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="h-screen w-screen flex flex-col items-center justify-center bg-[var(--bg-primary)] text-[var(--text-main)] p-6 relative">
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

      {/* Progress Indicator */}
      <div className="flex gap-2 mb-12">
        {steps.map((s, i) => (
          <div
            key={s}
            className={`h-1.5 w-10 rounded-full transition-all ${
              i <= stepIdx ? "bg-[var(--accent)]" : "bg-[var(--border-color)]"
            }`}
          />
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.form
          key={step}
          onSubmit={handleNext}
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -15 }}
          transition={{ duration: 0.15 }}
          className="w-full max-w-md p-8 rounded-3xl bg-[var(--bg-secondary)] border border-[var(--border-color)] shadow-2xl flex flex-col items-center gap-6"
        >
          <h1 className="text-2xl font-bold text-center text-[var(--text-main)]">
            {labels[step]}
          </h1>

          <input
            autoFocus
            type={step === "password" ? "password" : step === "email" ? "email" : "text"}
            placeholder={placeholders[step]}
            value={form[step]}
            onChange={e => setForm(f => ({ ...f, [step]: e.target.value }))}
            required
            minLength={step === "password" ? 8 : 1}
            className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-main)] text-base px-4 py-3 rounded-xl text-center focus:outline-none focus:border-[var(--text-main)] transition-colors font-medium"
          />

          {error && <p className="text-[#ef4444] text-xs font-medium">{error}</p>}

          <div className="flex items-center gap-3 w-full justify-between mt-2">
            {stepIdx > 0 ? (
              <button
                type="button"
                onClick={() => setStep(steps[stepIdx - 1])}
                className="text-xs font-semibold text-[var(--text-muted)] hover:text-[var(--text-main)]"
              >
                {lang === "tr" ? "← Geri" : "← Back"}
              </button>
            ) : <div />}

            <button
              type="submit"
              disabled={loading}
              className="bg-[var(--accent)] text-[var(--accent-invert)] px-6 py-2.5 rounded-xl text-xs font-bold hover:opacity-90 transition-all shadow-sm disabled:opacity-50"
            >
              {loading
                ? (lang === "tr" ? "Oluşturuluyor..." : "Creating...")
                : step === "password"
                ? (lang === "tr" ? "Hesap Oluştur" : "Create Account")
                : (lang === "tr" ? "Devam Et →" : "Continue →")}
            </button>
          </div>
        </motion.form>
      </AnimatePresence>

      <p className="mt-12 text-xs text-[var(--text-muted)]">
        {lang === "tr" ? "Zaten hesabınız var mı?" : "Already registered?"}{" "}
        <Link to="/login" className="text-[var(--text-main)] font-semibold hover:underline">
          {lang === "tr" ? "Giriş Yap" : "Sign In"}
        </Link>
      </p>
    </div>
  )
}
