import { useState } from "react"
import { useAuth } from "../../store/auth"
import { useNavigate, Link } from "react-router-dom"

export default function Login() {
  const [form, setForm] = useState({ email: "melih@dispatch.local", password: "Test1234!" })
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setLoading(true)
    try {
      await login(form.email, form.password)
      navigate("/")
    } catch {
      setError("Invalid email or password")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="h-screen w-screen flex flex-col items-center justify-center bg-[var(--bg-primary)] text-[var(--text-main)] p-6">
      {/* Brand */}
      <div className="flex items-center gap-2.5 mb-8">
        <div className="w-3.5 h-3.5 rounded-full bg-[var(--accent)]" />
        <span className="text-2xl font-bold tracking-tight">Dispatch</span>
      </div>

      <div className="w-full max-w-sm p-8 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-color)] shadow-xl flex flex-col">
        <h2 className="text-lg font-bold mb-1">Sign In to Mailbox</h2>
        <p className="text-xs text-[var(--text-muted)] mb-6">Enter your local or domain account credentials</p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="text-xs font-semibold text-[var(--text-muted)] block mb-1.5">Email</label>
            <input
              type="email"
              placeholder="user@dispatch.local"
              value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-main)] px-4 py-2.5 rounded-xl text-xs focus:outline-none focus:border-[var(--text-main)]"
              required
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-[var(--text-muted)] block mb-1.5">Password</label>
            <input
              type="password"
              placeholder="••••••••"
              value={form.password}
              onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
              className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-main)] px-4 py-2.5 rounded-xl text-xs focus:outline-none focus:border-[var(--text-main)]"
              required
            />
          </div>

          {error && <p className="text-[#ef4444] text-xs text-center">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 bg-[var(--accent)] text-[var(--accent-invert)] py-2.5 rounded-xl text-xs font-bold hover:opacity-90 transition-all shadow-sm disabled:opacity-50"
          >
            {loading ? "Signing In..." : "Sign In"}
          </button>
        </form>

        <div className="mt-6 pt-4 border-t border-[var(--border-color)] flex items-center justify-between text-xs text-[var(--text-muted)]">
          <span>Need an account?</span>
          <Link to="/register" className="text-[var(--text-main)] font-semibold hover:underline">
            Register
          </Link>
        </div>
      </div>
    </div>
  )
}
