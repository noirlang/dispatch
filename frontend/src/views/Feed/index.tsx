import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "../../lib/api"
import { useState } from "react"
import { formatDistanceToNow } from "date-fns"
import { Plus, ExternalLink } from "lucide-react"

interface RssItem {
  id: number
  title: string
  url: string
  author: string
  published_at: string
  is_read: boolean
  rss_feed_id: number
}

export default function FeedView() {
  const qc = useQueryClient()
  const [addUrl, setAddUrl] = useState("")
  const [showAdd, setShowAdd] = useState(false)

  const { data: items = [] } = useQuery({
    queryKey: ["rss-items"],
    queryFn: () => api.get<RssItem[]>("/rss/items"),
    refetchInterval: 60_000,
  })

  const markRead = useMutation({
    mutationFn: (id: number) => api.patch(`/rss/items/${id}/read`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["rss-items"] }),
  })

  const addFeed = useMutation({
    mutationFn: () => api.post("/rss/feeds", { url: addUrl }),
    onSuccess: () => { setAddUrl(""); setShowAdd(false); qc.invalidateQueries({ queryKey: ["rss-items"] }) },
  })

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#1a1a1a] shrink-0">
        <span className="text-white text-sm font-medium">Feed</span>
        <button onClick={() => setShowAdd(s => !s)} className="text-[#666] hover:text-white">
          <Plus size={16} />
        </button>
      </div>

      {showAdd && (
        <div className="px-4 py-3 border-b border-[#1a1a1a] flex gap-2">
          <input
            value={addUrl}
            onChange={e => setAddUrl(e.target.value)}
            placeholder="RSS feed URL..."
            className="flex-1 bg-[#111] border border-[#222] text-white text-xs px-3 py-2 rounded focus:outline-none focus:border-[#444]"
          />
          <button
            onClick={() => addFeed.mutate()}
            className="bg-white text-black text-xs px-3 py-2 rounded hover:bg-[#e0e0e0]"
          >
            Add
          </button>
        </div>
      )}

      <div className="flex-1 overflow-auto">
        {items.length === 0 && (
          <div className="p-4 text-[#333] text-xs">No feeds yet. Add one with +</div>
        )}
        {items.map(item => (
          <div
            key={item.id}
            onClick={() => markRead.mutate(item.id)}
            className={`p-3 border-b border-[#0f0f0f] cursor-pointer hover:bg-[#0f0f0f] transition-colors ${
              item.is_read ? "opacity-50" : ""
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <span className={`text-xs flex-1 leading-tight ${item.is_read ? "text-[#555]" : "text-[#ccc]"}`}>
                {item.title}
              </span>
              <a
                href={item.url}
                target="_blank"
                rel="noreferrer"
                onClick={e => e.stopPropagation()}
                className="text-[#333] hover:text-white shrink-0 mt-0.5"
              >
                <ExternalLink size={11} />
              </a>
            </div>
            <div className="text-[#333] text-[10px] mt-1">
              {item.published_at ? formatDistanceToNow(new Date(item.published_at), { addSuffix: true }) : ""}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
