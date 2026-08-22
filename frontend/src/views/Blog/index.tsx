import { useQuery } from "@tanstack/react-query"
import { useParams, Link } from "react-router-dom"
import { formatDistanceToNow, format } from "date-fns"
import SenderAvatar from "../../components/ui/SenderAvatar"
import ReactMarkdown from "react-markdown"
import { ArrowLeft, BookOpen, Clock } from "lucide-react"

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

// Blog post list (Author profile or Global stream)
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

  const author = posts[0]

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-main)] flex flex-col">
      {/* Top Navbar */}
      <header className="border-b border-[var(--border-color)] bg-[var(--bg-secondary)] px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/blog" className="text-base font-semibold tracking-tight text-[var(--text-main)] flex items-center gap-2">
            <BookOpen size={17} />
            <span>Dispatch Blog</span>
          </Link>
          {handle && (
            <>
              <span className="text-[var(--text-dim)]">/</span>
              <span className="text-xs font-mono text-[var(--text-muted)]">@{handle}</span>
            </>
          )}
        </div>
        <Link
          to="/"
          className="text-xs text-[var(--text-muted)] hover:text-[var(--text-main)] flex items-center gap-1 transition-colors"
        >
          <ArrowLeft size={13} />
          <span>Back to Webmail</span>
        </Link>
      </header>

      {/* Main Content */}
      <main className="max-w-3xl mx-auto px-6 py-12 w-full flex-1">
        {/* Author Profile Header (when viewing @handle) */}
        {handle && author && (
          <div className="flex items-center gap-5 p-6 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-color)] mb-12 shadow-sm">
            <SenderAvatar
              avatarUrl={author.author_avatar}
              initials={author.author_handle.slice(0, 2).toUpperCase()}
              name={author.author_name}
              size={64}
            />
            <div>
              <h1 className="text-xl font-bold text-[var(--text-main)]">
                {author.author_name || author.author_handle}
              </h1>
              <div className="text-xs font-mono text-[var(--text-muted)] mt-0.5">
                @{author.author_handle}
              </div>
              <p className="text-xs text-[var(--text-dim)] mt-2">
                Publishes articles directly by sending email to <code className="text-[var(--text-main)]">blog@domain</code>.
              </p>
            </div>
          </div>
        )}

        {isLoading && <div className="text-[var(--text-dim)] text-xs py-8 text-center">Loading posts...</div>}

        {!isLoading && posts.length === 0 && (
          <div className="text-center py-20 text-[var(--text-dim)] text-xs">
            No published posts found. Send an email to <code>blog@domain</code> to publish your first post!
          </div>
        )}

        {/* Article Cards */}
        <div className="flex flex-col gap-10">
          {posts.map((post) => (
            <article
              key={post.slug}
              className="group border-b border-[var(--border-color)] pb-8 flex flex-col gap-2.5"
            >
              <Link to={`/blog/@${post.author_handle}/${post.slug}`}>
                <h2 className="text-2xl font-bold text-[var(--text-main)] group-hover:underline transition-all">
                  {post.title}
                </h2>
              </Link>

              <p className="text-sm text-[var(--text-muted)] leading-relaxed">
                {post.excerpt}…
              </p>

              <div className="flex items-center gap-3 mt-1 text-xs text-[var(--text-dim)]">
                <Link
                  to={`/blog/@${post.author_handle}`}
                  className="flex items-center gap-1.5 text-[var(--text-main)] hover:underline font-medium"
                >
                  <SenderAvatar
                    avatarUrl={post.author_avatar}
                    initials={post.author_handle.slice(0, 2).toUpperCase()}
                    name={post.author_name}
                    size={20}
                  />
                  <span>{post.author_name || `@${post.author_handle}`}</span>
                </Link>
                <span>·</span>
                <span className="flex items-center gap-1">
                  <Clock size={12} />
                  <span>{formatDistanceToNow(new Date(post.published_at), { addSuffix: true })}</span>
                </span>
              </div>
            </article>
          ))}
        </div>
      </main>
    </div>
  )
}

// Single Article Fullscreen Reader
export function BlogPost() {
  const { handle, slug } = useParams<{ handle: string; slug: string }>()

  const { data: post, isLoading } = useQuery({
    queryKey: ["blog-post", handle, slug],
    queryFn: async () => {
      const res = await fetch(`${BLOG_API}/blog/@${handle}/${slug}`)
      if (!res.ok) throw new Error("Post not found")
      return res.json() as Promise<FullPost>
    },
  })

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center text-[var(--text-dim)] text-xs">
        Loading post...
      </div>
    )
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] flex flex-col items-center justify-center gap-3">
        <span className="text-sm text-[var(--text-dim)]">Post not found</span>
        <Link to="/blog" className="text-xs text-[var(--text-main)] underline">
          Back to blog
        </Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-main)] flex flex-col">
      <header className="border-b border-[var(--border-color)] bg-[var(--bg-secondary)] px-8 py-3.5 flex items-center justify-between">
        <Link
          to={`/blog/@${handle}`}
          className="text-xs text-[var(--text-muted)] hover:text-[var(--text-main)] flex items-center gap-1.5 transition-colors"
        >
          <ArrowLeft size={13} />
          <span>More posts by @{handle}</span>
        </Link>
        <Link to="/" className="text-xs text-[var(--text-muted)] hover:text-[var(--text-main)]">
          Dispatch
        </Link>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-16 w-full flex-1">
        {/* Title */}
        <h1 className="text-4xl font-extrabold tracking-tight text-[var(--text-main)] mb-6 leading-tight">
          {post.title}
        </h1>

        {/* Author metadata bar */}
        <div className="flex items-center gap-3 pb-8 mb-10 border-b border-[var(--border-color)]">
          <SenderAvatar
            avatarUrl={post.author_avatar}
            initials={handle!.slice(0, 2).toUpperCase()}
            name={post.author_name}
            size={40}
          />
          <div>
            <Link to={`/blog/@${handle}`} className="text-sm font-semibold text-[var(--text-main)] hover:underline">
              {post.author_name || `@${post.author_handle}`}
            </Link>
            <div className="text-xs text-[var(--text-dim)]">
              {format(new Date(post.published_at), "MMMM d, yyyy")}
            </div>
          </div>
        </div>

        {/* Article Markdown Body */}
        <article className="prose prose-neutral dark:prose-invert max-w-none text-base leading-relaxed">
          <ReactMarkdown>{post.content}</ReactMarkdown>
        </article>
      </main>
    </div>
  )
}
