import { useEffect } from "react"
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { useAuth } from "./store/auth"
import Login from "./views/Auth/Login"
import Register from "./views/Auth/Register"
import AppLayout from "./components/layout/AppLayout"
import EmailView from "./views/Email"
import CalendarView from "./views/Calendar"
import FeedView from "./views/Feed"
import { BlogIndex, BlogPost } from "./views/Blog"

const qc = new QueryClient({ defaultOptions: { queries: { retry: 1, staleTime: 30_000 } } })

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
    />
  )
}

export default function App() {
  return (
    <QueryClientProvider client={qc}>
      <BrowserRouter>
        <Routes>
          {/* Auth */}
          <Route path="/login"    element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Public blog (accessible without login) */}
          <Route path="/blog"                     element={<BlogIndex />} />
          <Route path="/blog/@:handle"             element={<BlogIndex />} />
          <Route path="/blog/@:handle/:slug"       element={<BlogPost />} />

          {/* App */}
          <Route path="/*" element={<ProtectedApp />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
