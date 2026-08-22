import { useMemo } from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import remarkBreaks from "remark-breaks"
import { Info, CheckCircle2, AlertTriangle, AlertCircle, ExternalLink } from "lucide-react"

interface Props {
  content: string
  className?: string
}

export default function EmailMdView({ content, className = "" }: Props) {
  // Pre-process EmailMD custom directives like ::: callout and [btn](url){button}
  const processedContent = useMemo(() => {
    if (!content) return ""
    let text = content

    // 1. Process [Label](url){button}
    text = text.replace(/\[([^\]]+)\]\(([^)]+)\)\{button\}/g, (_match, label, url) => {
      return `\n\n<a href="${url}" class="emailmd-cta-btn" target="_blank" rel="noopener noreferrer">${label}</a>\n\n`
    })

    return text
  }, [content])

  // Helper to parse ::: callout blocks
  const sections = useMemo(() => {
    if (!processedContent) return []
    const parts: Array<{ type: "markdown" | "callout"; calloutType?: string; content: string }> = []
    
    const calloutRegex = /:::\s*callout\s*(\w+)?\s*\n([\s\S]*?):::/g
    let lastIndex = 0
    let match: RegExpExecArray | null

    while ((match = calloutRegex.exec(processedContent)) !== null) {
      if (match.index > lastIndex) {
        parts.push({
          type: "markdown",
          content: processedContent.substring(lastIndex, match.index)
        })
      }
      parts.push({
        type: "callout",
        calloutType: match[1] || "info",
        content: match[2].trim()
      })
      lastIndex = match.index + match[0].length
    }

    if (lastIndex < processedContent.length) {
      parts.push({
        type: "markdown",
        content: processedContent.substring(lastIndex)
      })
    }

    return parts.length > 0 ? parts : [{ type: "markdown" as const, content: processedContent }]
  }, [processedContent])

  const renderMarkdown = (raw: string) => (
    <ReactMarkdown
      remarkPlugins={[remarkGfm, remarkBreaks]}
      components={{
        h1: ({ children }) => (
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[var(--text-main)] mt-6 mb-4 tracking-tight border-b border-[var(--border-color)] pb-2">
            {children}
          </h1>
        ),
        h2: ({ children }) => (
          <h2 className="text-xl sm:text-2xl font-bold text-[var(--text-main)] mt-5 mb-3 tracking-tight">
            {children}
          </h2>
        ),
        h3: ({ children }) => (
          <h3 className="text-lg sm:text-xl font-semibold text-[var(--text-main)] mt-4 mb-2">
            {children}
          </h3>
        ),
        p: ({ children }) => (
          <p className="mb-3.5 last:mb-0 leading-relaxed text-[var(--text-main)] text-sm sm:text-base">
            {children}
          </p>
        ),
        blockquote: ({ children }) => (
          <blockquote className="border-l-2 border-[var(--border-color)] pl-4 my-3 text-[var(--text-muted)] italic space-y-1">
            {children}
          </blockquote>
        ),
        ul: ({ children }) => (
          <ul className="list-disc list-inside mb-3 space-y-1 text-sm text-[var(--text-main)] pl-2">
            {children}
          </ul>
        ),
        ol: ({ children }) => (
          <ol className="list-decimal list-inside mb-3 space-y-1 text-sm text-[var(--text-main)] pl-2">
            {children}
          </ol>
        ),
        li: ({ children }) => (
          <li className="leading-relaxed">{children}</li>
        ),
        a: ({ href, children, className: cls }) => {
          if (cls === "emailmd-cta-btn" || (typeof children === "string" && children.includes("emailmd-cta-btn"))) {
            return (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-4 py-2 my-2 rounded-xl bg-[var(--text-main)] text-[var(--bg-primary)] font-bold text-xs hover:opacity-90 transition-opacity no-underline shadow-sm"
              >
                <span>{children}</span>
                <ExternalLink size={12} />
              </a>
            )
          }
          return (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[var(--text-main)] underline underline-offset-4 decoration-[var(--border-color)] hover:decoration-[var(--text-main)] font-medium transition-colors"
            >
              {children}
            </a>
          )
        },
        code: ({ className: codeCls, children, ...props }: any) => {
          const isInline = !codeCls
          if (isInline) {
            return (
              <code className="px-1.5 py-0.5 rounded-md bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-main)] font-mono text-xs">
                {children}
              </code>
            )
          }
          return (
            <div className="my-4 rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] overflow-hidden">
              <pre className="p-4 overflow-x-auto text-xs font-mono text-[var(--text-main)] leading-relaxed">
                <code {...props}>{children}</code>
              </pre>
            </div>
          )
        },
        table: ({ children }) => (
          <div className="my-4 overflow-x-auto rounded-xl border border-[var(--border-color)]">
            <table className="w-full text-xs text-left border-collapse">{children}</table>
          </div>
        ),
        th: ({ children }) => (
          <th className="p-2.5 bg-[var(--bg-secondary)] border-b border-[var(--border-color)] font-bold text-[var(--text-main)]">
            {children}
          </th>
        ),
        td: ({ children }) => (
          <td className="p-2.5 border-b border-[var(--border-color)] text-[var(--text-main)]">
            {children}
          </td>
        ),
        hr: () => <hr className="my-6 border-[var(--border-color)]" />
      }}
    >
      {raw}
    </ReactMarkdown>
  )

  return (
    <div className={`emailmd-clean-view max-w-none text-sm text-[var(--text-main)] ${className}`}>
      {sections.map((sec, idx) => {
        if (sec.type === "callout") {
          const type = sec.calloutType || "info"
          let icon = <Info size={16} className="text-[#3b82f6] shrink-0 mt-0.5" />
          let borderClass = "border-[#3b82f640] bg-[#3b82f610]"
          if (type === "success") {
            icon = <CheckCircle2 size={16} className="text-[#10b981] shrink-0 mt-0.5" />
            borderClass = "border-[#10b98140] bg-[#10b98110]"
          } else if (type === "warning") {
            icon = <AlertTriangle size={16} className="text-[#f59e0b] shrink-0 mt-0.5" />
            borderClass = "border-[#f59e0b40] bg-[#f59e0b10]"
          } else if (type === "danger" || type === "error") {
            icon = <AlertCircle size={16} className="text-[#ef4444] shrink-0 mt-0.5" />
            borderClass = "border-[#ef444440] bg-[#ef444410]"
          }

          return (
            <div
              key={idx}
              className={`p-4 my-4 rounded-xl border ${borderClass} flex items-start gap-3 text-xs leading-relaxed`}
            >
              {icon}
              <div className="flex-1 overflow-hidden">{renderMarkdown(sec.content)}</div>
            </div>
          )
        }

        return <div key={idx}>{renderMarkdown(sec.content)}</div>
      })}
    </div>
  )
}
