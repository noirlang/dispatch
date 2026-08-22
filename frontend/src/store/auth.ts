import { create } from "zustand"
import { api } from "../lib/api"

interface User {
  id: number
  name: string
  email: string
  avatar_path: string | null
  default_signature?: string | null
  ai_configured: boolean
  ai_provider: string | null
  ai_model?: string | null
  approval_system_enabled: boolean
  spy_pixel_blocking: boolean
}

interface AuthStore {
  user: User | null
  token: string | null
  login: (email: string, password: string) => Promise<void>
  register: (name: string, email: string, password: string) => Promise<void>
  logout: () => void
  fetchMe: () => Promise<void>
}

export const useAuth = create<AuthStore>((set) => ({
  user: null,
  token: localStorage.getItem("dispatch_token"),

  login: async (email, password) => {
    const res = await api.post<{ token: string; user: User }>("/auth/login", { email, password })
    localStorage.setItem("dispatch_token", res.token)
    set({ token: res.token, user: res.user })
  },

  register: async (name, email, password) => {
    const res = await api.post<{ token: string; user: User }>("/auth/register", { name, email, password })
    localStorage.setItem("dispatch_token", res.token)
    set({ token: res.token, user: res.user })
  },

  logout: () => {
    localStorage.removeItem("dispatch_token")
    set({ token: null, user: null })
  },

  fetchMe: async () => {
    try {
      const res = await api.get<{ user: User }>("/auth/me")
      set({ user: res.user })
    } catch {
      localStorage.removeItem("dispatch_token")
      set({ token: null, user: null })
    }
  },
}))
