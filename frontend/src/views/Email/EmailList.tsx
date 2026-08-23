import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "../../lib/api"
import { useT, useDateLocale } from "../../store/themeAndLocale"
import { motion, AnimatePresence } from "framer-motion"
import { formatDistanceToNow } from "date-fns"
import SenderAvatar from "../../components/ui/SenderAvatar"
import { Search, GitMerge, CheckSquare, Square, Flag, Star, Trash2 } from "lucide-react"

interface Email {
  id: number
  from: string
  subject: string
  is_read: boolean
  is_flagged?: boolean
  is_important_sender?: boolean
  created_at: string
  sender_name?: string
  avatar_url?: string | null
  avatar_initials?: string
  is_known_company?: boolean
  is_dispatch_user?: boolean
}

interface Props {
  folder: string
  selectedId: number | null
  onSelect: (id: number) => void
}

export default function EmailList({ folder, selectedId, onSelect }: Props) {
  const t = useT()
  const dateLocale = useDateLocale()
  const qc = useQueryClient()
  const [search, setSearch] = useState("")
  const [multiSelectMode, setMultiSelectMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<number[]>([])

  const { data = [], isLoading } = useQuery({
    queryKey: ["emails", folder],
    queryFn: () => api.get<Email[]>(`/emails?folder=${folder}`),
    refetchInterval: 1500,
  })

  const toggleFlag = useMutation({
    mutationFn: (emailId: number) => api.post(`/emails/${emailId}/toggle_flag`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["emails"] })
    }
  })

  const mergeThreads = useMutation({
    mutationFn: () => api.post("/emails/merge_threads", { thread_ids: selectedIds }),
    onSuccess: () => {
      setSelectedIds([])
      setMultiSelectMode(false)
      qc.invalidateQueries({ queryKey: ["emails"] })
    }
  })

  const bulkAction = useMutation({
    mutationFn: ({ actionType, folderTarget }: { actionType: string; folderTarget?: string }) =>
      api.post("/emails/bulk_action", { ids: selectedIds, action_type: actionType, folder: folderTarget }),
    onSuccess: () => {
      setSelectedIds([])
      qc.invalidateQueries({ queryKey: ["emails"] })
    }
  })

  function toggleSelect(id: number, e: React.MouseEvent) {
    e.stopPropagation()
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  function handleSelectAll() {
    if (selectedIds.length === filtered.length && filtered.length > 0) {
      setSelectedIds([])
    } else {
      setSelectedIds(filtered.map(e => e.id))
    }
  }

  const filtered = data.filter(e => {
    const q = search.toLowerCase()
    return (
      e.subject?.toLowerCase().includes(q) ||
      e.from?.toLowerCase().includes(q) ||
      e.sender_name?.toLowerCase().includes(q)
    )
  })

  const isAllSelected = filtered.length > 0 && selectedIds.length === filtered.length

  return (
    <div className="flex flex-col h-full bg-[var(--bg-primary)]">
      {/* Search & Actions Header */}
      <div className="p-3 border-b border-[var(--border-color)] flex flex-col gap-2.5 shrink-0 bg-[var(--bg-secondary)]">
        <div className="flex items-center gap-2 px-3 py-1.5 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl text-xs shadow-xs">
          <Search size={13} className="text-[var(--text-dim)]" />
          <input
            type="text"
            placeholder={t("search")}
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-transparent text-[var(--text-main)] placeholder-[var(--text-dim)] focus:outline-none text-xs"
          />
        </div>

        <div className="flex items-center justify-between px-1 gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                const nextMode = !multiSelectMode
                setMultiSelectMode(nextMode)
                if (!nextMode) setSelectedIds([])
              }}
              className={`text-xs flex items-center gap-1.5 transition-colors font-medium cursor-pointer ${
                multiSelectMode ? "text-[var(--text-main)] font-bold" : "text-[var(--text-dim)] hover:text-[var(--text-main)]"
              }`}
            >
              {multiSelectMode ? <CheckSquare size={13} /> : <Square size={13} />}
              <span>{t("select")}</span>
            </button>

            {multiSelectMode && (
              <button
                onClick={handleSelectAll}
                className="text-[11px] text-[var(--text-dim)] hover:text-[var(--text-main)] cursor-pointer underline ml-1"
              >
                {isAllSelected ? "Seçimi Kaldır" : "Tümünü Seç"}
              </button>
            )}

            {multiSelectMode && selectedIds.length > 0 && (
              <span className="text-[11px] text-[var(--text-dim)] font-mono">
                ({selectedIds.length})
              </span>
            )}
          </div>

          {/* Action Toolbar on the right of Select */}
          {multiSelectMode && selectedIds.length > 0 && (
            <motion.div
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-1 bg-[var(--bg-primary)] border border-[var(--border-color)] px-1.5 py-0.5 rounded-lg shadow-xs"
            >
              {/* Mark as Read */}
              <button
                onClick={() => bulkAction.mutate({ actionType: "mark_read" })}
                disabled={bulkAction.isPending}
                title="Okundu İşaretle"
                className="p-1 rounded hover:bg-[var(--bg-secondary)] text-[var(--text-dim)] hover:text-[var(--text-main)] transition-colors cursor-pointer"
              >
                <CheckSquare size={12} />
              </button>

              {/* Mark as Unread */}
              <button
                onClick={() => bulkAction.mutate({ actionType: "mark_unread" })}
                disabled={bulkAction.isPending}
                title="Okunmadı İşaretle"
                className="p-1 rounded hover:bg-[var(--bg-secondary)] text-[var(--text-dim)] hover:text-[var(--text-main)] transition-colors cursor-pointer"
              >
                <Square size={12} />
              </button>

              {/* Move to Inbox (e.g. from Approvals without approving) */}
              {folder !== "inbox" && (
                <button
                  onClick={() => bulkAction.mutate({ actionType: "move_inbox" })}
                  disabled={bulkAction.isPending}
                  title="Gelen Kutusuna Taşı"
                  className="px-1.5 py-0.5 rounded hover:bg-[var(--bg-secondary)] text-[11px] font-medium text-[#3b82f6] transition-colors cursor-pointer flex items-center gap-0.5"
                >
                  Gelen Kutusuna Taşı
                </button>
              )}

              {/* Toggle Flag */}
              <button
                onClick={() => bulkAction.mutate({ actionType: "toggle_flag" })}
                disabled={bulkAction.isPending}
                title="Bayrak Ekle / Kaldır"
                className="p-1 rounded hover:bg-[var(--bg-secondary)] text-[var(--text-dim)] hover:text-[#eab308] transition-colors cursor-pointer"
              >
                <Flag size={12} />
              </button>

              {/* Delete / Move to Trash */}
              <button
                onClick={() => bulkAction.mutate({ actionType: "move_trash" })}
                disabled={bulkAction.isPending}
                title="Çöp Kutusuna Taşı"
                className="p-1 rounded hover:bg-[var(--bg-secondary)] text-[var(--text-dim)] hover:text-[#ef4444] transition-colors cursor-pointer"
              >
                <Trash2 size={12} />
              </button>

              {/* Merge Threads (if >= 2 selected) */}
              {selectedIds.length >= 2 && (
                <button
                  onClick={() => mergeThreads.mutate()}
                  disabled={mergeThreads.isPending}
                  title="Seçilenleri Birleştir"
                  className="px-1.5 py-0.5 rounded hover:bg-[var(--bg-secondary)] text-[11px] font-bold text-[#22c55e] transition-colors cursor-pointer flex items-center gap-0.5 ml-0.5"
                >
                  <GitMerge size={11} />
                  <span>Birleştir</span>
                </button>
              )}
            </motion.div>
          )}
        </div>
      </div>


      {/* Email List Items */}
      <div className="flex-1 overflow-y-auto">
        {isLoading && <div className="p-6 text-[var(--text-dim)] text-xs text-center">Loading...</div>}
        {!isLoading && filtered.length === 0 && (
          <div className="p-8 text-[var(--text-dim)] text-xs text-center">{t("no_messages")}</div>
        )}

        <AnimatePresence>
          {filtered.map((email, idx) => {
            const isChecked = selectedIds.includes(email.id)
            const isSelected = selectedId === email.id
            const showWhiteBar = isSelected || email.is_flagged

            return (
              <motion.div
                key={email.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.15, delay: idx * 0.02 }}
                whileHover={{ x: 2 }}
                onClick={() => onSelect(email.id)}
                className={`flex items-start gap-3 p-3.5 border-b border-[var(--border-color)] cursor-pointer transition-all select-none group relative ${
                  isSelected
                    ? "bg-[var(--bg-secondary)]"
                    : "hover:bg-[var(--bg-secondary)]"
                }`}
              >
                {/* Crisp Left White Bar Indicator (Look at photo 2 & 3) */}
                {showWhiteBar && (
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-white" />
                )}

                {multiSelectMode && (
                  <button
                    type="button"
                    onClick={e => toggleSelect(email.id, e)}
                    className="mt-1 text-[var(--text-dim)] hover:text-[var(--text-main)]"
                  >
                    {isChecked ? (
                      <CheckSquare size={15} className="text-[var(--text-main)]" />
                    ) : (
                      <Square size={15} />
                    )}
                  </button>
                )}

                {/* Avatar */}
                <div className="mt-0.5 shrink-0">
                  <SenderAvatar
                    avatarUrl={email.avatar_url}
                    initials={email.avatar_initials || "?"}
                    name={email.sender_name || email.from}
                    size={32}
                    isKnownCompany={email.is_known_company}
                  />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start gap-1">
                    <span className={`text-xs truncate flex items-center gap-1.5 ${email.is_read ? "text-[var(--text-muted)] font-normal" : "text-[var(--text-main)] font-bold"}`}>
                      <span className="truncate">{email.sender_name || email.from}</span>
                      {email.is_dispatch_user && (
                        <span title="Dispatch Kullanıcısı" className="inline-flex items-center gap-0.5 px-1 py-0.2 rounded bg-[var(--bg-primary)] border border-[var(--border-color)] text-[9px] font-bold text-[var(--text-main)] shrink-0 select-none">
                          <img src="/dispatch.png" alt="" className="h-2.5 w-auto object-contain" />
                          <span>Dispatch</span>
                        </span>
                      )}
                      {email.is_important_sender && (
                        <span title="Önemli Kişi" className="shrink-0 flex items-center">
                          <Star size={11} className="fill-[#f59e0b] text-[#f59e0b]" />
                        </span>
                      )}
                    </span>
                    <span className="text-[var(--text-dim)] text-[10px] shrink-0 font-mono">
                      {formatDistanceToNow(new Date(email.created_at), { addSuffix: true, locale: dateLocale })}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-1 mt-1">
                    <span className={`text-xs truncate ${email.is_read ? "text-[var(--text-dim)]" : "text-[var(--text-main)] font-medium"}`}>
                      {email.subject || "(No Subject)"}
                    </span>

                    {/* Flag Icon (Below timestamp, turns yellow on click) */}
                    <button
                      type="button"
                      onClick={e => {
                        e.stopPropagation()
                        toggleFlag.mutate(email.id)
                      }}
                      className="p-0.5 text-[var(--text-dim)] hover:text-[#f59e0b] transition-colors shrink-0"
                      title={email.is_flagged ? "Bayrağı Kaldır" : "Bayrak Ekle"}
                    >
                      <Flag
                        size={12}
                        className={
                          email.is_flagged
                            ? "fill-[#f59e0b] text-[#f59e0b]"
                            : "text-[var(--text-dim)] hover:text-[#f59e0b] opacity-0 group-hover:opacity-100 transition-opacity"
                        }
                      />
                    </button>
                  </div>
                </div>

                {!email.is_read && (
                  <div className="w-2 h-2 bg-[#3b82f6] rounded-full shrink-0 mt-2" title="Unread" />
                )}
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>
    </div>
  )
}
