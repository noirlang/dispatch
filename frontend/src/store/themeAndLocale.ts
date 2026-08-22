import { create } from "zustand"
import { tr, enGB } from "date-fns/locale"

export type Theme = "system" | "dark" | "light"
export type Lang = "tr" | "en"

export interface ToastItem {
  title?: string
  id: string
  from: string
  subject: string
  avatar_url?: string | null
  initials?: string
}

interface State {
  theme: Theme
  lang: Lang
  toasts: ToastItem[]
  setTheme: (t: Theme) => void
  setLang: (l: Lang) => void
  addToast: (t: Omit<ToastItem, "id">) => void
  removeToast: (id: string) => void
}

const translations = {
  en: {
    email: "Email",
    calendar: "Calendar",
    feed: "Feed",
    dashboard: "Dashboard",
    settings: "Settings",
    compose: "Compose",
    new_message: "New Message",
    inbox: "Inbox",
    approvals: "Approvals",
    sent: "Sent",
    drafts: "Drafts",
    trash: "Trash",
    reply: "Reply",
    forward: "Forward",
    approve: "Approve",
    reject: "Reject",
    delete: "Delete",
    merge: "Merge",
    select: "Select",
    to: "To",
    cc: "Cc",
    subject: "Subject",
    write_message: "Write your message (Markdown supported)...",
    preview: "Preview",
    edit: "Edit",
    send: "Send",
    discard: "Discard",
    search: "Search messages...",
    no_messages: "No messages found",
    select_email: "Select an email to read",
    today: "Today",
    all_day: "All day",
    no_events: "No events scheduled",
    add_event: "Add Event",
    add_feed: "Add Feed",
    feed_url_placeholder: "https://example.com/rss",
    read_more: "Read more",
    active_notes: "active notes",
    urgent: "Urgent",
    dismiss: "Dismiss",
    add_to_calendar: "Add to Calendar",
    copy: "Copy",
    copied: "Copied!",
    profile: "Profile",
    contact_rules: "Contact Rules",
    speakeasy_codes: "Speakeasy Passcodes",
    ai_settings: "Artificial Intelligence",
    rss_settings: "RSS Feeds",
    privacy_security: "Privacy & Security",
    dns_settings: "Cloudflare & DNS",
    appearance: "Appearance & Language",
    theme: "Theme",
    theme_system: "System Default",
    theme_dark: "Dark Theme",
    theme_light: "Light Theme",
    language: "Language",
    full_name: "Full Name",
    email_address: "Email Address",
    signature: "Default Signature",
    signature_preview: "Signature Preview",
    change_password: "Change Password",
    current_password: "Current Password",
    new_password: "New Password",
    confirm_password: "Confirm New Password",
    save_changes: "Save Changes",
    saved: "Saved ✓",
    new_mail_notification: "New email received",
    view_mail: "View",
    sign_out: "Sign Out",
    send_to_pano: "Send to Dashboard",
    set_sender_photo: "Set Contact Photo",
    blocked_senders: "Blocked Senders",
    important_senders: "Important Contacts"
  },
  tr: {
    email: "E-Posta",
    calendar: "Takvim",
    feed: "Akış (Feed)",
    dashboard: "Pano",
    settings: "Ayarlar",
    compose: "Yeni E-posta",
    new_message: "Yeni İleti",
    inbox: "Gelen Kutusu",
    approvals: "Onay Bekleyenler",
    sent: "Gönderilenler",
    drafts: "Taslaklar",
    trash: "Çöp Kutusu",
    reply: "Yanıtla",
    forward: "İlet",
    approve: "Onayla",
    reject: "Reddet",
    delete: "Sil",
    merge: "Birleştir",
    select: "Seç",
    to: "Kime",
    cc: "Bilgi (Cc)",
    subject: "Konu",
    write_message: "İletinizi yazın (Markdown desteklenir)...",
    preview: "Önizleme",
    edit: "Düzenle",
    send: "Gönder",
    discard: "Vazgeç",
    search: "E-postalarda ara...",
    no_messages: "Henüz ileti yok",
    select_email: "Okumak için bir e-posta seçin",
    today: "Bugün",
    all_day: "Tüm gün",
    no_events: "Planlanmış etkinlik yok",
    add_event: "Etkinlik Ekle",
    add_feed: "Kaynak Ekle",
    feed_url_placeholder: "https://ornek.com/rss",
    read_more: "Devamını oku",
    active_notes: "aktif not",
    urgent: "Öncelikli",
    dismiss: "Kapat",
    add_to_calendar: "Takvime Ekle",
    copy: "Kopyala",
    copied: "Kopyalandı!",
    profile: "Profil",
    contact_rules: "Kişi Kuralları",
    speakeasy_codes: "Özel Kodlar",
    ai_settings: "Yapay Zeka",
    rss_settings: "RSS Kaynakları",
    privacy_security: "Gizlilik ve Güvenlik",
    dns_settings: "Cloudflare ve DNS",
    appearance: "Görünüm ve Dil",
    theme: "Tema",
    theme_system: "Sistem Varsayılanı",
    theme_dark: "Koyu Tema (Siyah)",
    theme_light: "Açık Tema (Beyaz)",
    language: "Arayüz Dili",
    full_name: "Ad Soyad",
    email_address: "E-posta Adresi",
    signature: "Varsayılan İmza",
    signature_preview: "İmza Önizlemesi",
    change_password: "Şifre Değiştir",
    current_password: "Mevcut Şifre",
    new_password: "Yeni Şifre",
    confirm_password: "Yeni Şifre (Tekrar)",
    save_changes: "Değişiklikleri Kaydet",
    saved: "Kaydedildi ✓",
    new_mail_notification: "Yeni e-posta geldi",
    view_mail: "Görüntüle",
    sign_out: "Çıkış Yap",
    send_to_pano: "Panoya Gönder",
    set_sender_photo: "Kişi Fotoğrafı Ayarla",
    blocked_senders: "Engellenenler",
    important_senders: "Önemli Kişiler"
  }
}

export const useAppStore = create<State>((set) => ({
  theme: (localStorage.getItem("dispatch_theme") as Theme) || "system",
  lang: (localStorage.getItem("dispatch_lang") as Lang) || "tr",
  toasts: [],

  setTheme: (theme) => {
    localStorage.setItem("dispatch_theme", theme)
    applyThemeToDOM(theme)
    set({ theme })
  },

  setLang: (lang) => {
    localStorage.setItem("dispatch_lang", lang)
    set({ lang })
  },

  addToast: (item) => {
    const id = Math.random().toString(36).substring(7)
    set((state) => ({ toasts: [...state.toasts, { ...item, id }] }))
    setTimeout(() => {
      set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }))
    }, 6000)
  },

  removeToast: (id) => {
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }))
  },
}))

export function useT() {
  const lang = useAppStore((s) => s.lang)
  return (key: keyof typeof translations.en) => translations[lang][key] || translations.en[key] || key
}

export function useDateLocale() {
  const lang = useAppStore((s) => s.lang)
  return lang === "tr" ? tr : enGB
}

export function applyThemeToDOM(theme: Theme) {
  const root = document.documentElement
  const isDark =
    theme === "dark" ||
    (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches)

  if (isDark) {
    root.classList.add("dark")
    root.classList.remove("light")
  } else {
    root.classList.remove("dark")
    root.classList.add("light")
  }
}
