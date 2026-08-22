import { useState, useEffect, useRef } from "react"
import { Calendar, Mail, Rss, Settings, LayoutDashboard, Sun, Moon, Laptop, X, Bell, Menu, Inbox, Clock, Send, FileText, Trash2, Users, LogOut, ShieldCheck } from "lucide-react"
import { useAppStore, useT, applyThemeToDOM, type EmailFolder } from "../../store/themeAndLocale"
import { requestNotificationPermission, sendBrowserNotification } from "../../lib/notifications"
import { useAuth } from "../../store/auth"
import { useQuery } from "@tanstack/react-query"
import { api } from "../../lib/api"
import { motion, AnimatePresence } from "framer-motion"
import { Link } from "react-router-dom"
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const t = useT()
  const { user, logout } = useAuth()
  const { theme, setTheme, lang, setLang, activeEmailFolder, setActiveEmailFolder, toasts, addToast, removeToast } = useAppStore()
  const [notifPermission, setNotifPermission] = useState<NotificationPermission | "unsupported">(
    typeof window !== "undefined" && "Notification" in window ? Notification.permission : "unsupported"
  )

  useEffect(() => {
    applyThemeToDOM(theme)
  }, [theme])

  // Request notification permission smoothly on first user interaction or mount
  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      requestNotificationPermission().then((granted) => {
        setNotifPermission(granted ? "granted" : "denied")
      })
    }
  }, [])

  // Approvals count for badges
  const { data: approvals = [] } = useQuery({
    queryKey: ["emails", "approvals"],
    queryFn: () => api.get<any[]>("/emails?folder=approvals"),
    refetchInterval: 5000,
  })

  // Contact Groups count
  const { data: groups = [] } = useQuery({
    queryKey: ["contact-groups"],
    queryFn: () => api.get<any[]>("/contact_groups"),
    refetchInterval: 8000,
  })

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

  const folderList = [
    { id: "inbox" as const,     label: t("inbox"),     icon: <Inbox size={16} />, badge: 0 },
    { id: "approvals" as const, label: t("approvals"), icon: <Clock size={16} />, badge: approvals.filter(a => !a.is_read).length },
    { id: "sent" as const,      label: t("sent"),      icon: <Send size={16} />,  badge: 0 },
    { id: "drafts" as const,    label: t("drafts"),    icon: <FileText size={16} />, badge: 0 },
    { id: "trash" as const,     label: t("trash"),     icon: <Trash2 size={16} />, badge: 0 },
    { id: "contacts" as const,  label: lang === "tr" ? "Kişiler & Gruplar" : "Contacts & Groups", icon: <Users size={16} />, badge: groups.length },
  ]

  function selectFolderOnMobile(folderId: EmailFolder) {
    setActiveEmailFolder(folderId)
    setActive("email")
    setMobileMenuOpen(false)
  }

  return (
    <div className="h-screen w-screen flex flex-col bg-[var(--bg-primary)] text-[var(--text-main)] overflow-hidden">
      {/* Top Header */}
      <header className="h-14 border-b border-[var(--border-color)] bg-[var(--bg-secondary)] px-4 sm:px-6 flex items-center justify-between shrink-0 select-none z-30 shadow-xs relative">
        {/* Left: Brand logo */}
        <motion.div
          whileHover={{ scale: 1.03 }}
          className="flex items-center gap-2 cursor-pointer z-10"
          onClick={() => setActive("email")}
        >
          <img src="/dispatch.png" alt="Dispatch" className="h-6 w-auto object-contain" />
        </motion.div>

        {/* Center: Modern Floating Nav Bar / Dock (Desktop only - 100% Dead-Centered) */}
        <div className="hidden md:block absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
          <nav className="flex items-center p-1 rounded-2xl bg-[var(--bg-primary)] border border-[var(--border-color)] shadow-sm gap-1">
            <DockBtn
              icon={<Mail size={16} />}
              label={t("email")}
              active={active === "email"}
              badge={approvals.filter(a => !a.is_read).length}
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
        </div>

        {/* Right: Desktop Actions vs Mobile Hamburger + NoirLang */}
        <div className="flex items-center gap-2 z-10">
          {/* DESKTOP Toolbar */}
          <div className="hidden md:flex items-center gap-2">
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

          {/* Company Logo on Top-Right linking to noirlang.tr */}
          <a
            href="https://noirlang.tr"
            target="_blank"
            rel="noopener noreferrer"
            className="pl-2 border-l border-[var(--border-color)] flex items-center"
            title="NoirLang"
          >
            <img src="/sirket.png" alt="NoirLang" className="h-6 w-auto object-contain opacity-80 hover:opacity-100 transition-opacity" />
          </a>

          {/* MOBILE Hamburger Menu Button */}
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => setMobileMenuOpen(true)}
            className="flex md:hidden p-2 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-main)] shadow-xs ml-1"
            title="Menü"
          >
            <Menu size={18} />
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

      {/* MOBILE Bottom Navigation Bar (iOS / Android App Style Dock) */}
      <nav className="h-14 border-t border-[var(--border-color)] bg-[var(--bg-secondary)] flex md:hidden items-center justify-around z-30 shrink-0 select-none shadow-lg px-2">
        <MobileNavBtn
          icon={<Mail size={18} />}
          label={t("email")}
          active={active === "email"}
          badge={approvals.filter(a => !a.is_read).length}
          onClick={() => setActive("email")}
        />
        <MobileNavBtn
          icon={<Calendar size={18} />}
          label={t("calendar")}
          active={active === "calendar"}
          onClick={() => setActive("calendar")}
        />
        <MobileNavBtn
          icon={<Rss size={18} />}
          label={t("feed")}
          active={active === "feed"}
          onClick={() => setActive("feed")}
        />
        <MobileNavBtn
          icon={<LayoutDashboard size={18} />}
          label={t("dashboard")}
          active={active === "dashboard"}
          onClick={() => setActive("dashboard")}
        />
        <MobileNavBtn
          icon={<Settings size={18} />}
          label={t("settings")}
          active={active === "settings"}
          onClick={() => setActive("settings")}
        />
      </nav>

      {/* MOBILE Slide-Over Menu Drawer */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileMenuOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 md:hidden"
            />

            {/* Slide Panel */}
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
              className="fixed top-0 right-0 bottom-0 w-4/5 max-w-sm bg-[var(--bg-secondary)] border-l border-[var(--border-color)] z-50 flex flex-col p-5 shadow-2xl md:hidden overflow-y-auto"
            >
              {/* Drawer Header */}
              <div className="flex items-center justify-between pb-4 border-b border-[var(--border-color)]">
                <div className="flex items-center gap-2.5">
                  <img src="/dispatch.png" alt="Dispatch" className="h-5 w-auto object-contain" />
                </div>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1.5 rounded-full hover:bg-[var(--bg-card)] text-[var(--text-muted)] hover:text-[var(--text-main)]"
                >
                  <X size={18} />
                </button>
              </div>

              {/* User Card */}
              {user && (
                <div className="py-3 px-3.5 my-3 rounded-2xl bg-[var(--bg-primary)] border border-[var(--border-color)] flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-[var(--bg-card)] border border-[var(--border-color)] flex items-center justify-center font-bold text-xs">
                    {user.name?.charAt(0) || user.email?.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-[var(--text-main)] truncate">{user.name}</p>
                    <p className="text-[11px] text-[var(--text-dim)] font-mono truncate">{user.email}</p>
                  </div>
                </div>
              )}

              {/* Mail Folders List */}
              <div className="flex flex-col gap-1 my-2">
                <span className="text-[10px] font-bold text-[var(--text-dim)] uppercase tracking-wider px-3 mb-1">
                  {lang === "tr" ? "E-Posta Klasörleri" : "Mail Folders"}
                </span>
                {folderList.map((f) => {
                  const isSelected = active === "email" && activeEmailFolder === f.id
                  return (
                    <button
                      key={f.id}
                      onClick={() => selectFolderOnMobile(f.id)}
                      className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                        isSelected
                          ? "bg-[var(--bg-card)] text-[var(--text-main)] border border-[var(--border-color)] shadow-xs"
                          : "text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-card)]"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        {f.icon}
                        <span>{f.label}</span>
                      </div>
                      {f.badge > 0 && (
                        <span className="px-2 py-0.5 text-[10px] font-extrabold rounded-full bg-[#f59e0b20] text-[#f59e0b] border border-[#f59e0b40]">
                          {f.badge}
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>

              {/* Language & Theme Controls */}
              <div className="mt-auto pt-4 border-t border-[var(--border-color)] flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[var(--text-muted)]">
                    {lang === "tr" ? "Dil:" : "Language:"}
                  </span>
                  <div className="flex items-center gap-1.5 p-1 rounded-full bg-[var(--bg-primary)] border border-[var(--border-color)]">
                    <button
                      onClick={() => setLang("tr")}
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-sm transition-all ${
                        lang === "tr" ? "ring-2 ring-[var(--text-main)] bg-[var(--bg-card)]" : "opacity-40"
                      }`}
                      title="Türkçe"
                    >
                      🇹🇷
                    </button>
                    <button
                      onClick={() => setLang("en")}
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-sm transition-all ${
                        lang === "en" ? "ring-2 ring-[var(--text-main)] bg-[var(--bg-card)]" : "opacity-40"
                      }`}
                      title="English (UK)"
                    >
                      🇬🇧
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[var(--text-muted)]">
                    {lang === "tr" ? "Tema:" : "Theme:"}
                  </span>
                  <div className="flex items-center gap-1 p-1 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)]">
                    <button
                      onClick={() => setTheme("dark")}
                      className={`p-1.5 rounded-lg text-xs ${theme === "dark" ? "bg-[var(--bg-card)] text-[var(--text-main)]" : "text-[var(--text-dim)]"}`}
                    >
                      <Moon size={13} />
                    </button>
                    <button
                      onClick={() => setTheme("light")}
                      className={`p-1.5 rounded-lg text-xs ${theme === "light" ? "bg-[var(--bg-card)] text-[var(--text-main)]" : "text-[var(--text-dim)]"}`}
                    >
                      <Sun size={13} />
                    </button>
                    <button
                      onClick={() => setTheme("system")}
                      className={`p-1.5 rounded-lg text-xs ${theme === "system" ? "bg-[var(--bg-card)] text-[var(--text-main)]" : "text-[var(--text-dim)]"}`}
                    >
                      <Laptop size={13} />
                    </button>
                  </div>
                </div>

                {/* Admin Link */}
                <Link
                  to="/admin"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-primary)] transition-colors"
                >
                  <ShieldCheck size={15} />
                  <span>{lang === "tr" ? "Yönetici Paneli (/admin)" : "Admin Panel (/admin)"}</span>
                </Link>

                {/* Logout Button */}
                <button
                  onClick={() => {
                    setMobileMenuOpen(false)
                    logout()
                  }}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-[#ef4444] hover:bg-[#ef444415] transition-colors"
                >
                  <LogOut size={15} />
                  <span>{lang === "tr" ? "Çıkış Yap" : "Sign Out"}</span>
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Floating Incoming Email Toast Notification stack */}
      <div className="fixed bottom-18 md:bottom-6 right-4 md:right-6 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 30, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="pointer-events-auto bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl p-3.5 shadow-2xl flex items-start gap-3 relative overflow-hidden backdrop-blur-md"
            >
              <SenderAvatar
                avatarUrl={toast.avatar_url}
                initials={toast.initials}
                name={toast.from}
                size={36}
              />
              <div className="flex-1 min-w-0 pr-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[var(--text-main)] truncate">{toast.from}</span>
                  <span className="text-[10px] text-[var(--text-dim)] font-mono">
                    {lang === "tr" ? "Şimdi" : "Just now"}
                  </span>
                </div>
                <p className="text-xs text-[var(--text-muted)] font-medium truncate mt-0.5">{toast.subject}</p>
              </div>
              <button
                onClick={() => removeToast(toast.id)}
                className="absolute top-2.5 right-2.5 text-[var(--text-dim)] hover:text-[var(--text-main)] transition-colors p-1"
              >
                <X size={12} />
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
  badge = 0,
  onClick,
}: {
  icon: React.ReactNode
  label: string
  active: boolean
  badge?: number
  onClick: () => void
}) {
  return (
    <motion.button
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className={`relative px-4 py-2 rounded-xl text-xs font-medium transition-all flex items-center gap-2 select-none ${
        active
          ? "bg-[var(--accent)] text-[var(--accent-invert)] font-bold shadow-xs"
          : "text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-card)]"
      }`}
    >
      <span className="shrink-0">{icon}</span>
      <span>{label}</span>
      {badge > 0 && (
        <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-extrabold bg-[#f59e0b] text-black">
          {badge}
        </span>
      )}
    </motion.button>
  )
}

function MobileNavBtn({
  icon,
  label,
  active,
  badge = 0,
  onClick,
}: {
  icon: React.ReactNode
  label: string
  active: boolean
  badge?: number
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`relative flex flex-col items-center justify-center gap-0.5 py-1 px-2.5 rounded-xl transition-all ${
        active
          ? "text-[var(--accent)] font-bold scale-105"
          : "text-[var(--text-dim)] hover:text-[var(--text-main)]"
      }`}
    >
      <div className="relative">
        {icon}
        {badge > 0 && (
          <span className="absolute -top-1 -right-2 w-3.5 h-3.5 rounded-full bg-[#f59e0b] text-black text-[9px] font-extrabold flex items-center justify-center">
            {badge}
          </span>
        )}
      </div>
      <span className="text-[10px] tracking-tight">{label}</span>
    </button>
  )
}
