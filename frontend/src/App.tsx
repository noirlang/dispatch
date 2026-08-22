import { useEffect } from "react"
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { useAuth } from "./store/auth"
import LandingView from "./views/Landing"
import Login from "./views/Auth/Login"
import Register from "./views/Auth/Register"
import SetupWizard from "./views/Setup"
import AppLayout from "./components/layout/AppLayout"
import EmailView from "./views/Email"
import CalendarView from "./views/Calendar"
import FeedView from "./views/Feed"
import DashboardView from "./views/Dashboard"
import SettingsView from "./views/Settings"
import AdminView from "./views/Admin"
import { BlogIndex, BlogPost } from "./views/Blog"

const qc = new QueryClient({ defaultOptions: { queries: { retry: 1, staleTime: 30_000 } } })

function TitleManager() {
  const location = useLocation()

  useEffect(() => {
    const path = location.pathname
    if (path.startsWith("/admin")) {
      document.title = "Dispatch — Yönetici Paneli"
    } else if (path.startsWith("/login")) {
      document.title = "Dispatch — Giriş Yap"
    } else if (path.startsWith("/register")) {
      document.title = "Dispatch — Kayıt Ol"
    } else if (path.startsWith("/setup")) {
      document.title = "Dispatch — Kurulum Sihirbazı"
    } else if (path.startsWith("/app")) {
      document.title = "Dispatch — E-Posta"
    } else if (path.startsWith("/blog")) {
      document.title = "Dispatch — Blog"
    } else {
      document.title = "Dispatch — Akıllı E-Posta İstemcisi"
    }
  }, [location.pathname])

  return null
}

function ProtectedApp() {
  const { user, token, fetchMe } = useAuth()

  useEffect(() => {
    if (token && !user) fetchMe()
  }, [token])

  if (!token) return <Navigate to="/login" replace />

  return (
    <AppLayout
      emailPanel={<EmailView />}
      calendarPanel={<CalendarView />}
      feedPanel={<FeedView />}
      dashboardPanel={<DashboardView />}
      settingsPanel={<SettingsView />}
    />
  )
}

export default function App() {
  return (
    <QueryClientProvider client={qc}>
      <BrowserRouter>
        <TitleManager />
        <Routes>
          {/* Landing / Welcome Screen */}
          <Route path="/"         element={<LandingView />} />

          {/* Auth & Setup */}
          <Route path="/login"    element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/setup"    element={<SetupWizard />} />

          {/* Admin Management & Safe Updates Panel */}
          <Route path="/admin"    element={<AdminView />} />
          <Route path="/admin/*"  element={<AdminView />} />

          {/* Public blog */}
          <Route path="/blog"                     element={<BlogIndex />} />
          <Route path="/blog/@:handle"             element={<BlogIndex />} />
          <Route path="/blog/@:handle/:slug"       element={<BlogPost />} />

          {/* Main Dispatch App */}
          <Route path="/app/*"    element={<ProtectedApp />} />
          <Route path="/*"        element={<ProtectedApp />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
