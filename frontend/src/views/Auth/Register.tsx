import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useAuth } from "../../store/auth"
import { useAppStore } from "../../store/themeAndLocale"
import { useNavigate, Link } from "react-router-dom"
import { ArrowLeft, KeyRound, ShieldAlert } from "lucide-react"
import { api } from "../../lib/api"

export default function Register() {
  const [regMode, setRegMode] = useState<"public" | "admin_only" | "invite_only" | "loading">("loading")
  const [step, setStep] = useState<"invite" | "name" | "email" | "password">("name")
  const [form, setForm] = useState({ invite: "", name: "", email: "", password: "" })
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [serverDomain, setServerDomain] = useState("dispatch.local")
  const { token, register } = useAuth()
  const { lang, setLang } = useAppStore()
  const navigate = useNavigate()

  useEffect(() => {
    if (token) {
      navigate("/app", { replace: true })
    }
    api.get<{ mode?: string; domain?: string }>("/auth/registration_status")
      .then(data => {
        const mode = (data?.mode || "public") as any
        setRegMode(mode)
        if (data?.domain) setServerDomain(data.domain)
        if (mode === "invite_only") {
          setStep("invite")
        } else {
          setStep("name")
        }
      })
      .catch(() => {
        setRegMode("public")
        setStep("name")
      })
  }, [token, navigate])

  const steps = regMode === "invite_only"
    ? (["invite", "name", "email", "password"] as const)
    : (["name", "email", "password"] as const)

  const stepIdx = steps.indexOf(step as any)

  const labelsTR: Record<string, string> = {
    invite: "Davet Kodunuzu Girin",
    name: "Adınız ve Soyadınız?",
    email: "Kullanıcı adınızı belirleyin",
    password: "Güçlü bir şifre oluşturun",
  }

  const labelsEN: Record<string, string> = {
    invite: "Enter Your Invite Code",
    name: "What's your full name?",
    email: "Choose your username",
    password: "Create a secure password",
  }

  const placeholdersTR: Record<string, string> = {
    invite: "INV-XXXXXXXX",
    name: "örn: Ahmet Yılmaz",
    email: "kullanici_adi",
    password: "En az 8 karakter",
  }

  const placeholdersEN: Record<string, string> = {
    invite: "INV-XXXXXXXX",
    name: "e.g. John Doe",
    email: "username",
    password: "Min 8 characters",
  }

  const labels = lang === "tr" ? labelsTR : labelsEN
  const placeholders = lang === "tr" ? placeholdersTR : placeholdersEN

  async function handleNext(e: React.FormEvent) {
    e.preventDefault()
    setError("")

    if (step === "invite") {
      if (!form.invite) {
        setError(lang === "tr" ? "Lütfen bir davet kodu girin." : "Please enter an invite code.")
        return
      }
      setLoading(true)
      try {
        const res = await api.post<{ valid: boolean }>("/auth/verify_invite", { invite_code: form.invite })
        if (res.valid) {
          setStep("name")
        } else {
          setError(lang === "tr" ? "Geçersiz veya süresi dolmuş davet kodu!" : "Invalid invite code!")
        }
      } catch (err: any) {
        setError(err.message || (lang === "tr" ? "Geçersiz veya süresi dolmuş davet kodu!" : "Invalid invite code!"))
      } finally {
        setLoading(false)
      }
      return
    }

    if (step !== "password") {
      const next = steps[stepIdx + 1]
      setStep(next as any)
      return
    }

    setLoading(true)
    try {
      await register(form.name, form.email, form.password, form.invite || undefined)
      navigate("/app")
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Registration failed")
    } finally {
      setLoading(false)
    }
  }

  if (regMode === "loading") {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-[var(--bg-primary)] text-[var(--text-dim)] text-xs">
        Yükleniyor...
      </div>
    )
  }

  if (regMode === "admin_only") {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-[var(--bg-primary)] text-[var(--text-main)] p-6 relative">
        <div className="w-full max-w-md p-8 rounded-3xl bg-[var(--bg-secondary)] border border-[var(--border-color)] shadow-2xl flex flex-col items-center gap-5 text-center">
          <div className="p-3 rounded-2xl bg-[#f59e0b15] text-[#f59e0b] border border-[#f59e0b30]">
            <ShieldAlert size={26} />
          </div>
          <div>
            <h1 className="text-lg font-bold text-[var(--text-main)]">
              {lang === "tr" ? "Açık Kayıtlar Kapalıdır" : "Registrations Closed"}
            </h1>
            <p className="text-xs text-[var(--text-muted)] mt-1.5 leading-relaxed">
              {lang === "tr"
                ? "Bu sunucuda doğrudan hesap oluşturma kapalıdır. Yeni bir e-posta hesabı açmak için lütfen sistem yöneticinizle iletişime geçin."
                : "Public registration is disabled on this server. Please contact your system administrator to get an account."}
            </p>
          </div>

          <Link
            to="/login"
            className="w-full bg-[var(--accent)] text-[var(--accent-invert)] py-3 rounded-xl text-xs font-bold hover:opacity-90 transition-all shadow-sm mt-2"
          >
            {lang === "tr" ? "Giriş Yap Sayfasına Git" : "Go to Sign In"}
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen w-screen flex flex-col items-center justify-center bg-[var(--bg-primary)] text-[var(--text-main)] p-4 sm:p-6 relative font-sans">
      {/* Top Header Actions */}
      <div className="absolute top-4 sm:top-6 left-4 sm:left-6 right-4 sm:right-6 flex items-center justify-between">
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
      <div className="flex items-center gap-2.5 mb-6 sm:mb-8">
        <img src="/dispatch.png" alt="Dispatch" className="h-9 w-auto object-contain" />
      </div>

      {/* Progress Indicator */}
      <div className="flex gap-2 mb-8 sm:mb-10">
        {steps.map((s, i) => (
          <div
            key={s}
            className={`h-1.5 w-8 sm:w-10 rounded-full transition-all ${
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
          className="w-full max-w-sm sm:max-w-md p-5 sm:p-8 rounded-3xl bg-[var(--bg-secondary)] border border-[var(--border-color)] shadow-2xl flex flex-col items-center gap-5 sm:gap-6"
        >
          {step === "invite" && (
            <div className="p-3 rounded-2xl bg-[#3b82f615] text-[#3b82f6] border border-[#3b82f630] -mb-2">
              <KeyRound size={24} />
            </div>
          )}

          <div className="text-center">
            <h1 className="text-lg sm:text-xl font-bold text-center text-[var(--text-main)]">
              {labels[step]}
            </h1>
            {step === "invite" && (
              <p className="text-xs text-[var(--text-muted)] mt-1">
                {lang === "tr"
                  ? "Bu sunucuya kayıt olmak için yöneticiniz tarafından verilen davet kodunu girin."
                  : "Please enter the invite code provided by your administrator."}
              </p>
            )}
          </div>

          {step === "email" ? (
            <div className="w-full relative flex items-center bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-2xl shadow-xs overflow-hidden focus-within:border-[var(--text-main)] transition-colors min-w-0">
              <input
                autoFocus
                type="text"
                placeholder={placeholders.email}
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value.replace(/^@+/, "") }))}
                required
                className="min-w-0 flex-1 w-full bg-transparent text-[var(--text-main)] pl-4 sm:pl-5 pr-2 py-3 sm:py-3.5 text-sm focus:outline-none font-mono"
              />
              <span className="text-[11px] sm:text-xs font-mono font-medium text-[var(--text-dim)] select-none shrink-0 bg-[var(--bg-card)] py-1.5 px-2 sm:px-2.5 rounded-xl mr-2.5 sm:mr-3 border border-[var(--border-color)] truncate max-w-[130px] sm:max-w-none">
                @{serverDomain}
              </span>
            </div>
          ) : (
            <input
              autoFocus
              type={step === "password" ? "password" : "text"}
              placeholder={placeholders[step]}
              value={form[step]}
              onChange={e => setForm(f => ({ ...f, [step]: e.target.value }))}
              required
              minLength={step === "password" ? 8 : 1}
              className={`w-full bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-main)] text-sm sm:text-base px-4 py-3 rounded-xl text-center focus:outline-none focus:border-[var(--text-main)] transition-colors font-medium ${
                step === "invite" ? "font-mono tracking-widest uppercase text-lg" : ""
              }`}
            />
          )}

          {error && <p className="text-[#ef4444] text-xs font-medium text-center">{error}</p>}

          <div className="flex items-center gap-3 w-full justify-between mt-2">
            {stepIdx > 0 ? (
              <button
                type="button"
                onClick={() => setStep(steps[stepIdx - 1] as any)}
                className="text-xs font-semibold text-[var(--text-muted)] hover:text-[var(--text-main)] px-2 py-1"
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
                ? (lang === "tr" ? "Kontrol Ediliyor..." : "Verifying...")
                : step === "password"
                ? (lang === "tr" ? "Hesap Oluştur" : "Create Account")
                : (lang === "tr" ? "Devam Et →" : "Continue →")}
            </button>
          </div>
        </motion.form>
      </AnimatePresence>

      <p className="mt-10 text-xs text-[var(--text-muted)]">
        {lang === "tr" ? "Zaten hesabınız var mı?" : "Already registered?"}{" "}
        <Link to="/login" className="text-[var(--text-main)] font-semibold hover:underline">
          {lang === "tr" ? "Giriş Yap" : "Sign In"}
        </Link>
      </p>
    </div>
  )
}
