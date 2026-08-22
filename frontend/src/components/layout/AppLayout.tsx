import { useState, useEffect, useRef } from "react"
import { Calendar, Mail, Rss, Settings, LayoutDashboard, Sun, Moon, Laptop, X, Bell } from "lucide-react"
import { useAppStore, useT, applyThemeToDOM } from "../../store/themeAndLocale"
import { requestNotificationPermission, sendBrowserNotification } from "../../lib/notifications"
import { useQuery } from "@tanstack/react-query"
import { api } from "../../lib/api"
import { motion, AnimatePresence } from "framer-motion"
import SenderAvatar from "../ui/SenderAvatar"

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
  const { theme, setTheme, lang, setLang, toasts, addToast, removeToast } = useAppStore()
  const [notifPermission, setNotifPermission] = useState<NotificationPermission | "unsupported">(
    typeof window !== "undefined" && "Notification" in window ? Notification.permission : "unsupported"
  )

  useEffect(() => {
    applyThemeToDOM(theme)
  }, [theme])

  // Request notification permission smoothly on first user interaction or mount
  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      // Prompt user for notifications
      requestNotificationPermission().then((granted) => {
        setNotifPermission(granted ? "granted" : "denied")
      })
    }
  }, [])

  // Live real-time incoming email watcher & desktop notification trigger
  const knownEmailIds = useRef<Set<number>>(new Set())
  const initialLoaded = useRef(false)

  useQuery({
    queryKey: ["inbox-live-watcher"],
    queryFn: async () => {
      const list = await api.get<any[]>("/emails?folder=inbox")
      if (!initialLoaded.current) {
        list.forEach(e => knownEmailIds.current.add(e.id))
        initialLoaded.current = true
        return list
      }

      list.forEach(e => {
        if (!knownEmailIds.current.has(e.id)) {
          knownEmailIds.current.add(e.id)

          // 1. In-app bottom-right toast
          addToast({
            from: e.sender_name || e.from,
            subject: e.subject || "(No Subject)",
            avatar_url: e.avatar_url,
            initials: e.avatar_initials
          })

          // 2. Native OS/Browser Desktop Notification
          sendBrowserNotification(e.sender_name || e.from, {
            body: `${e.subject || "(No Subject)"}\n${e.body_text?.slice(0, 100) || ""}`,
            tag: `email-${e.id}`,
          })
        }
      })
      return list
    },
    refetchInterval: 3000,
  })

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
        </nav>

        {/* Right: Flag Buttons, Notifications prompt, Theme Toggle, Settings Button */}
        <div className="flex items-center gap-2">
          {/* Notification Permission Prompt if not granted */}
          {notifPermission === "default" && (
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={async () => {
                const granted = await requestNotificationPermission()
                setNotifPermission(granted ? "granted" : "denied")
              }}
              className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#f59e0b15] text-[#f59e0b] border border-[#f59e0b30] text-xs font-semibold hover:bg-[#f59e0b25] transition-colors"
              title="Bildirimlere İzin Ver"
            >
              <Bell size={13} className="animate-bounce" />
              <span>{lang === "tr" ? "Bildirimleri Aç" : "Enable Alerts"}</span>
            </motion.button>
          )}

          {/* Circular Flags */}
          <div className="flex items-center gap-1.5 p-1 rounded-full bg-[var(--bg-primary)] border border-[var(--border-color)] shadow-xs">
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => setLang("tr")}
              className={`w-7 h-7 rounded-full flex items-center justify-center text-sm transition-all select-none ${
                lang === "tr" ? "ring-2 ring-[var(--text-main)] bg-[var(--bg-card)] shadow-xs" : "opacity-40 hover:opacity-100"
              }`}
              title="Türkçe"
            >
              🇹🇷
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => setLang("en")}
              className={`w-7 h-7 rounded-full flex items-center justify-center text-sm transition-all select-none ${
                lang === "en" ? "ring-2 ring-[var(--text-main)] bg-[var(--bg-card)] shadow-xs" : "opacity-40 hover:opacity-100"
              }`}
              title="English (UK)"
            >
              🇬🇧
            </motion.button>
          </div>

          {/* Theme Toggle */}
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => setTheme(nextTheme)}
            className="w-8 h-8 rounded-full flex items-center justify-center border border-[var(--border-color)] bg-[var(--bg-primary)] text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors shadow-xs"
            title={`Tema: ${theme}`}
          >
            {theme === "dark" && <Moon size={14} />}
            {theme === "light" && <Sun size={14} />}
            {theme === "system" && <Laptop size={14} />}
          </motion.button>

          {/* Settings Button */}
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => setActive("settings")}
            className={`w-8 h-8 rounded-full flex items-center justify-center border transition-all shadow-xs ${
              active === "settings"
                ? "bg-[var(--accent)] text-[var(--accent-invert)] border-[var(--accent)] font-bold"
                : "border-[var(--border-color)] bg-[var(--bg-primary)] text-[var(--text-muted)] hover:text-[var(--text-main)]"
            }`}
            title={t("settings")}
          >
            <Settings size={15} />
          </motion.button>
        </div>
      </header>

      {/* Main Full-Size Workspace with Fluid AnimatePresence */}
      <div className="flex-1 overflow-hidden relative">
        <AnimatePresence mode="wait">
          {active === "email" && (
            <motion.div
              key="email"
              initial={{ opacity: 0, scale: 0.985 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.985 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              className="w-full h-full"
            >
              {emailPanel}
            </motion.div>
          )}

          {active === "calendar" && (
            <motion.div
              key="calendar"
              initial={{ opacity: 0, scale: 0.985 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.985 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              className="w-full h-full"
            >
              {calendarPanel}
            </motion.div>
          )}

          {active === "feed" && (
            <motion.div
              key="feed"
              initial={{ opacity: 0, scale: 0.985 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.985 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              className="w-full h-full"
            >
              {feedPanel}
            </motion.div>
          )}

          {active === "dashboard" && (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0, scale: 0.985 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.985 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              className="w-full h-full"
            >
              {dashboardPanel}
            </motion.div>
          )}

          {active === "settings" && (
            <motion.div
              key="settings"
              initial={{ opacity: 0, scale: 0.985 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.985 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              className="w-full h-full"
            >
              {settingsPanel}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Floating Bottom-Right Toast Notifications */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2.5 max-w-sm pointer-events-none">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 30, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.85, transition: { duration: 0.15 } }}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
              className="pointer-events-auto flex items-start gap-3.5 p-4 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-main)] shadow-2xl backdrop-blur-md cursor-pointer hover:border-[var(--text-muted)] transition-colors"
              onClick={() => {
                setActive("email")
                removeToast(toast.id)
              }}
            >
              <div className="mt-0.5 shrink-0">
                <SenderAvatar
                  avatarUrl={toast.avatar_url}
                  initials={toast.initials || toast.from[0]?.toUpperCase()}
                  name={toast.from}
                  size={36}
                />
              </div>

              <div className="flex-1 min-w-0">
                <div className="text-[11px] font-bold uppercase tracking-wider text-[var(--accent)] mb-0.5">
                  {t("new_mail_notification")}
                </div>
                <div className="text-xs font-bold text-[var(--text-main)] truncate">
                  {toast.from}
                </div>
                <div className="text-xs text-[var(--text-muted)] truncate mt-0.5">
                  {toast.subject}
                </div>
              </div>

              <button
                onClick={(e) => {
                  e.stopPropagation()
                  removeToast(toast.id)
                }}
                className="text-[var(--text-dim)] hover:text-[var(--text-main)] p-1 -mr-1 -mt-1 rounded-lg"
              >
                <X size={14} />
              </button>
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
      className={`relative px-4 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
        active ? "text-[var(--accent-invert)] font-bold" : "text-[var(--text-muted)] hover:text-[var(--text-main)]"
      }`}
    >
      {active && (
        <motion.div
          layoutId="dock-indicator"
          className="absolute inset-0 bg-[var(--accent)] rounded-xl shadow-xs"
          transition={{ type: "spring", stiffness: 450, damping: 30 }}
        />
      )}
      <span className="relative z-10">{icon}</span>
      <span className="relative z-10">{label}</span>
    </button>
  )
}
