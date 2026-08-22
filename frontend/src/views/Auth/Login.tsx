import { useState } from "react"
import { useAuth } from "../../store/auth"
import { useNavigate } from "react-router-dom"

export default function Login() {
  const [form, setForm] = useState({ email: "", password: "" })
  const [error, setError] = useState("")
  const { login } = useAuth()
  const navigate = useNavigate()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    try {
      await login(form.email, form.password)
      navigate("/")
    } catch {
      setError("Invalid email or password")
    }
  }

  return (
    <div className="h-screen flex flex-col items-center justify-center bg-[#0a0a0a]">
      <h1 className="text-3xl font-light text-white mb-10">Dispatch</h1>
      <form onSubmit={handleSubmit} className="w-full max-w-xs flex flex-col gap-4">
        <input
          type="email"
          placeholder="Email"
          value={form.email}
          onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
          className="bg-[#111] border border-[#222] text-white px-4 py-3 rounded-lg focus:outline-none focus:border-white transition-colors"
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={form.password}
          onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
          className="bg-[#111] border border-[#222] text-white px-4 py-3 rounded-lg focus:outline-none focus:border-white transition-colors"
          required
        />
        {error && <p className="text-[#ff4444] text-sm text-center">{error}</p>}
        <button
          type="submit"
          className="bg-white text-black py-3 rounded-lg font-medium hover:bg-[#e0e0e0] transition-colors"
        >
          Sign In
        </button>
      </form>
      <p className="mt-8 text-[#444] text-sm">
        No account?{" "}
        <a href="/register" className="text-white hover:underline">Register</a>
      </p>
    </div>
  )
}
