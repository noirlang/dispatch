import { useState } from "react"
import { Calendar, Mail, Rss, Settings, LayoutDashboard } from "lucide-react"

type Panel = "email" | "calendar" | "feed" | "dashboard" | "settings"

interface Props {
  children?: React.ReactNode
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
  settingsPanel
}: Props) {
  const [active, setActive] = useState<Panel>("email")

  return (
    <div className="h-screen flex flex-col bg-[#0a0a0a] overflow-hidden">
      {/* Top nav */}
      <nav className="flex items-center justify-between px-4 h-11 border-b border-[#1a1a1a] shrink-0">
        <span className="text-white font-medium text-sm tracking-wide">Dispatch</span>

        <div className="flex items-center gap-1">
          <NavBtn icon={<Calendar size={15} />} label="Calendar" id="calendar" active={active} onClick={setActive} />
          <NavBtn icon={<Mail size={15} />}     label="Email"    id="email"    active={active} onClick={setActive} />
          <NavBtn icon={<Rss size={15} />}      label="Feed"     id="feed"     active={active} onClick={setActive} />
        </div>

        <div className="flex items-center gap-2">
          <NavBtn icon={<LayoutDashboard size={15} />} label="Dashboard" id="dashboard" active={active} onClick={setActive} />
          <NavBtn icon={<Settings size={15} />}        label="Settings"  id="settings"  active={active} onClick={setActive} />
        </div>
      </nav>

      {/* Panels */}
      <div className="flex-1 flex overflow-hidden">
        {/* Calendar panel */}
        <aside
          className={`border-r border-[#1a1a1a] overflow-auto transition-all ${
            active === "calendar" ? "flex-1" : active === "email" ? "w-64 hidden lg:block" : "hidden"
          }`}
        >
          {calendarPanel}
        </aside>

        {/* Email panel (center, always visible when active or as full) */}
        {(active === "email" || active === "calendar" || active === "feed") && (
          <main className={`flex-1 overflow-auto ${active !== "email" ? "hidden lg:flex lg:flex-col" : ""}`}>
            {emailPanel}
          </main>
        )}

        {/* Feed panel */}
        <aside
          className={`border-l border-[#1a1a1a] overflow-auto transition-all ${
            active === "feed" ? "flex-1" : active === "email" ? "w-72 hidden xl:block" : "hidden"
          }`}
        >
          {feedPanel}
        </aside>

        {/* Dashboard View */}
        {active === "dashboard" && (
          <main className="flex-1 overflow-auto">
            {dashboardPanel}
          </main>
        )}

        {/* Settings View */}
        {active === "settings" && (
          <main className="flex-1 overflow-auto">
            {settingsPanel}
          </main>
        )}
      </div>
    </div>
  )
}

function NavBtn({
  icon, label, id, active, onClick
}: {
  icon: React.ReactNode
  label: string
  id: Panel
  active: Panel
  onClick: (id: Panel) => void
}) {
  const isActive = active === id
  return (
    <button
      onClick={() => onClick(id)}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs transition-colors ${
        isActive ? "bg-[#1a1a1a] text-white" : "text-[#666] hover:text-white"
      }`}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </button>
  )
}

// export type for use in App
export type { Panel }
