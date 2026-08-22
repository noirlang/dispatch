import { Link, Navigate } from "react-router-dom"
import { useAuth } from "../../store/auth"
import { useAppStore } from "../../store/themeAndLocale"
import { motion } from "framer-motion"
import {
  Mail,
  Calendar,
  Shield,
  ArrowRight,
  Sun,
  Moon,
  Laptop,
  Sparkles
} from "lucide-react"

export default function LandingView() {
  const { token } = useAuth()
  const { theme, setTheme, lang, setLang } = useAppStore()

  // If user is already logged in, redirect directly to the app
  if (token) {
    return <Navigate to="/app" replace />
  }

  const nextTheme = theme === "dark" ? "light" : theme === "light" ? "system" : "dark"

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-main)] flex flex-col selection:bg-[var(--accent)] selection:text-[var(--accent-invert)]">
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
            className="w-8 h-8 rounded-full flex items-center justify-center border border-[var(--border-color)] bg-[var(--bg-primary)] text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors shadow-xs"
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

          <Link
            to="/register"
            className="px-5 py-2 rounded-xl text-xs font-bold bg-[var(--accent)] text-[var(--accent-invert)] hover:opacity-90 transition-all shadow-sm flex items-center gap-1"
          >
            <span>{lang === "tr" ? "Kayıt Ol" : "Get Started"}</span>
            <ArrowRight size={13} />
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-20 max-w-5xl mx-auto text-center">
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[var(--bg-secondary)] border border-[var(--border-color)] text-xs font-medium mb-6 text-[var(--text-muted)] shadow-xs"
        >
          <Sparkles size={13} className="text-[#f59e0b]" />
          <span>{lang === "tr" ? "Akıllı & Güvenli E-Posta İstemcisi" : "Intelligent Self-Hosted Email Client"}</span>
        </motion.div>

        {/* Main Title */}
        <motion.h1
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-4xl sm:text-6xl font-extrabold tracking-tight max-w-3xl leading-tight mb-6"
        >
          {lang === "tr"
            ? "E-postanızı Yapay Zeka ve Gizlilikle Yeniden Keşfedin."
            : "Reimagine Your Email with AI and Privacy."}
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-sm sm:text-base text-[var(--text-muted)] max-w-2xl leading-relaxed mb-10"
        >
          {lang === "tr"
            ? "Thunderbird sadeliği, onay kuyruğu ile spam engelleme, dikey takvim, dahili RSS okuyucu ve casus piksel kalkanı tek bir minimalist uygulamada."
            : "Minimalist email client with sender approval queues, vertical calendar agenda, in-app RSS reader, and spy pixel tracker shield."}
        </motion.p>

        {/* CTA Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="flex flex-wrap items-center justify-center gap-4 mb-20"
        >
          <Link
            to="/register"
            className="px-8 py-3.5 rounded-2xl bg-[var(--accent)] text-[var(--accent-invert)] font-extrabold text-sm hover:opacity-90 transition-all shadow-lg flex items-center gap-2"
          >
            <span>{lang === "tr" ? "Hemen Başla (Ücretsiz)" : "Start Free Now"}</span>
            <ArrowRight size={16} />
          </Link>
          <Link
            to="/login"
            className="px-7 py-3.5 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-secondary)] hover:bg-[var(--bg-card)] font-bold text-sm transition-all shadow-xs"
          >
            {lang === "tr" ? "Hesabıma Giriş Yap" : "Sign In to Mailbox"}
          </Link>
        </motion.div>

        {/* Feature Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full text-left">
          {/* Feature 1 */}
          <div className="p-6 rounded-3xl bg-[var(--bg-secondary)] border border-[var(--border-color)] shadow-xs flex flex-col gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[var(--bg-primary)] border border-[var(--border-color)] flex items-center justify-center">
              <Mail size={18} className="text-[#3b82f6]" />
            </div>
            <h3 className="text-base font-bold">{lang === "tr" ? "Onay Kuyruğu & Gizlilik" : "Approval Queue & Privacy"}</h3>
            <p className="text-xs text-[var(--text-muted)] leading-relaxed">
              {lang === "tr"
                ? "Tanımadığınız kişilerden gelen mailler önce Onay klasörüne düşer. Siz onaylamadıkça gelen kutunuz temiz kalır."
                : "New senders land in the Approvals queue. Your primary inbox stays pristine and spam-free."}
            </p>
          </div>

          {/* Feature 2 */}
          <div className="p-6 rounded-3xl bg-[var(--bg-secondary)] border border-[var(--border-color)] shadow-xs flex flex-col gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[var(--bg-primary)] border border-[var(--border-color)] flex items-center justify-center">
              <Calendar size={18} className="text-[#22c55e]" />
            </div>
            <h3 className="text-base font-bold">{lang === "tr" ? "Dikey Akan Takvim" : "Vertical Agenda Calendar"}</h3>
            <p className="text-xs text-[var(--text-muted)] leading-relaxed">
              {lang === "tr"
                ? "Klasik karmaşık takvim kutuları yerine dikey, akıcı ve maillerden otomatik toplantı oluşturan akıllı takvim."
                : "Smooth vertical scrolling agenda. Add, edit, and auto-extract events directly from inbound emails."}
            </p>
          </div>

          {/* Feature 3 */}
          <div className="p-6 rounded-3xl bg-[var(--bg-secondary)] border border-[var(--border-color)] shadow-xs flex flex-col gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[var(--bg-primary)] border border-[var(--border-color)] flex items-center justify-center">
              <Shield size={18} className="text-[#ef4444]" />
            </div>
            <h3 className="text-base font-bold">{lang === "tr" ? "Casus Piksel Kalkanı" : "Spy Pixel Shield"}</h3>
            <p className="text-xs text-[var(--text-muted)] leading-relaxed">
              {lang === "tr"
                ? "İzleyici pikselleri ve tracker domainleri sunucu proxy'sinde engellenir. IP adresiniz dışarı sızmaz."
                : "Live tracker domain sync with uBlock Origin. Email trackers cannot log your IP or location."}
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[var(--border-color)] bg-[var(--bg-secondary)] py-6 px-8 flex items-center justify-between text-xs text-[var(--text-dim)]">
        <span>Dispatch © 2026. Self-hosted modern email client.</span>
        <img src="/sirket.png" alt="Şirket" className="h-5 w-auto object-contain opacity-80 hover:opacity-100 transition-opacity" />
      </footer>
    </div>
  )
}
