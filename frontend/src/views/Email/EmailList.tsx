import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "../../lib/api"
import { useT } from "../../store/themeAndLocale"
import { motion, AnimatePresence } from "framer-motion"
import { formatDistanceToNow } from "date-fns"
import SenderAvatar from "../../components/ui/SenderAvatar"
import { Search, GitMerge, CheckSquare, Square } from "lucide-react"

interface Email {
  id: number
  from: string
  subject: string
  is_read: boolean
  created_at: string
  sender_name?: string
  avatar_url?: string | null
  avatar_initials?: string
  is_known_company?: boolean
}

interface Props {
  folder: string
  selectedId: number | null
  onSelect: (id: number) => void
}

export default function EmailList({ folder, selectedId, onSelect }: Props) {
  const t = useT()
  const qc = useQueryClient()
  const [search, setSearch] = useState("")
  const [multiSelectMode, setMultiSelectMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<number[]>([])

  const { data = [], isLoading } = useQuery({
    queryKey: ["emails", folder],
    queryFn: () => api.get<Email[]>(`/emails?folder=${folder}`),
  })

  const mergeThreads = useMutation({
    mutationFn: () => api.post("/emails/merge_threads", { thread_ids: selectedIds }),
    onSuccess: () => {
      setSelectedIds([])
      setMultiSelectMode(false)
      qc.invalidateQueries({ queryKey: ["emails"] })
    }
  })

  function toggleSelect(id: number, e: React.MouseEvent) {
    e.stopPropagation()
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  const filtered = data.filter(e => {
    const q = search.toLowerCase()
    return (
      e.subject?.toLowerCase().includes(q) ||
      e.from?.toLowerCase().includes(q) ||
      e.sender_name?.toLowerCase().includes(q)
    )
  })

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

        <div className="flex items-center justify-between px-1">
          <button
            onClick={() => {
              setMultiSelectMode(m => !m)
              setSelectedIds([])
            }}
            className={`text-xs flex items-center gap-1.5 transition-colors font-medium ${
              multiSelectMode ? "text-[var(--text-main)] font-bold" : "text-[var(--text-dim)] hover:text-[var(--text-main)]"
            }`}
          >
            {multiSelectMode ? <CheckSquare size={13} /> : <Square size={13} />}
            <span>{t("select")}</span>
          </button>

          {multiSelectMode && selectedIds.length >= 2 && (
            <button
              onClick={() => mergeThreads.mutate()}
              disabled={mergeThreads.isPending}
              className="text-xs text-[#22c55e] hover:underline flex items-center gap-1 font-bold"
            >
              <GitMerge size={12} />
              <span>{t("merge")} ({selectedIds.length})</span>
            </button>
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

            return (
              <motion.div
                key={email.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.15, delay: idx * 0.02 }}
                whileHover={{ x: 3 }}
                onClick={() => onSelect(email.id)}
                className={`flex items-start gap-3 p-3.5 border-b border-[var(--border-color)] cursor-pointer transition-all select-none ${
                  isSelected
                    ? "bg-[var(--bg-secondary)] border-l-4 border-l-[var(--accent)]"
                    : "hover:bg-[var(--bg-secondary)]"
                }`}
              >
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
                    <span className={`text-xs truncate ${email.is_read ? "text-[var(--text-muted)] font-normal" : "text-[var(--text-main)] font-bold"}`}>
                      {email.sender_name || email.from}
                    </span>
                    <span className="text-[var(--text-dim)] text-[10px] shrink-0 font-mono">
                      {formatDistanceToNow(new Date(email.created_at), { addSuffix: true })}
                    </span>
                  </div>
                  <div className={`text-xs mt-1 truncate ${email.is_read ? "text-[var(--text-dim)]" : "text-[var(--text-main)] font-medium"}`}>
                    {email.subject || "(No Subject)"}
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
