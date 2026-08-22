import { useState, useEffect } from "react"
import { Calendar, Mail, Rss, Settings, LayoutDashboard, Sun, Moon, Laptop, Globe, X } from "lucide-react"
import { useAppStore, useT, applyThemeToDOM } from "../../store/themeAndLocale"
import { motion, AnimatePresence } from "framer-motion"

export type Panel = "email" | "calendar" | "feed" | "dashboard" | "settings"

interface Props {
  emailPanel: React.ReactNode
  calendarPanel: React.ReactNode
  feedPanel: React.ReactNode
  dashboardPanel: React.ReactNode
  settingsPanel: React.ReactNode
}

export default function AppLayout({
  emailPanel,
  calendarPanel,
  feedPanel,
  dashboardPanel,
  settingsPanel,
}: Props) {
  const [active, setActive] = useState<Panel>("email")
  const t = useT()
  const { theme, setTheme, lang, setLang, toasts, removeToast } = useAppStore()

  useEffect(() => {
    applyThemeToDOM(theme)
  }, [theme])

  const nextTheme = theme === "dark" ? "light" : theme === "light" ? "system" : "dark"

  return (
    <div className="h-screen w-screen flex flex-col bg-[var(--bg-primary)] text-[var(--text-main)] overflow-hidden">
      {/* Top Header & Floating Center Dock */}
      <header className="h-14 border-b border-[var(--border-color)] bg-[var(--bg-secondary)] px-6 flex items-center justify-between shrink-0 select-none z-30">
        {/* Left: Brand */}
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-[var(--accent)]" />
          <span className="font-bold text-sm tracking-wide">Dispatch</span>
        </div>

        {/* Center: Modern Floating Nav Bar / Dock */}
        <nav className="flex items-center p-1 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] shadow-sm gap-1">
          <DockBtn
            icon={<Mail size={16} />}
            label={t("email")}
            active={active === "email"}
            onClick={() => setActive("email")}
          />
          <DockBtn
            icon={<Calendar size={16} />}
            label={t("calendar")}
            active={active === "calendar"}
            onClick={() => setActive("calendar")}
          />
          <DockBtn
            icon={<Rss size={16} />}
            label={t("feed")}
            active={active === "feed"}
            onClick={() => setActive("feed")}
          />
          <DockBtn
            icon={<LayoutDashboard size={16} />}
            label={t("dashboard")}
            active={active === "dashboard"}
            onClick={() => setActive("dashboard")}
          />
          <DockBtn
            icon={<Settings size={16} />}
            label={t("settings")}
            active={active === "settings"}
            onClick={() => setActive("settings")}
          />
        </nav>

        {/* Right: Theme & Language Switchers */}
        <div className="flex items-center gap-2">
          {/* Language toggle */}
          <button
            onClick={() => setLang(lang === "tr" ? "en" : "tr")}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-[var(--border-color)] bg-[var(--bg-primary)] text-xs font-medium hover:bg-[var(--bg-card)] transition-colors"
            title="Switch Language"
          >
            <Globe size={13} />
            <span className="uppercase">{lang}</span>
          </button>

          {/* Theme toggle */}
          <button
            onClick={() => setTheme(nextTheme)}
            className="p-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-primary)] text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-card)] transition-colors"
            title={`Current Theme: ${theme}`}
          >
            {theme === "dark" && <Moon size={14} />}
            {theme === "light" && <Sun size={14} />}
            {theme === "system" && <Laptop size={14} />}
          </button>
        </div>
      </header>

      {/* Main Full-Screen Viewport for Active Panel */}
      <main className="flex-1 w-full overflow-hidden relative">
        <AnimatePresence mode="wait">
          {active === "email" && (
            <motion.div
              key="email"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.1 }}
              className="h-full w-full"
            >
              {emailPanel}
            </motion.div>
          )}

          {active === "calendar" && (
            <motion.div
              key="calendar"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.1 }}
              className="h-full w-full p-6 max-w-6xl mx-auto"
            >
              {calendarPanel}
            </motion.div>
          )}

          {active === "feed" && (
            <motion.div
              key="feed"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.1 }}
              className="h-full w-full p-6 max-w-5xl mx-auto"
            >
              {feedPanel}
            </motion.div>
          )}

          {active === "dashboard" && (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.1 }}
              className="h-full w-full"
            >
              {dashboardPanel}
            </motion.div>
          )}

          {active === "settings" && (
            <motion.div
              key="settings"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.1 }}
              className="h-full w-full"
            >
              {settingsPanel}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Bottom-Right Incoming Mail Notification Toasts */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 pointer-events-none">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 30, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: 50, scale: 0.9 }}
              className="pointer-events-auto p-4 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] shadow-2xl flex items-center justify-between gap-4 max-w-sm"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-[var(--accent)] text-[var(--accent-invert)] flex items-center justify-center font-bold text-xs">
                  {toast.initials || "📧"}
                </div>
                <div>
                  <div className="text-xs font-semibold text-[var(--text-main)] truncate max-w-[200px]">
                    {toast.from}
                  </div>
                  <div className="text-[11px] text-[var(--text-muted)] truncate max-w-[200px]">
                    {toast.subject}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => {
                    setActive("email")
                    removeToast(toast.id)
                  }}
                  className="text-xs text-[var(--text-main)] underline font-medium px-2 py-1"
                >
                  {t("view_mail")}
                </button>
                <button
                  onClick={() => removeToast(toast.id)}
                  className="p-1 text-[var(--text-dim)] hover:text-[var(--text-main)]"
                >
                  <X size={13} />
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  )
}

function DockBtn({
  icon,
  label,
  active,
  onClick,
}: {
  icon: React.ReactNode
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
        active
          ? "bg-[var(--bg-secondary)] text-[var(--text-main)] shadow-sm font-semibold border border-[var(--border-color)]"
          : "text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-secondary)]"
      }`}
    >
      {icon}
      <span>{label}</span>
    </button>
  )
}
