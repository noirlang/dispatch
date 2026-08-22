import { useRef, useEffect, useState } from "react"

interface Props {
  html: string
  className?: string
}

export default function EmailIframe({ html, className = "" }: Props) {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [height, setHeight] = useState(250)

  useEffect(() => {
    const iframe = iframeRef.current
    if (!iframe) return

    function adjustHeight() {
      try {
        if (iframe && iframe.contentDocument && iframe.contentDocument.body) {
          const doc = iframe.contentDocument
          const scrollHeight = Math.max(
            doc.body.scrollHeight,
            doc.documentElement.scrollHeight,
            doc.body.offsetHeight,
            200
          )
          setHeight(scrollHeight + 30)
        }
      } catch (err) {
        console.warn("Iframe auto-height warning:", err)
      }
    }

    iframe.addEventListener("load", adjustHeight)
    // Run after a short delay for fonts and images to load
    const timer1 = setTimeout(adjustHeight, 100)
    const timer2 = setTimeout(adjustHeight, 500)
    const timer3 = setTimeout(adjustHeight, 1500)

    return () => {
      iframe.removeEventListener("load", adjustHeight)
      clearTimeout(timer1)
      clearTimeout(timer2)
      clearTimeout(timer3)
    }
  }, [html])

  // Injected wrapper to sanitize and handle responsive images and links
  const safeDoc = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <base target="_blank">
        <style>
          html, body {
            margin: 0;
            padding: 0;
            background-color: transparent !important;
            color: #e2e8f0;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            font-size: 14px;
            line-height: 1.6;
            word-wrap: break-word;
            overflow-x: hidden;
          }
          img {
            max-width: 100% !important;
            height: auto;
          }
          table {
            max-width: 100% !important;
          }
          a {
            color: #3b82f6;
          }
          blockquote {
            border-left: 3px solid #64748b;
            margin: 12px 0;
            padding: 6px 14px;
            color: #94a3b8;
            background-color: rgba(255,255,255,0.03);
            border-radius: 0 6px 6px 0;
          }
        </style>
      </head>
      <body>
        ${html}
      </body>
    </html>
  `

  return (
    <iframe
      ref={iframeRef}
      srcDoc={safeDoc}
      sandbox="allow-popups allow-popups-to-escape-sandbox allow-same-origin"
      scrolling="no"
      style={{
        height: `${height}px`,
        width: "100%",
        border: "none",
        backgroundColor: "transparent",
        display: "block",
        overflow: "hidden"
      }}
      className={`w-full rounded-2xl transition-all ${className}`}
      title="Email Message Content"
    />
  )
}
