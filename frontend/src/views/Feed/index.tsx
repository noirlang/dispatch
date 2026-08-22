import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "../../lib/api"
import { useT } from "../../store/themeAndLocale"
import { formatDistanceToNow, format } from "date-fns"
import { Plus, ExternalLink, Rss, BookOpen, Clock, Check, X, RefreshCw } from "lucide-react"
import DOMPurify from "dompurify"

interface RssItem {
  id: number
  title: string
  content?: string
  url: string
  author?: string
  published_at: string
  is_read: boolean
  starred: boolean
  rss_feed_id: number
}

export default function FeedView() {
  const t = useT()
  const qc = useQueryClient()
  const [addUrl, setAddUrl] = useState("")
  const [showAdd, setShowAdd] = useState(false)
  const [selectedArticle, setSelectedArticle] = useState<RssItem | null>(null)

  const { data: items = [], isLoading } = useQuery({
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
    onSuccess: () => {
      setAddUrl("")
      setShowAdd(false)
      qc.invalidateQueries({ queryKey: ["rss-items"] })
    },
  })

  function handleOpenArticle(item: RssItem) {
    setSelectedArticle(item)
    if (!item.is_read) {
      markRead.mutate(item.id)
    }
  }

  return (
    <div className="h-full flex flex-col max-w-6xl mx-auto p-6 animate-fadeIn">
      {/* Feed Header */}
      <div className="flex items-center justify-between pb-6 mb-4 border-b border-[var(--border-color)]">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)]">
            <Rss size={18} className="text-[var(--text-main)]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[var(--text-main)]">{t("feed")}</h1>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              Live news, blogs, and newsletters reader with in-app article view
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowAdd((s) => !s)}
            className="flex items-center gap-1.5 bg-[var(--accent)] text-[var(--accent-invert)] px-4 py-2 rounded-xl text-xs font-bold hover:opacity-90 transition-all shadow-sm"
          >
            <Plus size={14} />
            <span>{t("add_feed")}</span>
          </button>
        </div>
      </div>

      {/* Add Feed Input Bar */}
      {showAdd && (
        <div className="p-4 mb-4 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-color)] flex items-center gap-3 shadow-xs animate-fadeIn">
          <input
            value={addUrl}
            onChange={(e) => setAddUrl(e.target.value)}
            placeholder={t("feed_url_placeholder")}
            className="flex-1 bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-main)] text-xs px-4 py-2.5 rounded-xl focus:outline-none focus:border-[var(--text-main)]"
          />
          <button
            onClick={() => addFeed.mutate()}
            disabled={addFeed.isPending || !addUrl}
            className="bg-[var(--accent)] text-[var(--accent-invert)] text-xs font-bold px-5 py-2.5 rounded-xl hover:opacity-90 transition-all disabled:opacity-40"
          >
            {addFeed.isPending ? "Adding..." : "Subscribe"}
          </button>
        </div>
      )}

      {/* Main Feed Content (Grid List + Reader Drawer) */}
      <div className="flex-1 flex gap-6 overflow-hidden">
        {/* Article Cards Stream */}
        <div className="flex-1 overflow-y-auto pr-2 flex flex-col gap-3">
          {isLoading && (
            <div className="p-8 text-center text-xs text-[var(--text-dim)]">Loading feeds...</div>
          )}

          {!isLoading && items.length === 0 && (
            <div className="p-16 text-center text-xs text-[var(--text-dim)] flex flex-col items-center gap-2">
              <BookOpen size={28} className="opacity-40" />
              <span>No RSS feed subscriptions yet. Click "+ Feed" to subscribe.</span>
            </div>
          )}

          {items.map((item) => {
            const isSelected = selectedArticle?.id === item.id
            return (
              <div
                key={item.id}
                onClick={() => handleOpenArticle(item)}
                className={`p-5 rounded-2xl border cursor-pointer transition-all ${
                  isSelected
                    ? "bg-[var(--bg-secondary)] border-[var(--text-main)] shadow-sm"
                    : item.is_read
                    ? "bg-[var(--bg-primary)] border-[var(--border-color)] opacity-75 hover:opacity-100"
                    : "bg-[var(--bg-card)] border-[var(--border-color)] hover:border-[var(--text-muted)] shadow-xs"
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h3 className={`text-base font-bold leading-snug mb-1.5 ${item.is_read ? "text-[var(--text-muted)]" : "text-[var(--text-main)]"}`}>
                      {item.title}
                    </h3>
                    {item.content && (
                      <p className="text-xs text-[var(--text-muted)] line-clamp-2 leading-relaxed">
                        {item.content.replace(/<[^>]+>/g, "").trim()}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="p-1.5 text-[var(--text-dim)] hover:text-[var(--text-main)] hover:bg-[var(--bg-secondary)] rounded-lg transition-colors"
                      title="Open Original Source"
                    >
                      <ExternalLink size={14} />
                    </a>
                  </div>
                </div>

                <div className="flex items-center gap-3 mt-3 pt-3 border-t border-[var(--border-color)] text-[11px] text-[var(--text-dim)]">
                  {item.author && <span className="font-semibold text-[var(--text-muted)]">{item.author}</span>}
                  <span>·</span>
                  <span className="flex items-center gap-1">
                    <Clock size={11} />
                    <span>{item.published_at ? formatDistanceToNow(new Date(item.published_at), { addSuffix: true }) : ""}</span>
                  </span>
                  {!item.is_read && (
                    <span className="ml-auto w-2 h-2 rounded-full bg-[#3b82f6]" title="Unread" />
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* In-App Full Article Reader Drawer (Side-by-side or Floating) */}
        {selectedArticle && (
          <div className="w-1/2 border border-[var(--border-color)] rounded-2xl bg-[var(--bg-secondary)] p-6 overflow-y-auto flex flex-col shadow-lg animate-fadeIn">
            {/* Reader Header */}
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-[var(--border-color)]">
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-dim)]">
                In-App Reader
              </span>
              <div className="flex items-center gap-2">
                <a
                  href={selectedArticle.url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 text-xs text-[var(--text-main)] underline font-medium px-2 py-1"
                >
                  <ExternalLink size={12} />
                  <span>Open in Browser</span>
                </a>
                <button
                  onClick={() => setSelectedArticle(null)}
                  className="p-1 text-[var(--text-dim)] hover:text-[var(--text-main)] rounded-lg hover:bg-[var(--bg-card)]"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Article Title */}
            <h2 className="text-2xl font-extrabold text-[var(--text-main)] mb-3 leading-tight">
              {selectedArticle.title}
            </h2>

            {/* Metadata */}
            <div className="flex items-center gap-3 pb-4 mb-6 border-b border-[var(--border-color)] text-xs text-[var(--text-dim)]">
              {selectedArticle.author && (
                <span className="font-semibold text-[var(--text-main)]">
                  By {selectedArticle.author}
                </span>
              )}
              {selectedArticle.published_at && (
                <span>{format(new Date(selectedArticle.published_at), "PPP p")}</span>
              )}
            </div>

            {/* Content with Clean HTML sanitization */}
            <div
              className="prose prose-neutral dark:prose-invert max-w-none text-sm leading-relaxed"
              dangerouslySetInnerHTML={{
                __html: DOMPurify.sanitize(
                  selectedArticle.content || selectedArticle.title
                ),
              }}
            />
          </div>
        )}
      </div>
    </div>
  )
}
