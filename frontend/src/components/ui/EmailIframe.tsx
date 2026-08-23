import { useRef, useEffect, useState } from "react"

interface Props {
  html: string
  allowRemoteImages?: boolean
  className?: string
}

export default function EmailIframe({ html, allowRemoteImages = true, className = "" }: Props) {
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
    const timer1 = setTimeout(adjustHeight, 100)
    const timer2 = setTimeout(adjustHeight, 400)
    const timer3 = setTimeout(adjustHeight, 1200)

    return () => {
      iframe.removeEventListener("load", adjustHeight)
      clearTimeout(timer1)
      clearTimeout(timer2)
      clearTimeout(timer3)
    }
  }, [html, allowRemoteImages])

  let processedHtml = html || ""

  if (allowRemoteImages) {
    // When allowed, ensure original src is restored if it was proxied with data-original-src
    processedHtml = processedHtml.replace(/<img\s+([^>]*?)data-original-src=["']([^"']+)["']([^>]*?)>/gi, (_match, p1, originalSrc, p2) => {
      return `<img ${p1}src="${originalSrc}" ${p2}>`
    })
  } else {
    // Replace remote images with a subtle blocked placeholder
    processedHtml = processedHtml.replace(/<img\s+([^>]*?)src=["'](https?:\/\/[^"']+|\/api\/v1\/image_proxy[^"']*)["']([^>]*?)>/gi, () => {
      return `<div style="display:inline-flex;align-items:center;gap:6px;padding:6px 12px;background:#18181b;border:1px dashed #3f3f46;border-radius:6px;font-size:11px;color:#a1a1aa;margin:4px 0;font-family:sans-serif;"><span>🖼️</span><span>Harici Görsel Engellendi (Gizlilik Koruması)</span></div>`
    })
  }

  const customStyle = `
    <base target="_blank">
    <style>
      :root {
        color-scheme: dark !important;
      }
      html, body {
        margin: 0 !important;
        padding: 0 !important;
        background-color: transparent !important;
        background: transparent !important;
        color: #f4f4f5 !important;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif !important;
        font-size: 14px !important;
        line-height: 1.6 !important;
        word-wrap: break-word !important;
        overflow-x: hidden !important;
      }
      p, div, span, td, th, li {
        color: inherit;
      }
      /* Prevent forced dark text from external HTML email templates */
      [style*="color: #000"], [style*="color:#000"], [style*="color: rgb(0, 0, 0)"], [style*="color: black"], [style*="color: #222"], [style*="color: #333"] {
        color: #f4f4f5 !important;
      }
      /* Remove forced white backgrounds from external email templates */
      [style*="background-color: #fff"], [style*="background-color:#fff"], [style*="background-color: white"], [style*="background-color: rgb(255, 255, 255)"], [style*="background: #fff"], [style*="background: white"], [style*="background-color: #ffffff"] {
        background-color: transparent !important;
        background: transparent !important;
      }
      a {
        color: #60a5fa !important;
      }
      img {
        max-width: 100% !important;
        height: auto !important;
        border-radius: 8px;
      }
      table {
        max-width: 100% !important;
      }
      pre, code {
        background: #18181b !important;
        color: #f4f4f5 !important;
        padding: 2px 6px;
        border-radius: 4px;
      }
    </style>
  `

  let safeDoc = ""
  if (processedHtml.includes("<head>")) {
    safeDoc = processedHtml.replace("<head>", `<head>${customStyle}`)
  } else if (processedHtml.includes("<html>") || processedHtml.includes("<!DOCTYPE") || processedHtml.includes("<!doctype")) {
    safeDoc = `<!DOCTYPE html><html><head>${customStyle}</head><body>${processedHtml}</body></html>`
  } else {
    safeDoc = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          ${customStyle}
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px; line-height: 1.6; color: #f4f4f5; background-color: transparent;">
          ${processedHtml}
        </body>
      </html>
    `
  }

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
