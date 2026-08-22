import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useAuth } from "../../store/auth"
import { useNavigate } from "react-router-dom"

const steps = ["name", "email", "password"] as const
type Step = typeof steps[number]

export default function Register() {
  const [step, setStep] = useState<Step>("name")
  const [form, setForm] = useState({ name: "", email: "", password: "" })
  const [error, setError] = useState("")
  const { register } = useAuth()
  const navigate = useNavigate()

  const stepIdx = steps.indexOf(step)

  const labels: Record<Step, string> = {
    name:     "What's your name?",
    email:    "Your email address",
    password: "Choose a password",
  }

  const placeholders: Record<Step, string> = {
    name:     "Full name",
    email:    "you@dispatch.local",
    password: "Min 8 characters",
  }

  async function handleNext(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    if (step !== "password") {
      const next = steps[stepIdx + 1]
      setStep(next)
      return
    }
    try {
      await register(form.name, form.email, form.password)
      navigate("/")
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Registration failed")
    }
  }

  return (
    <div className="h-screen flex flex-col items-center justify-center bg-[#0a0a0a]">
      {/* Progress dots */}
      <div className="flex gap-2 mb-12">
        {steps.map((s, i) => (
          <div
            key={s}
            className={`h-1 w-8 rounded-full transition-all ${
              i <= stepIdx ? "bg-white" : "bg-[#222]"
            }`}
          />
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.form
          key={step}
          onSubmit={handleNext}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.2 }}
          className="w-full max-w-md px-6 flex flex-col items-center gap-6"
        >
          <h1 className="text-3xl font-light text-white">{labels[step]}</h1>

          <input
            autoFocus
            type={step === "password" ? "password" : step === "email" ? "email" : "text"}
            placeholder={placeholders[step]}
            value={form[step]}
            onChange={e => setForm(f => ({ ...f, [step]: e.target.value }))}
            required
            minLength={step === "password" ? 8 : 1}
            className="w-full bg-transparent border-b border-[#333] text-white text-xl py-3 text-center
              placeholder-[#444] focus:outline-none focus:border-white transition-colors"
          />

          {error && <p className="text-[#ff4444] text-sm">{error}</p>}

          <button
            type="submit"
            className="mt-4 bg-white text-black px-8 py-2 rounded-full font-medium
              hover:bg-[#e0e0e0] transition-colors"
          >
            {step === "password" ? "Create Account" : "Continue →"}
          </button>

          {stepIdx > 0 && (
            <button
              type="button"
              onClick={() => setStep(steps[stepIdx - 1])}
              className="text-[#555] text-sm hover:text-white transition-colors"
            >
              ← Back
            </button>
          )}
        </motion.form>
      </AnimatePresence>

      <p className="mt-16 text-[#444] text-sm">
        Already have an account?{" "}
        <a href="/login" className="text-white hover:underline">Sign in</a>
      </p>
    </div>
  )
}
