import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "../../lib/api"
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
    <div className="flex flex-col h-full">
      {/* Search & Actions Header */}
      <div className="p-2 border-b border-[#1a1a1a] flex flex-col gap-2 shrink-0">
        <div className="flex items-center gap-1.5 px-2 py-1 bg-[#111] border border-[#222] rounded text-xs">
          <Search size={12} className="text-[#555]" />
          <input
            type="text"
            placeholder="Search emails..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-transparent text-white placeholder-[#555] focus:outline-none text-xs"
          />
        </div>

        <div className="flex items-center justify-between px-1">
          <button
            onClick={() => {
              setMultiSelectMode(m => !m)
              setSelectedIds([])
            }}
            className={`text-[11px] flex items-center gap-1 transition-colors ${
              multiSelectMode ? "text-white font-medium" : "text-[#555] hover:text-white"
            }`}
          >
            {multiSelectMode ? <CheckSquare size={12} /> : <Square size={12} />}
            <span>Select</span>
          </button>

          {multiSelectMode && selectedIds.length >= 2 && (
            <button
              onClick={() => mergeThreads.mutate()}
              disabled={mergeThreads.isPending}
              className="text-[11px] text-[#44ff88] hover:underline flex items-center gap-1"
            >
              <GitMerge size={11} />
              <span>Merge ({selectedIds.length})</span>
            </button>
          )}
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {isLoading && <div className="p-4 text-[#444] text-xs">Loading messages...</div>}
        {!isLoading && filtered.length === 0 && (
          <div className="p-4 text-[#444] text-xs text-center">No messages</div>
        )}

        {filtered.map(email => {
          const isChecked = selectedIds.includes(email.id)
          return (
            <div
              key={email.id}
              onClick={() => onSelect(email.id)}
              className={`flex items-start gap-2.5 p-3 border-b border-[#111] cursor-pointer transition-colors hover:bg-[#111] ${
                selectedId === email.id ? "bg-[#1a1a1a]" : ""
              }`}
            >
              {multiSelectMode && (
                <button
                  type="button"
                  onClick={e => toggleSelect(email.id, e)}
                  className="mt-1 text-[#666] hover:text-white"
                >
                  {isChecked ? (
                    <CheckSquare size={14} className="text-white" />
                  ) : (
                    <Square size={14} />
                  )}
                </button>
              )}

              {/* Avatar */}
              <div className="mt-0.5 shrink-0">
                <SenderAvatar
                  avatarUrl={email.avatar_url}
                  initials={email.avatar_initials || "?"}
                  name={email.sender_name || email.from}
                  size={28}
                  isKnownCompany={email.is_known_company}
                />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start gap-1">
                  <span className={`text-xs truncate ${email.is_read ? "text-[#666]" : "text-white font-medium"}`}>
                    {email.sender_name || email.from}
                  </span>
                  <span className="text-[#333] text-[10px] shrink-0">
                    {formatDistanceToNow(new Date(email.created_at), { addSuffix: true })}
                  </span>
                </div>
                <div className={`text-xs mt-0.5 truncate ${email.is_read ? "text-[#444]" : "text-[#ccc]"}`}>
                  {email.subject}
                </div>
              </div>

              {!email.is_read && <div className="w-1.5 h-1.5 bg-white rounded-full shrink-0 mt-2" />}
            </div>
          )
        })}
      </div>
    </div>
  )
}
