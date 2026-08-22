import { useState, useEffect } from "react"
import { Calendar, Mail, Rss, Settings, LayoutDashboard, Sun, Moon, Laptop, X } from "lucide-react"
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
      <header className="h-14 border-b border-[var(--border-color)] bg-[var(--bg-secondary)] px-6 flex items-center justify-between shrink-0 select-none z-30 shadow-xs">
        {/* Left: Brand with pulse dot */}
        <motion.div
          whileHover={{ scale: 1.05 }}
          className="flex items-center gap-2.5 cursor-pointer"
        >
          <motion.div
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            className="w-2.5 h-2.5 rounded-full bg-[var(--accent)] shadow-xs"
          />
          <span className="font-bold text-sm tracking-wide">Dispatch</span>
        </motion.div>

        {/* Center: Modern Floating Nav Bar / Dock with Spring Morph */}
        <nav className="flex items-center p-1 rounded-2xl bg-[var(--bg-primary)] border border-[var(--border-color)] shadow-sm gap-1">
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

        {/* Right: Circular Flag Language & Theme Switchers */}
        <div className="flex items-center gap-2.5">
          {/* Circular Flags Side-by-Side */}
          <div className="flex items-center gap-1.5 p-1 rounded-full bg-[var(--bg-primary)] border border-[var(--border-color)] shadow-xs">
            {/* Turkish Flag Circle */}
            <motion.button
              whileTap={{ scale: 0.88 }}
              whileHover={{ scale: 1.1 }}
              onClick={() => setLang("tr")}
              className={`w-7 h-7 rounded-full flex items-center justify-center text-sm transition-all select-none overflow-hidden ${
                lang === "tr"
                  ? "ring-2 ring-[var(--text-main)] shadow-md bg-[var(--bg-card)]"
                  : "opacity-40 hover:opacity-100"
              }`}
              title="Türkçe"
            >
              <span className="leading-none select-none pointer-events-none">🇹🇷</span>
            </motion.button>

            {/* UK Flag Circle */}
            <motion.button
              whileTap={{ scale: 0.88 }}
              whileHover={{ scale: 1.1 }}
              onClick={() => setLang("en")}
              className={`w-7 h-7 rounded-full flex items-center justify-center text-sm transition-all select-none overflow-hidden ${
                lang === "en"
                  ? "ring-2 ring-[var(--text-main)] shadow-md bg-[var(--bg-card)]"
                  : "opacity-40 hover:opacity-100"
              }`}
              title="English (UK)"
            >
              <span className="leading-none select-none pointer-events-none">🇬🇧</span>
            </motion.button>
          </div>

          {/* Theme toggle */}
          <motion.button
            whileTap={{ scale: 0.88, rotate: 30 }}
            whileHover={{ scale: 1.08 }}
            onClick={() => setTheme(nextTheme)}
            className="w-8 h-8 rounded-full flex items-center justify-center border border-[var(--border-color)] bg-[var(--bg-primary)] text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-card)] transition-colors shadow-xs"
            title={`Current Theme: ${theme}`}
          >
            {theme === "dark" && <Moon size={14} />}
            {theme === "light" && <Sun size={14} />}
            {theme === "system" && <Laptop size={14} />}
          </motion.button>
        </div>
      </header>

      {/* Main Full-Screen Viewport for Active Panel with Spring Slide */}
      <main className="flex-1 w-full overflow-hidden relative bg-[var(--bg-primary)]">
        <AnimatePresence mode="wait">
          {active === "email" && (
            <motion.div
              key="email"
              initial={{ opacity: 0, y: 8, filter: "blur(4px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, y: -8, filter: "blur(4px)" }}
              transition={{ type: "spring", damping: 28, stiffness: 280 }}
              className="h-full w-full"
            >
              {emailPanel}
            </motion.div>
          )}

          {active === "calendar" && (
            <motion.div
              key="calendar"
              initial={{ opacity: 0, y: 8, filter: "blur(4px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, y: -8, filter: "blur(4px)" }}
              transition={{ type: "spring", damping: 28, stiffness: 280 }}
              className="h-full w-full"
            >
              {calendarPanel}
            </motion.div>
          )}

          {active === "feed" && (
            <motion.div
              key="feed"
              initial={{ opacity: 0, y: 8, filter: "blur(4px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, y: -8, filter: "blur(4px)" }}
              transition={{ type: "spring", damping: 28, stiffness: 280 }}
              className="h-full w-full"
            >
              {feedPanel}
            </motion.div>
          )}

          {active === "dashboard" && (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0, y: 8, filter: "blur(4px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, y: -8, filter: "blur(4px)" }}
              transition={{ type: "spring", damping: 28, stiffness: 280 }}
              className="h-full w-full"
            >
              {dashboardPanel}
            </motion.div>
          )}

          {active === "settings" && (
            <motion.div
              key="settings"
              initial={{ opacity: 0, y: 8, filter: "blur(4px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, y: -8, filter: "blur(4px)" }}
              transition={{ type: "spring", damping: 28, stiffness: 280 }}
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
              initial={{ opacity: 0, y: 40, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: 80, scale: 0.85 }}
              transition={{ type: "spring", damping: 22, stiffness: 300 }}
              className="pointer-events-auto p-4 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-color)] shadow-2xl flex items-center justify-between gap-4 max-w-sm backdrop-blur-md"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-[var(--accent)] text-[var(--accent-invert)] flex items-center justify-center font-bold text-xs shadow-xs">
                  {toast.initials || "📧"}
                </div>
                <div>
                  <div className="text-xs font-bold text-[var(--text-main)] truncate max-w-[200px]">
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
                  className="text-xs text-[var(--text-main)] underline font-bold px-2 py-1"
                >
                  {t("view_mail")}
                </button>
                <button
                  onClick={() => removeToast(toast.id)}
                  className="p-1.5 text-[var(--text-dim)] hover:text-[var(--text-main)] rounded-lg hover:bg-[var(--bg-card)]"
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
    <motion.button
      whileTap={{ scale: 0.94 }}
      whileHover={{ y: -1 }}
      onClick={onClick}
      className={`relative flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium transition-all ${
        active
          ? "bg-[var(--bg-secondary)] text-[var(--text-main)] shadow-sm font-bold border border-[var(--border-color)]"
          : "text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-secondary)]"
      }`}
    >
      {icon}
      <span>{label}</span>
      {active && (
        <motion.div
          layoutId="activeDockIndicator"
          className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-3 h-1 bg-[var(--text-main)] rounded-full"
          transition={{ type: "spring", damping: 25, stiffness: 350 }}
        />
      )}
    </motion.button>
  )
}
