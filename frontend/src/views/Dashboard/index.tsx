import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "../../lib/api"
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
  Clock
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
  const qc = useQueryClient()
  const [copiedKey, setCopiedKey] = useState<string | null>(null)

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
    mutationFn: (id: number) => api.post(`/dashboard/${id}/add_to_calendar`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["calendar"] })
      qc.invalidateQueries({ queryKey: ["dashboard-cards"] })
    }
  })

  function copyText(val: string, key: string) {
    navigator.clipboard.writeText(val)
    setCopiedKey(key)
    setTimeout(() => setCopiedKey(null), 2000)
  }

  function getCardIcon(type: DashboardCard["card_type"]) {
    switch (type) {
      case "travel":       return <Plane size={16} className="text-[#ffaa00]" />
      case "otp":
      case "verification": return <Key size={16} className="text-[#44ff88]" />
      case "tracking":     return <Package size={16} className="text-[#6688ff]" />
      case "invoice":      return <FileText size={16} className="text-[#ff4444]" />
      case "ticket":       return <Ticket size={16} className="text-[#d97706]" />
      case "bank":         return <Building2 size={16} className="text-[#059669]" />
      case "meeting":      return <Calendar size={16} className="text-[#7c3aed]" />
      default:             return <Sparkles size={16} className="text-[#888]" />
    }
  }

  return (
    <div className="h-full flex flex-col bg-[#0a0a0a] overflow-y-auto p-6">
      {/* Dashboard Header */}
      <div className="flex items-center justify-between mb-8 pb-4 border-b border-[#1a1a1a]">
        <div>
          <h1 className="text-xl font-medium text-white flex items-center gap-2">
            <Sparkles size={18} className="text-white" />
            <span>Smart Notice Board (Pano)</span>
          </h1>
          <p className="text-xs text-[#666] mt-0.5">
            Key actionable information extracted from your emails by AI
          </p>
        </div>
        <span className="text-xs text-[#555] px-3 py-1 rounded-full bg-[#111] border border-[#1a1a1a]">
          {cards.length} active notes
        </span>
      </div>

      {isLoading && <div className="text-[#555] text-xs py-8 text-center">Analyzing mailbox...</div>}

      {!isLoading && cards.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Sparkles size={28} className="text-[#333] mb-3" />
          <h3 className="text-sm font-medium text-[#777]">Your Pano is clear</h3>
          <p className="text-xs text-[#444] max-w-sm mt-1">
            When emails containing verification codes, package tracking, flights, or invoices arrive, AI will extract them here.
          </p>
        </div>
      )}

      {/* Grid of Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        <AnimatePresence>
          {cards.map(card => (
            <motion.div
              key={card.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={`p-5 rounded-xl border flex flex-col justify-between transition-all ${
                card.priority === "high"
                  ? "bg-[#141414] border-[#333] shadow-lg shadow-black"
                  : "bg-[#111] border-[#1f1f1f]"
              }`}
            >
              {/* Card Header */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-[#1a1a1a] border border-[#222]">
                      {getCardIcon(card.card_type)}
                    </div>
                    <span className="text-xs uppercase font-medium tracking-wider text-[#aaa]">
                      {card.card_type}
                    </span>
                    {card.priority === "high" && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] bg-[#ffaa0020] text-[#ffaa00] border border-[#ffaa0030]">
                        Urgent
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => dismiss.mutate(card.id)}
                    className="text-[#444] hover:text-white p-1 rounded transition-colors"
                    title="Dismiss"
                  >
                    <X size={14} />
                  </button>
                </div>

                {/* Summary */}
                <p className="text-sm text-[#eee] leading-relaxed mb-4">
                  {card.summary}
                </p>

                {/* Actionable Items */}
                {card.actionable_items && card.actionable_items.length > 0 && (
                  <div className="flex flex-col gap-2 mb-4">
                    {card.actionable_items.map((item, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-2 rounded-lg bg-[#0a0a0a] border border-[#1a1a1a] text-xs"
                      >
                        <span className="text-[#777]">{item.label}</span>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-white font-medium select-all">
                            {item.value}
                          </span>
                          {item.url && (
                            <a
                              href={item.url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[#888] hover:text-white"
                              title="Open link"
                            >
                              <ExternalLink size={12} />
                            </a>
                          )}
                          {item.copyable !== false && (
                            <button
                              onClick={() => copyText(item.value, `card_${card.id}_item_${idx}`)}
                              className="text-[#666] hover:text-white transition-colors"
                              title="Copy"
                            >
                              {copiedKey === `card_${card.id}_item_${idx}` ? (
                                <Check size={12} className="text-[#44ff88]" />
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
              <div className="pt-3 border-t border-[#1a1a1a] flex items-center justify-between text-[11px] text-[#555]">
                <div className="flex items-center gap-1.5">
                  <Clock size={11} />
                  <span>{formatDistanceToNow(new Date(card.created_at), { addSuffix: true })}</span>
                </div>

                {card.calendar_suggestion && (
                  <button
                    onClick={() => addToCalendar.mutate(card.id)}
                    className="flex items-center gap-1 text-[#44ff88] hover:underline transition-colors"
                  >
                    <Calendar size={11} />
                    <span>Add to Calendar</span>
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
