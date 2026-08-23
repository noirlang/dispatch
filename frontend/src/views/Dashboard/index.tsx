import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "../../lib/api"
import { useT, useAppStore, useDateLocale } from "../../store/themeAndLocale"
import { motion, AnimatePresence } from "framer-motion"
import {
  Plane,
  Key,
  Package,
  FileText,
  Ticket,
  Building2,
  Calendar,
  Copy,
  Check,
  ExternalLink,
  X,
  Sparkles,
  Clock,
  BookmarkPlus
} from "lucide-react"
import { formatDistanceToNow } from "date-fns"

interface ActionableItem {
  label: string
  value: string
  copyable?: boolean
  url?: string | null
}

interface CalendarSuggestion {
  title: string
  date: string
  time?: string
  all_day?: boolean
  description?: string
}

interface DashboardCard {
  id: number
  card_type: "invoice" | "tracking" | "ticket" | "bank" | "verification" | "travel" | "otp" | "order" | "meeting" | "general"
  summary: string
  priority: "high" | "medium" | "low"
  language?: string
  expires_at?: string | null
  actionable_items: ActionableItem[]
  calendar_suggestion?: CalendarSuggestion | null
  tags: string[]
  created_at: string
}

export default function DashboardView() {
  const t = useT()
  const dateLocale = useDateLocale()
  const lang = useAppStore((s) => s.lang)
  const { addToast } = useAppStore()
  const qc = useQueryClient()
  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const [pendingCardId, setPendingCardId] = useState<number | null>(null)

  const { data: cards = [], isLoading } = useQuery({
    queryKey: ["dashboard-cards"],
    queryFn: () => api.get<DashboardCard[]>("/dashboard"),
    refetchInterval: 30_000,
  })

  const dismiss = useMutation({
    mutationFn: (id: number) => api.delete(`/dashboard/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["dashboard-cards"] }),
  })

  const addToCalendar = useMutation({
    mutationFn: (id: number) => {
      setPendingCardId(id)
      return api.post(`/dashboard/${id}/add_to_calendar`)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["calendar"] })
      qc.invalidateQueries({ queryKey: ["dashboard-cards"] })
      addToast({
        from: "📅 Takvim",
        subject: lang === "tr" ? "Etkinlik takvime eklendi ve panodan kaldırıldı." : "Event added to calendar."
      })
    },
    onSettled: () => {
      setPendingCardId(null)
    }
  })

  function copyText(val: string, key: string) {
    navigator.clipboard.writeText(val)
    setCopiedKey(key)
    setTimeout(() => setCopiedKey(null), 2000)
  }

  function getCardIcon(type: DashboardCard["card_type"]) {
    switch (type) {
      case "travel":       return <Plane size={16} className="text-[#f59e0b]" />
      case "otp":
      case "verification": return <Key size={16} className="text-[#22c55e]" />
      case "tracking":     return <Package size={16} className="text-[#3b82f6]" />
      case "invoice":      return <FileText size={16} className="text-[#ef4444]" />
      case "ticket":       return <Ticket size={16} className="text-[#d97706]" />
      case "bank":         return <Building2 size={16} className="text-[#10b981]" />
      case "meeting":      return <Calendar size={16} className="text-[#8b5cf6]" />
      default:             return <BookmarkPlus size={16} className="text-[var(--text-muted)]" />
    }
  }

  return (
    <div className="h-full flex flex-col bg-[var(--bg-primary)] overflow-y-auto p-3 sm:p-8 pb-24 md:pb-8 max-w-6xl mx-auto animate-fadeIn">
      {/* Dashboard Header */}
      <div className="flex items-center justify-between mb-4 sm:mb-8 pb-3 sm:pb-6 border-b border-[var(--border-color)] gap-2">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <div className="p-1.5 sm:p-2 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] flex items-center justify-center shrink-0">
            <Sparkles size={16} className="text-[var(--text-main)]" />
          </div>
          <h1 className="text-sm sm:text-xl font-bold text-[var(--text-main)] leading-none truncate">{t("dashboard")}</h1>
        </div>
        <span className="text-xs font-mono font-semibold text-[var(--text-muted)] px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] shadow-xs shrink-0">
          <span className="hidden sm:inline">{cards.length} {t("active_notes")}</span>
          <span className="sm:hidden">{cards.length} not</span>
        </span>
      </div>


      {isLoading && <div className="text-[var(--text-dim)] text-xs py-8 text-center">Loading board...</div>}

      {!isLoading && cards.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <Sparkles size={32} className="text-[var(--text-dim)] mb-3 opacity-50" />
          <h3 className="text-sm font-semibold text-[var(--text-muted)]">
            {lang === "tr" ? "Henüz aktif not veya kart yok" : "No active notices"}
          </h3>
          <p className="text-xs text-[var(--text-dim)] max-w-sm mt-1">
            {lang === "tr"
              ? "E-postalardan seçtiğin metinleri 'Panoya Gönder' ile buraya kaydedebilir veya gelen kodları burada görebilirsin."
              : "Save snippets from emails with 'Send to Dashboard' or view extracted travel codes and OTPs here."}
          </p>
        </div>
      )}

      {/* Grid of Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        <AnimatePresence>
          {cards.map((card, idx) => (
            <motion.div
              key={card.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ delay: idx * 0.03 }}
              whileHover={{ y: -2, scale: 1.01 }}
              className={`p-4 sm:p-6 rounded-2xl border flex flex-col justify-between transition-all shadow-xs ${
                card.priority === "high"
                  ? "bg-[var(--bg-card)] border-[var(--text-main)] shadow-sm"
                  : "bg-[var(--bg-secondary)] border border-[var(--border-color)] hover:border-[var(--text-dim)]"
              }`}
            >
              {/* Card Header */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)]">
                      {getCardIcon(card.card_type)}
                    </div>
                    <span className="text-xs uppercase font-extrabold tracking-wider text-[var(--text-main)]">
                      {card.card_type}
                    </span>
                    {card.priority === "high" && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#f59e0b15] text-[#f59e0b] border border-[#f59e0b30]">
                        {t("urgent")}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => dismiss.mutate(card.id)}
                    className="text-[var(--text-dim)] hover:text-[var(--text-main)] p-1 rounded-lg transition-colors"
                    title={t("dismiss")}
                  >
                    <X size={15} />
                  </button>
                </div>

                {/* Summary */}
                <p className="text-sm text-[var(--text-main)] leading-relaxed mb-4 font-medium whitespace-pre-line">
                  {card.summary}
                </p>

                {/* Actionable Items */}
                {card.actionable_items && card.actionable_items.length > 0 && (
                  <div className="flex flex-col gap-2 mb-4">
                    {card.actionable_items.map((item, iIdx) => (
                      <div
                        key={iIdx}
                        className="flex items-center justify-between p-2.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] text-xs"
                      >
                        <span className="text-[var(--text-muted)] font-medium">{item.label}</span>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[var(--text-main)] font-bold select-all">
                            {item.value}
                          </span>
                          {item.url && (
                            <a
                              href={item.url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[var(--text-dim)] hover:text-[var(--text-main)]"
                              title="Open link"
                            >
                              <ExternalLink size={12} />
                            </a>
                          )}
                          {item.copyable !== false && (
                            <button
                              onClick={() => copyText(item.value, `card_${card.id}_item_${iIdx}`)}
                              className="text-[var(--text-dim)] hover:text-[var(--text-main)] transition-colors p-0.5"
                              title={t("copy")}
                            >
                              {copiedKey === `card_${card.id}_item_${iIdx}` ? (
                                <Check size={12} className="text-[#22c55e]" />
                              ) : (
                                <Copy size={12} />
                              )}
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Card Footer */}
              <div className="pt-3 border-t border-[var(--border-color)] flex items-center justify-between text-[11px] text-[var(--text-dim)]">
                <div className="flex items-center gap-1.5 font-mono">
                  <Clock size={11} />
                  <span>{formatDistanceToNow(new Date(card.created_at), { addSuffix: true, locale: dateLocale })}</span>
                </div>

                {card.calendar_suggestion && (
                  <button
                    disabled={pendingCardId === card.id || addToCalendar.isPending}
                    onClick={() => addToCalendar.mutate(card.id)}
                    className="flex items-center gap-1.5 text-[#22c55e] hover:underline transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Calendar size={12} className={pendingCardId === card.id ? "animate-spin" : ""} />
                    <span>{pendingCardId === card.id ? "Ekleniyor..." : t("add_to_calendar")}</span>
                  </button>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  )
}
