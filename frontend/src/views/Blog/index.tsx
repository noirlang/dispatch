import { useQuery } from "@tanstack/react-query"
import { useParams, Link } from "react-router-dom"
import { formatDistanceToNow } from "date-fns"
import SenderAvatar from "../../components/ui/SenderAvatar"

const BLOG_API = import.meta.env.VITE_API_URL || "http://localhost:3000"

interface Post {
  slug: string
  title: string
  excerpt: string
  author_handle: string
  author_name: string
  author_avatar: string | null
  published_at: string
  url: string
}

interface FullPost extends Post {
  content: string
}

// Blog post list (author or all)
export function BlogIndex() {
  const { handle } = useParams<{ handle?: string }>()

  const { data: posts = [], isLoading } = useQuery({
    queryKey: ["blog", handle],
    queryFn: async () => {
      const path = handle ? `/blog/@${handle}` : "/blog"
      const res = await fetch(`${BLOG_API}${path}`)
      return res.json() as Promise<Post[]>
    },
  })

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      {/* Header */}
      <header className="border-b border-[#1a1a1a] px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/blog" className="text-white font-medium">Dispatch Blog</Link>
          {handle && <span className="text-[#444]">/</span>}
          {handle && (
            <div className="flex items-center gap-2">
              {posts[0] && (
                <SenderAvatar
                  avatarUrl={posts[0].author_avatar}
                  initials={handle.slice(0, 2).toUpperCase()}
                  name={posts[0]?.author_name}
                  size={22}
                />
              )}
              <span className="text-[#888] text-sm">@{handle}</span>
            </div>
          )}
        </div>
        <Link to="/" className="text-[#444] text-sm hover:text-white">← Dispatch</Link>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-12">
        {isLoading && <p className="text-[#444] text-sm">Loading...</p>}
        {!isLoading && posts.length === 0 && (
          <p className="text-[#444] text-sm">No posts yet.</p>
        )}
        <div className="flex flex-col gap-10">
          {posts.map(post => (
            <article key={post.slug}>
              <Link
                to={`/blog/@${post.author_handle}/${post.slug}`}
                className="group block"
              >
                <h2 className="text-white text-xl font-medium group-hover:text-[#ccc] transition-colors mb-2">
                  {post.title}
                </h2>
              </Link>
              <p className="text-[#666] text-sm leading-relaxed mb-3">{post.excerpt}…</p>
              <div className="flex items-center gap-2">
                <SenderAvatar
                  avatarUrl={post.author_avatar}
                  initials={post.author_handle.slice(0, 2).toUpperCase()}
                  name={post.author_name}
                  size={20}
                />
                <Link
                  to={`/blog/@${post.author_handle}`}
                  className="text-[#555] text-xs hover:text-white"
                >
                  @{post.author_handle}
                </Link>
                <span className="text-[#333] text-xs">·</span>
                <span className="text-[#333] text-xs">
                  {formatDistanceToNow(new Date(post.published_at), { addSuffix: true })}
                </span>
              </div>
            </article>
          ))}
        </div>
      </main>
    </div>
  )
}

// Single blog post reader
export function BlogPost() {
  const { handle, slug } = useParams<{ handle: string; slug: string }>()

  const { data: post, isLoading } = useQuery({
    queryKey: ["blog-post", handle, slug],
    queryFn: async () => {
      const res = await fetch(`${BLOG_API}/blog/@${handle}/${slug}`)
      if (!res.ok) throw new Error("Not found")
      return res.json() as Promise<FullPost>
    },
  })

  if (isLoading) return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
      <span className="text-[#444] text-sm">Loading...</span>
    </div>
  )

  if (!post) return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
      <span className="text-[#444] text-sm">Post not found</span>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <header className="border-b border-[#1a1a1a] px-6 py-4">
        <Link to={`/blog/@${handle}`} className="text-[#444] text-sm hover:text-white">
          ← @{handle}
        </Link>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-12">
        <h1 className="text-white text-3xl font-medium mb-4">{post.title}</h1>

        <div className="flex items-center gap-2 mb-10">
          <SenderAvatar
            avatarUrl={post.author_avatar}
            initials={handle!.slice(0, 2).toUpperCase()}
            name={post.author_name}
            size={28}
          />
          <div>
            <Link to={`/blog/@${handle}`} className="text-[#888] text-xs hover:text-white">
              @{post.author_handle}
            </Link>
            <span className="text-[#333] text-xs ml-2">
              {new Date(post.published_at).toLocaleDateString("en-GB", { year: "numeric", month: "long", day: "numeric" })}
            </span>
          </div>
        </div>

        <div className="text-[#bbb] text-sm leading-relaxed whitespace-pre-wrap">
          {post.content}
        </div>
      </main>
    </div>
  )
}
