import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import remarkBreaks from "remark-breaks"
import { ExternalLink, Info, AlertTriangle, CheckCircle2, Sparkles } from "lucide-react"

interface Props {
  content: string
  className?: string
}

// Pre-process EmailMD custom directives like ::: callout and [text](url){button}
function preprocessEmailMd(md: string): { processed: string; callouts: Record<string, { type: string; content: string }> } {
  const callouts: Record<string, { type: string; content: string }> = {}
  let calloutIndex = 0

  // 1. Process ::: callout [type] ... :::
  let processed = md.replace(/:::\s*callout(?:\s+([a-zA-Z0-9_-]+))?\s*\n([\s\S]*?)\n\s*:::/g, (_, type = "info", inner) => {
    const placeholder = `EMAILMD_CALLOUT_BLOCK_${calloutIndex}__`
    callouts[placeholder] = { type: type.toLowerCase(), content: inner.trim() }
    calloutIndex++
    return `\n\n${placeholder}\n\n`
  })

  // 2. Process [Button Text](url){button [style]}
  processed = processed.replace(/\[([^\]]+)\]\(([^)]+)\)\{button(?:\s+([a-zA-Z0-9_-]+))?\}/g, (_, text, url, style = "primary") => {
    return `<a href="${url}" data-emailmd-button="${style}">${text}</a>`
  })

  return { processed, callouts }
}

export default function EmailMdView({ content, className = "" }: Props) {
  const { processed, callouts } = preprocessEmailMd(content || "")

  // Split by callout placeholders
  const parts = processed.split(/(EMAILMD_CALLOUT_BLOCK_\d+__)/g)

  return (
    <div className={`emailmd-content prose prose-invert max-w-none text-xs sm:text-sm leading-relaxed ${className}`}>
      {parts.map((part, idx) => {
        if (callouts[part]) {
          const { type, content: innerContent } = callouts[part]
          const isWarning = type.includes("warn") || type.includes("alert")
          const isSuccess = type.includes("success") || type.includes("check")
          const isTip = type.includes("tip") || type.includes("sparkle")

          const bgClass = isWarning
            ? "bg-[#ef444410] border-[#ef444430] text-[#fca5a5]"
            : isSuccess
            ? "bg-[#22c55e10] border-[#22c55e30] text-[#86efac]"
            : isTip
            ? "bg-[#a855f710] border-[#a855f730] text-[#d8b4fe]"
            : "bg-[#3b82f610] border-[#3b82f630] text-[#93c5fd]"

          const Icon = isWarning
            ? AlertTriangle
            : isSuccess
            ? CheckCircle2
            : isTip
            ? Sparkles
            : Info

          return (
            <div
              key={idx}
              className={`my-4 p-4 rounded-2xl border flex items-start gap-3 text-xs leading-relaxed ${bgClass}`}
            >
              <Icon size={16} className="shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm, remarkBreaks]}
                  components={{
                    p: ({ children }) => <p className="m-0 mb-1 last:mb-0">{children}</p>,
                    a: ({ href, children }) => (
                      <a href={href} target="_blank" rel="noopener noreferrer" className="underline font-semibold hover:opacity-80">
                        {children}
                      </a>
                    ),
                  }}
                >
                  {innerContent}
                </ReactMarkdown>
              </div>
            </div>
          )
        }

        if (!part.trim()) return null

        return (
          <ReactMarkdown
            key={idx}
            remarkPlugins={[remarkGfm, remarkBreaks]}
            components={{
              // Headings
              h1: ({ children }) => <h1 className="text-xl font-bold text-[var(--text-main)] mt-4 mb-2">{children}</h1>,
              h2: ({ children }) => <h2 className="text-lg font-bold text-[var(--text-main)] mt-3 mb-2">{children}</h2>,
              h3: ({ children }) => <h3 className="text-base font-semibold text-[var(--text-main)] mt-3 mb-1">{children}</h3>,
              
              // Paragraphs
              p: ({ children }) => <p className="mb-3 leading-relaxed text-[var(--text-main)]">{children}</p>,
              
              // Blockquotes (Replies and quotes)
              blockquote: ({ children }) => (
                <blockquote className="border-l-2 border-[var(--text-muted)] bg-[var(--bg-secondary)] pl-3 py-1 my-3 rounded-r-lg italic text-[var(--text-dim)]">
                  {children}
                </blockquote>
              ),
              
              // Lists
              ul: ({ children }) => <ul className="list-disc list-inside mb-3 space-y-1">{children}</ul>,
              ol: ({ children }) => <ol className="list-decimal list-inside mb-3 space-y-1">{children}</ol>,
              li: ({ children }) => <li className="text-[var(--text-main)]">{children}</li>,
              
              // Links & EmailMD Buttons
              a: ({ href, children, ...props }) => {
                const isButton = props["data-emailmd-button" as keyof typeof props]
                if (isButton) {
                  const style = String(isButton)
                  const isSecondary = style === "secondary"
                  return (
                    <span className="inline-block my-2 mr-2">
                      <a
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm no-underline ${
                          isSecondary
                            ? "bg-[var(--bg-card)] text-[var(--text-main)] border border-[var(--border-color)] hover:bg-[var(--bg-primary)]"
                            : "bg-[#2563eb] text-white hover:bg-[#1d4ed8]"
                        }`}
                      >
                        <span>{children}</span>
                        <ExternalLink size={11} className="opacity-80" />
                      </a>
                    </span>
                  )
                }
                return (
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#3b82f6] hover:underline font-medium"
                  >
                    {children}
                  </a>
                )
              },

              // Code & Codeblocks
              code: ({ className: codeClassName, children, ...codeProps }) => {
                const isInline = !codeClassName
                if (isInline) {
                  return (
                    <code className="px-1.5 py-0.5 rounded bg-[var(--bg-secondary)] border border-[var(--border-color)] font-mono text-xs text-[var(--text-main)]" {...codeProps}>
                      {children}
                    </code>
                  )
                }
                return (
                  <div className="my-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] p-3 overflow-x-auto">
                    <code className="font-mono text-xs text-[var(--text-main)]" {...codeProps}>
                      {children}
                    </code>
                  </div>
                )
              },

              // Tables
              table: ({ children }) => (
                <div className="overflow-x-auto my-4 rounded-xl border border-[var(--border-color)]">
                  <table className="min-w-full text-xs text-left">{children}</table>
                </div>
              ),
              th: ({ children }) => (
                <th className="p-2.5 bg-[var(--bg-secondary)] border-b border-[var(--border-color)] font-bold text-[var(--text-main)]">
                  {children}
                </th>
              ),
              td: ({ children }) => (
                <td className="p-2.5 border-b border-[var(--border-color)] text-[var(--text-muted)]">
                  {children}
                </td>
              ),
              hr: () => <hr className="my-4 border-[var(--border-color)]" />
            }}
          >
            {part}
          </ReactMarkdown>
        )
      })}
    </div>
  )
}
