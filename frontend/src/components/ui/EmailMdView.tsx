import { useState, useEffect } from "react"
import { render } from "emailmd"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import remarkBreaks from "remark-breaks"
import DOMPurify from "dompurify"

interface Props {
  content: string
  className?: string
}

export default function EmailMdView({ content, className = "" }: Props) {
  const [renderedHtml, setRenderedHtml] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    if (!content || !content.trim()) {
      setRenderedHtml(null)
      return
    }

    render(content)
      .then((res) => {
        if (active && res?.html) {
          setRenderedHtml(res.html)
        }
      })
      .catch((err) => {
        console.warn("EmailMD live compilation fallback:", err)
        if (active) setRenderedHtml(null)
      })

    return () => {
      active = false
    }
  }, [content])

  if (renderedHtml) {
    return (
      <div
        className={`emailmd-rendered-view overflow-x-auto ${className}`}
        dangerouslySetInnerHTML={{
          __html: DOMPurify.sanitize(renderedHtml, {
            ADD_TAGS: ["style", "meta", "link"],
            ADD_ATTR: ["target", "bgcolor", "align", "valign", "border", "cellpadding", "cellspacing"]
          })
        }}
      />
    )
  }

  return (
    <div className={`emailmd-fallback prose prose-invert max-w-none text-xs sm:text-sm leading-relaxed ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkBreaks]}
        components={{
          blockquote: ({ children }) => (
            <blockquote className="border-l-2 border-[var(--border-color)] pl-4 my-3 text-[var(--text-muted)] not-italic space-y-1">
              {children}
            </blockquote>
          ),
          p: ({ children }) => <p className="mb-2.5 last:mb-0 leading-relaxed">{children}</p>
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}
