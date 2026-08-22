import { useState } from "react"
import { useAuth } from "../../store/auth"
import { useAppStore } from "../../store/themeAndLocale"
import { useNavigate, Link } from "react-router-dom"
import { ArrowLeft } from "lucide-react"

export default function Login() {
  const [form, setForm] = useState({ email: "", password: "" })
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const { lang, setLang } = useAppStore()
  const navigate = useNavigate()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setLoading(true)
    try {
      await login(form.email, form.password)
      navigate("/app")
    } catch {
      setError(lang === "tr" ? "Geçersiz e-posta veya şifre" : "Invalid email or password")
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

      {/* Brand */}
      <div className="flex items-center gap-2.5 mb-8">
        <div className="w-3.5 h-3.5 rounded-full bg-[var(--accent)]" />
        <span className="text-2xl font-bold tracking-tight">Dispatch</span>
      </div>

      <div className="w-full max-w-sm p-8 rounded-3xl bg-[var(--bg-secondary)] border border-[var(--border-color)] shadow-xl flex flex-col">
        <h2 className="text-lg font-bold mb-1">{lang === "tr" ? "Giriş Yap" : "Sign In to Mailbox"}</h2>
        <p className="text-xs text-[var(--text-muted)] mb-6">
          {lang === "tr" ? "E-posta ve şifrenizle giriş yapın" : "Enter your local or domain account credentials"}
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="text-xs font-semibold text-[var(--text-muted)] block mb-1.5">
              {lang === "tr" ? "E-posta Adresi" : "Email"}
            </label>
            <input
              type="email"
              placeholder="kullanici@dispatch.local"
              value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-main)] px-4 py-2.5 rounded-xl text-xs focus:outline-none focus:border-[var(--text-main)]"
              required
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-[var(--text-muted)] block mb-1.5">
              {lang === "tr" ? "Şifre" : "Password"}
            </label>
            <input
              type="password"
              placeholder="••••••••"
              value={form.password}
              onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
              className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-main)] px-4 py-2.5 rounded-xl text-xs focus:outline-none focus:border-[var(--text-main)]"
              required
            />
          </div>

          {error && <p className="text-[#ef4444] text-xs text-center font-medium">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 bg-[var(--accent)] text-[var(--accent-invert)] py-2.5 rounded-xl text-xs font-bold hover:opacity-90 transition-all shadow-sm disabled:opacity-50"
          >
            {loading ? (lang === "tr" ? "Giriş Yapılıyor..." : "Signing In...") : (lang === "tr" ? "Giriş Yap" : "Sign In")}
          </button>
        </form>

        <div className="mt-6 pt-4 border-t border-[var(--border-color)] flex items-center justify-between text-xs text-[var(--text-muted)]">
          <span>{lang === "tr" ? "Hesabınız yok mu?" : "Need an account?"}</span>
          <Link to="/register" className="text-[var(--text-main)] font-semibold hover:underline">
            {lang === "tr" ? "Kayıt Ol" : "Register"}
          </Link>
        </div>
      </div>
    </div>
  )
}
