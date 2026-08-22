import { Link, Navigate } from "react-router-dom"
import { useAuth } from "../../store/auth"
import { useAppStore } from "../../store/themeAndLocale"
import { useQuery } from "@tanstack/react-query"
import { api } from "../../lib/api"
import { motion } from "framer-motion"
import {
  ArrowRight,
  Sun,
  Moon,
  Laptop
} from "lucide-react"

interface RegStatus {
  mode: "public" | "invite_only" | "admin_only"
  allow_registration: boolean
  requires_invite: boolean
}

export default function LandingView() {
  const { token } = useAuth()
  const { theme, setTheme, lang, setLang } = useAppStore()

  const { data: regStatus } = useQuery<RegStatus>({
    queryKey: ["registration-status"],
    queryFn: () => api.get<RegStatus>("/auth/registration_status")
  })

  // If user is already logged in, redirect directly to the app
  if (token) {
    return <Navigate to="/app" replace />
  }

  const mode = regStatus?.mode || "public"
  const isInviteOnly = mode === "invite_only"
  const allowRegistration = regStatus ? regStatus.allow_registration : true

  const nextTheme = theme === "dark" ? "light" : theme === "light" ? "system" : "dark"

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-main)] flex flex-col justify-between selection:bg-[var(--accent)] selection:text-[var(--accent-invert)]">
      {/* Top Navbar */}
      <header className="h-16 border-b border-[var(--border-color)] bg-[var(--bg-secondary)] px-8 flex items-center justify-between sticky top-0 z-50 backdrop-blur-md">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <img src="/dispatch.png" alt="Dispatch" className="h-7 w-auto object-contain" />
        </div>

        {/* Right Actions: Lang, Theme, Login, Register */}
        <div className="flex items-center gap-3">
          {/* Circular Flags */}
          <div className="flex items-center gap-1.5 p-1 rounded-full bg-[var(--bg-primary)] border border-[var(--border-color)] shadow-xs">
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

          {/* Theme Toggle */}
          <button
            onClick={() => setTheme(nextTheme)}
            className="w-8 h-8 rounded-full flex items-center justify-center border border-[var(--border-color)] bg-[var(--bg-primary)] text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors shadow-xs cursor-pointer"
          >
            {theme === "dark" && <Moon size={14} />}
            {theme === "light" && <Sun size={14} />}
            {theme === "system" && <Laptop size={14} />}
          </button>

          <Link
            to="/login"
            className="px-4 py-2 rounded-xl text-xs font-semibold border border-[var(--border-color)] bg-[var(--bg-primary)] hover:bg-[var(--bg-card)] transition-colors shadow-xs"
          >
            {lang === "tr" ? "Giriş Yap" : "Sign In"}
          </Link>

          {allowRegistration && (
            <Link
              to="/register"
              className="px-5 py-2 rounded-xl text-xs font-bold bg-[var(--accent)] text-[var(--accent-invert)] hover:opacity-90 transition-all shadow-sm flex items-center gap-1"
            >
              <span>
                {isInviteOnly
                  ? (lang === "tr" ? "Kayıt Ol (Davet)" : "Register (Invite)")
                  : (lang === "tr" ? "Kayıt Ol" : "Get Started")}
              </span>
              <ArrowRight size={13} />
            </Link>
          )}
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-16 max-w-4xl mx-auto text-center">
        {/* Big Center Dispatch Logo */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="flex justify-center mb-6"
        >
          <img
            src="/dispatch.png"
            alt="Dispatch"
            className="h-20 sm:h-28 w-auto object-contain select-none filter drop-shadow-md"
          />
        </motion.div>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-base sm:text-lg text-[var(--text-muted)] max-w-2xl leading-relaxed mb-10"
        >
          {lang === "tr"
            ? "Yapay zeka destekli akıllı asistan, anında e-posta çevirisi, spam engelleyen onay kuyruğu ve casus izleyici kalkanıyla donatılmış yeni nesil minimalist e-posta deneyimi."
            : "Next-generation minimalist email experience powered by AI assistance, instant email translation, sender approval queues, and spy tracker shield security."}
        </motion.p>

        {/* CTA Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="flex flex-wrap items-center justify-center gap-4"
        >
          {allowRegistration ? (
            <>
              <Link
                to="/register"
                className="px-8 py-3.5 rounded-2xl bg-[var(--accent)] text-[var(--accent-invert)] font-extrabold text-sm hover:opacity-90 transition-all shadow-lg flex items-center gap-2"
              >
                <span>
                  {isInviteOnly
                    ? (lang === "tr" ? "Kayıt Ol (Davet Gerektirir)" : "Register (Invite Required)")
                    : (lang === "tr" ? "Hemen Başla (Kayıt Ol)" : "Start Free (Register)")}
                </span>
                <ArrowRight size={16} />
              </Link>
              <Link
                to="/login"
                className="px-7 py-3.5 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-secondary)] hover:bg-[var(--bg-card)] font-bold text-sm transition-all shadow-xs"
              >
                {lang === "tr" ? "Giriş Yap" : "Sign In"}
              </Link>
            </>
          ) : (
            <Link
              to="/login"
              className="px-8 py-3.5 rounded-2xl bg-[var(--accent)] text-[var(--accent-invert)] font-extrabold text-sm hover:opacity-90 transition-all shadow-lg flex items-center gap-2"
            >
              <span>{lang === "tr" ? "Giriş Yap" : "Sign In"}</span>
              <ArrowRight size={16} />
            </Link>
          )}
        </motion.div>
      </main>

      {/* Footer with Big Centered NoirLang Logo and noirLang © 2026 */}
      <footer className="border-t border-[var(--border-color)] bg-[var(--bg-secondary)] py-8 px-8 flex flex-col items-center justify-center gap-3.5 select-none">
        <a
          href="https://noirlang.tr"
          target="_blank"
          rel="noopener noreferrer"
          title="NoirLang"
          className="transition-transform hover:scale-105"
        >
          <img
            src="/sirket.png"
            alt="NoirLang"
            className="h-10 sm:h-12 w-auto object-contain opacity-90 hover:opacity-100 transition-opacity"
          />
        </a>
        <span className="text-xs text-[var(--text-dim)] font-medium tracking-wide">
          noirLang © 2026
        </span>
      </footer>
    </div>
  )
}
