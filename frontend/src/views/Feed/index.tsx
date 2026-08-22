import { useState, useMemo } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "../../lib/api"
import { useT, useDateLocale } from "../../store/themeAndLocale"
import { motion, AnimatePresence } from "framer-motion"
import { formatDistanceToNow, format } from "date-fns"
import { Plus, ExternalLink, Rss, BookOpen, Clock, X, RotateCw, Image } from "lucide-react"
import DOMPurify from "dompurify"

interface RssFeed {
  id: number
  url: string
  title: string
  description?: string
  category?: string
  refresh_interval?: number
  last_fetched_at?: string
  item_count: number
  unread_count: number
}

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
  feed_title?: string
}

export default function FeedView() {
  const t = useT()
  const dateLocale = useDateLocale()
  const qc = useQueryClient()
  const [addUrl, setAddUrl] = useState("")
  const [showAdd, setShowAdd] = useState(false)
  const [selectedFeedId, setSelectedFeedId] = useState<number | null>(null)
  const [selectedArticle, setSelectedArticle] = useState<RssItem | null>(null)
  const [allowImages, setAllowImages] = useState(false)

  const { data: feeds = [] } = useQuery({
    queryKey: ["rss-feeds"],
    queryFn: () => api.get<RssFeed[]>("/rss/feeds"),
  })

  const { data: items = [], isLoading, isFetching } = useQuery({
    queryKey: ["rss-items", selectedFeedId],
    queryFn: () => api.get<RssItem[]>(`/rss/items${selectedFeedId ? `?feed_id=${selectedFeedId}` : ""}`),
    refetchInterval: 60_000,
  })

  const markRead = useMutation({
    mutationFn: (id: number) => api.patch(`/rss/items/${id}/read`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["rss-items"] })
      qc.invalidateQueries({ queryKey: ["rss-feeds"] })
    },
  })

  const addFeed = useMutation({
    mutationFn: () => api.post("/rss/feeds", { url: addUrl }),
    onSuccess: () => {
      setAddUrl("")
      setShowAdd(false)
      qc.invalidateQueries({ queryKey: ["rss-items"] })
      qc.invalidateQueries({ queryKey: ["rss-feeds"] })
    },
  })

  const refreshAll = useMutation({
    mutationFn: async () => {
      if (selectedFeedId) {
        await api.post(`/rss/feeds/${selectedFeedId}/refresh`)
      } else {
        for (const f of feeds) {
          await api.post(`/rss/feeds/${f.id}/refresh`).catch(() => {})
        }
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["rss-items"] })
      qc.invalidateQueries({ queryKey: ["rss-feeds"] })
    }
  })

  function handleOpenArticle(item: RssItem) {
    setSelectedArticle(item)
    setAllowImages(false)
    if (!item.is_read) {
      markRead.mutate(item.id)
    }
  }

  const rawArticleContent = selectedArticle ? (selectedArticle.content || selectedArticle.title || "") : ""
  const hasImages = rawArticleContent.includes("<img") || rawArticleContent.includes("&lt;img") || rawArticleContent.includes("<iframe")

  const sanitizedArticleHtml = useMemo(() => {
    if (!rawArticleContent) return ""
    if (allowImages) {
      // Ensure all img tags have referrerpolicy="no-referrer" and graceful fallback on 403 hotlink blocks
      let html = rawArticleContent.replace(
        /<img\s+([^>]*?)(\/?)>/gi,
        (_match, attrs, slash) => {
          let cleanAttrs = attrs
          if (!cleanAttrs.includes("referrerpolicy")) {
            cleanAttrs += ' referrerpolicy="no-referrer"'
          }
          if (!cleanAttrs.includes("loading")) {
            cleanAttrs += ' loading="lazy"'
          }
          const fallbackJs = `this.onerror=null; if(this.parentElement && this.parentElement.tagName==='A'){ this.parentElement.innerHTML='<span style=\\'display:inline-flex;align-items:center;gap:6px;padding:6px 12px;margin:8px 0;border-radius:10px;background:var(--bg-primary);border:1px solid var(--border-color);font-size:12px;color:var(--text-main);font-weight:600;\\'>🖼️ Görseli Kaynağında Görüntüle ↗</span>'; } else { this.outerHTML='<a href=\\''+this.src+'\\' target=\\'_blank\\' rel=\\'noreferrer\\' style=\\'display:inline-flex;align-items:center;gap:6px;padding:6px 12px;margin:8px 0;border-radius:10px;background:var(--bg-primary);border:1px solid var(--border-color);font-size:12px;color:var(--text-main);font-weight:600;text-decoration:none;\\'>🖼️ Görseli Aç ↗</a>'; }`
          return `<img ${cleanAttrs} onerror="${fallbackJs}" ${slash}>`
        }
      )

      return DOMPurify.sanitize(html, {
        ADD_TAGS: ["iframe", "img", "figure", "figcaption", "span", "div"],
        ADD_ATTR: [
          "target",
          "src",
          "srcset",
          "alt",
          "width",
          "height",
          "loading",
          "referrerpolicy",
          "crossorigin",
          "allowfullscreen",
          "style",
          "onerror",
          "data-download-href",
          "data-base62-sha1",
          "data-dominant-color"
        ]
      })
    }
    return DOMPurify.sanitize(rawArticleContent, {
      FORBID_TAGS: ["img", "iframe"],
      FORBID_ATTR: ["src", "srcset"]
    })
  }, [rawArticleContent, allowImages])

  return (
    <div className="h-full flex flex-col max-w-6xl mx-auto p-6 animate-fadeIn">
      {/* Feed Header */}
      <div className="flex items-center justify-between pb-4 mb-3 border-b border-[var(--border-color)]">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)]">
            <Rss size={18} className="text-[#f59e0b]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[var(--text-main)]">{t("feed")}</h1>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              Canlı haberler, bloglar ve bültenler okuyucusu
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <motion.button
            whileTap={{ scale: 0.94 }}
            whileHover={{ scale: 1.03 }}
            onClick={() => refreshAll.mutate()}
            disabled={refreshAll.isPending || isFetching}
            title="Akışları Yenile"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] text-xs font-semibold text-[var(--text-muted)] hover:text-[var(--text-main)] transition-all shadow-xs"
          >
            <RotateCw size={13} className={refreshAll.isPending || isFetching ? "animate-spin text-[#f59e0b]" : ""} />
            <span>Yenile</span>
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.94 }}
            whileHover={{ scale: 1.03 }}
            onClick={() => setShowAdd((s) => !s)}
            className="flex items-center gap-1.5 bg-[var(--accent)] text-[var(--accent-invert)] px-4 py-2 rounded-xl text-xs font-bold hover:opacity-90 transition-all shadow-sm"
          >
            <Plus size={14} />
            <span>{t("add_feed")}</span>
          </motion.button>
        </div>
      </div>

      {/* Subscribed Feed Filter Chips */}
      {feeds.length > 0 && (
        <div className="flex items-center gap-2 pb-3 mb-2 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setSelectedFeedId(null)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold shrink-0 transition-colors cursor-pointer ${
              selectedFeedId === null
                ? "bg-[var(--text-main)] text-[var(--bg-primary)] shadow-xs"
                : "bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-muted)] hover:text-[var(--text-main)]"
            }`}
          >
            Tüm Akışlar ({items.length})
          </button>
          {feeds.map((feed) => (
            <button
              key={feed.id}
              onClick={() => setSelectedFeedId(feed.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold shrink-0 transition-colors flex items-center gap-2 cursor-pointer ${
                selectedFeedId === feed.id
                  ? "bg-[var(--text-main)] text-[var(--bg-primary)] shadow-xs"
                  : "bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-muted)] hover:text-[var(--text-main)]"
              }`}
            >
              <span className="truncate max-w-[150px]">{feed.title}</span>
              {feed.unread_count > 0 && (
                <span className={`px-1.5 py-0.2 rounded-md text-[10px] font-bold ${
                  selectedFeedId === feed.id ? "bg-[var(--bg-primary)] text-[var(--text-main)]" : "bg-[#f59e0b20] text-[#f59e0b]"
                }`}>
                  {feed.unread_count}
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Add Feed Input Bar */}
      <AnimatePresence>
        {showAdd && (
          <motion.div
            initial={{ opacity: 0, height: 0, y: -10 }}
            animate={{ opacity: 1, height: "auto", y: 0 }}
            exit={{ opacity: 0, height: 0, y: -10 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="p-4 mb-4 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-color)] flex items-center gap-3 shadow-xs overflow-hidden"
          >
            <input
              autoFocus
              value={addUrl}
              onChange={(e) => setAddUrl(e.target.value)}
              placeholder="https://example.com/feed.xml veya https://site.com"
              className="flex-1 bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-main)] text-xs px-4 py-2.5 rounded-xl focus:outline-none focus:border-[var(--text-main)] font-mono"
            />
            <motion.button
              whileTap={{ scale: 0.94 }}
              onClick={() => addFeed.mutate()}
              disabled={addFeed.isPending || !addUrl}
              className="bg-[var(--accent)] text-[var(--accent-invert)] text-xs font-bold px-5 py-2.5 rounded-xl hover:opacity-90 transition-all disabled:opacity-40 shadow-xs shrink-0"
            >
              {addFeed.isPending ? "Ekleniyor & Çekiliyor..." : "Abone Ol"}
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Feed Content with Animated Resizing and Reader Drawer */}
      <div className="flex-1 flex gap-6 overflow-hidden relative">
        {/* Article Cards Stream - smoothly resizes with layout animation */}
        <motion.div
          layout
          transition={{ type: "spring", damping: 28, stiffness: 260 }}
          className={`overflow-y-auto pr-2 flex flex-col gap-3 transition-all ${
            selectedArticle ? "w-1/2" : "w-full"
          }`}
        >
          {isLoading && (
            <div className="p-8 text-center text-xs text-[var(--text-dim)]">Loading feeds...</div>
          )}

          {!isLoading && items.length === 0 && (
            <div className="p-16 text-center text-xs text-[var(--text-dim)] flex flex-col items-center gap-2">
              <BookOpen size={28} className="opacity-40" />
              <span>No RSS feed subscriptions yet. Click "+ Feed" to subscribe.</span>
            </div>
          )}

          {items.map((item, idx) => {
            const isSelected = selectedArticle?.id === item.id
            return (
              <motion.div
                layout
                key={item.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.02 }}
                whileHover={{ y: -2, scale: 1.008 }}
                whileTap={{ scale: 0.99 }}
                onClick={() => handleOpenArticle(item)}
                className={`p-5 rounded-2xl border cursor-pointer transition-all select-none ${
                  isSelected
                    ? "bg-[var(--bg-secondary)] border-[var(--text-main)] shadow-sm"
                    : item.is_read
                    ? "bg-[var(--bg-primary)] border-[var(--border-color)] opacity-75 hover:opacity-100"
                    : "bg-[var(--bg-card)] border-[var(--border-color)] hover:border-[var(--text-muted)] shadow-xs"
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    {item.feed_title && (
                      <span className="inline-block px-2 py-0.5 mb-1.5 rounded-md bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[10px] font-bold text-[#f59e0b] truncate max-w-full">
                        {item.feed_title}
                      </span>
                    )}
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
                    <span>{item.published_at ? formatDistanceToNow(new Date(item.published_at), { addSuffix: true, locale: dateLocale }) : ""}</span>
                  </span>
                  {!item.is_read && (
                    <span className="ml-auto w-2 h-2 rounded-full bg-[#3b82f6]" title="Unread" />
                  )}
                </div>
              </motion.div>
            )
          })}
        </motion.div>

        {/* In-App Full Article Reader Drawer - slides in from right with spring damping */}
        <AnimatePresence>
          {selectedArticle && (
            <motion.div
              layout
              key={`article-${selectedArticle.id}`}
              initial={{ opacity: 0, x: 100, scale: 0.96 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 100, scale: 0.96 }}
              transition={{ type: "spring", damping: 25, stiffness: 220 }}
              className="w-1/2 border border-[var(--border-color)] rounded-2xl bg-[var(--bg-secondary)] p-6 overflow-y-auto flex flex-col shadow-xl"
            >
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

                  {/* Resimlere Güven Button */}
                  <button
                    type="button"
                    onClick={() => setAllowImages((prev) => !prev)}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer shadow-xs ${
                      allowImages
                        ? "bg-[#10b98115] border-[#10b98140] text-[#10b981]"
                        : "bg-[var(--bg-primary)] border-[var(--border-color)] text-[var(--text-muted)] hover:text-[var(--text-main)]"
                    }`}
                    title={allowImages ? "Resimler açık (Güvenildi)" : "Harici resimleri ve görselleri yükle"}
                  >
                    <Image size={12} className={allowImages ? "text-[#10b981]" : "text-[var(--text-dim)]"} />
                    <span>{allowImages ? "Resimler Açık" : "Resimlere Güven"}</span>
                  </button>

                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setSelectedArticle(null)}
                    className="p-1.5 text-[var(--text-dim)] hover:text-[var(--text-main)] rounded-lg hover:bg-[var(--bg-card)]"
                  >
                    <X size={16} />
                  </motion.button>
                </div>
              </div>

              {/* Article Title */}
              <h2 className="text-2xl font-extrabold text-[var(--text-main)] mb-3 leading-tight">
                {selectedArticle.title}
              </h2>

              {/* Metadata */}
              <div className="flex items-center gap-3 pb-4 mb-4 border-b border-[var(--border-color)] text-xs text-[var(--text-dim)]">
                {selectedArticle.author && (
                  <span className="font-semibold text-[var(--text-main)]">
                    By {selectedArticle.author}
                  </span>
                )}
                {selectedArticle.published_at && (
                  <span>{format(new Date(selectedArticle.published_at), "PPP p", { locale: dateLocale })}</span>
                )}
              </div>

              {/* Image security warning banner if images exist and blocked */}
              {hasImages && !allowImages && (
                <div className="flex items-center justify-between p-3 mb-6 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] text-xs text-[var(--text-muted)]">
                  <div className="flex items-center gap-2">
                    <Image size={14} className="text-[var(--text-dim)] shrink-0" />
                    <span>Dış görseller gizliliğiniz için engellendi.</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAllowImages(true)}
                    className="font-bold text-[var(--text-main)] hover:underline ml-2 shrink-0 cursor-pointer"
                  >
                    Resimlere Güven
                  </button>
                </div>
              )}

              {/* Content with Clean HTML sanitization */}
              <div
                className="prose prose-neutral dark:prose-invert max-w-none text-sm leading-relaxed"
                dangerouslySetInnerHTML={{
                  __html: sanitizedArticleHtml
                }}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
