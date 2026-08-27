import { useRef, useEffect, useState } from "react"

interface Props {
  html: string
  allowRemoteImages?: boolean
  themeMode?: "dark" | "light"
  className?: string
}

export default function EmailIframe({
  html,
  allowRemoteImages = true,
  themeMode = "dark",
  className = ""
}: Props) {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [height, setHeight] = useState(250)

  useEffect(() => {
    const iframe = iframeRef.current
    if (!iframe) return

    function adjustContent() {
      try {
        if (iframe && iframe.contentDocument && iframe.contentDocument.body) {
          const doc = iframe.contentDocument

          if (themeMode === "dark") {
            // Remove any leftover bgcolor or background attributes from HTML elements
            doc.querySelectorAll("[bgcolor], [background]").forEach((el) => {
              el.removeAttribute("bgcolor")
              el.removeAttribute("background")
            })

            // Inject or update dark override style
            let darkStyle = doc.getElementById("dispatch-dark-override") as HTMLStyleElement | null
            if (!darkStyle) {
              darkStyle = doc.createElement("style")
              darkStyle.id = "dispatch-dark-override"
              doc.documentElement.appendChild(darkStyle)
            }
            darkStyle.textContent = `
              :root {
                color-scheme: dark !important;
              }
              html, body {
                background: transparent !important;
                background-color: transparent !important;
                color: #f4f4f5 !important;
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif !important;
                font-size: 15px !important;
                line-height: 1.6 !important;
                margin: 0 !important;
                padding: 0 !important;
                text-align: left !important;
              }
              .dispatch-content, .dispatch-body {
                margin: 0 !important;
                padding: 0 !important;
                max-width: 100% !important;
                text-align: left !important;
              }
              table, tbody, thead, tfoot, tr, td, th, div, section, article, main, header, footer, center, blockquote {
                background-color: transparent !important;
                background: transparent !important;
                background-image: none !important;
                border-color: #27272a !important;
              }
              * {
                color: #f4f4f5 !important;
                background-color: transparent !important;
                background: transparent !important;
                box-shadow: none !important;
              }
              p, span, td, th, li, h1, h2, h3, h4, h5, h6, font, b, strong, em, i, u, s, mark, blockquote, center, label, small {
                color: #f4f4f5 !important;
              }
              a, a *, [href] {
                color: #60a5fa !important;
                text-decoration: underline !important;
              }
              pre, code, kbd, samp {
                background-color: #18181b !important;
                color: #f4f4f5 !important;
                padding: 2px 6px !important;
                border-radius: 4px !important;
                font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace !important;
              }
              pre {
                padding: 12px 16px !important;
                overflow-x: auto !important;
                margin: 12px 0 !important;
              }
              img {
                max-width: 100% !important;
                height: auto !important;
                border-radius: 8px !important;
              }
              hr {
                border: 0 !important;
                border-top: 1px solid #27272a !important;
                margin: 16px 0 !important;
              }
            `
          } else {
            // Light theme override (clean original email viewing)
            let lightStyle = doc.getElementById("dispatch-light-override") as HTMLStyleElement | null
            if (!lightStyle) {
              lightStyle = doc.createElement("style")
              lightStyle.id = "dispatch-light-override"
              doc.documentElement.appendChild(lightStyle)
            }
            lightStyle.textContent = `
              :root {
                color-scheme: light !important;
              }
              html, body {
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif !important;
                font-size: 15px !important;
                line-height: 1.6 !important;
                margin: 0 !important;
                padding: 0 !important;
                color: #18181b !important;
                background-color: #ffffff !important;
              }
              a, a *, [href] {
                color: #2563eb !important;
              }
              img {
                max-width: 100% !important;
                height: auto !important;
                border-radius: 8px !important;
              }
            `
            // Remove dark override if switching to light
            const oldDark = doc.getElementById("dispatch-dark-override")
            if (oldDark) oldDark.remove()
          }

          const scrollHeight = Math.max(
            doc.body.scrollHeight,
            doc.documentElement.scrollHeight,
            doc.body.offsetHeight,
            200
          )
          setHeight(scrollHeight + 30)
        }
      } catch (err) {
        console.warn("Iframe adjust error:", err)
      }
    }

    iframe.addEventListener("load", adjustContent)
    const timer1 = setTimeout(adjustContent, 100)
    const timer2 = setTimeout(adjustContent, 400)
    const timer3 = setTimeout(adjustContent, 1200)

    return () => {
      iframe.removeEventListener("load", adjustContent)
      clearTimeout(timer1)
      clearTimeout(timer2)
      clearTimeout(timer3)
    }
  }, [html, allowRemoteImages, themeMode])

  let processedHtml = html || ""

  if (allowRemoteImages) {
    processedHtml = processedHtml.replace(/<img\s+([^>]*?)data-original-src=["']([^"']+)["']([^>]*?)>/gi, (_match, p1, originalSrc, p2) => {
      return `<img ${p1}src="${originalSrc}" ${p2}>`
    })
  } else {
    processedHtml = processedHtml.replace(/<img\s+([^>]*?)src=["'](https?:\/\/[^"']+|\/api\/v1\/image_proxy[^"']*)["']([^>]*?)>/gi, () => {
      return `<div style="display:inline-flex;align-items:center;gap:6px;padding:6px 12px;background:#18181b;border:1px dashed #3f3f46;border-radius:6px;font-size:11px;color:#a1a1aa;margin:4px 0;font-family:sans-serif;"><span>🖼️</span><span>Harici Görsel Engellendi (Gizlilik Koruması)</span></div>`
    })
  }

  if (themeMode === "dark") {
    // Strip bgcolor and background attributes so table/body background can never be white
    processedHtml = processedHtml.replace(/\s+(bgcolor|background)=["'][^"']*["']/gi, "")

    // Strip inline background styles that cause white containers
    processedHtml = processedHtml.replace(/style\s*=\s*["']([^"']*)["']/gi, (_match, styleStr) => {
      const cleaned = styleStr
        .replace(/color\s*:\s*[^;"]+;?/gi, "")
        .replace(/background(-color)?\s*:\s*[^;"]+;?/gi, "")
        .replace(/background(-image)?\s*:\s*[^;"]+;?/gi, "")
      return `style="${cleaned}"`
    })
  }

  const customStyle = themeMode === "dark" ? `
    <base target="_blank">
    <style>
      :root {
        color-scheme: dark !important;
      }
      * {
        background-color: transparent !important;
        background: transparent !important;
        color: #f4f4f5 !important;
      }
      html, body {
        margin: 0 !important;
        padding: 0 !important;
        background-color: transparent !important;
        background: transparent !important;
        color: #f4f4f5 !important;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif !important;
        font-size: 15px !important;
        line-height: 1.6 !important;
        word-wrap: break-word !important;
        overflow-x: hidden !important;
      }
      table, tbody, thead, tfoot, tr, td, th, div, section, article, main, header, footer, center, blockquote {
        background-color: transparent !important;
        background: transparent !important;
        border-color: #27272a !important;
      }
      p, div, span, td, th, li, h1, h2, h3, h4, h5, h6, font, b, strong, em, i, u, s, mark, blockquote, center, label, small {
        color: #f4f4f5 !important;
        background-color: transparent !important;
      }
      a, a *, [href] {
        color: #60a5fa !important;
        text-decoration: underline !important;
      }
      pre, code, kbd, samp {
        background-color: #18181b !important;
        color: #f4f4f5 !important;
        padding: 2px 6px !important;
        border-radius: 4px !important;
        font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace !important;
      }
      pre {
        padding: 12px 16px !important;
        overflow-x: auto !important;
        margin: 12px 0 !important;
      }
      img {
        max-width: 100% !important;
        height: auto !important;
        border-radius: 8px !important;
      }
      hr {
        border: 0 !important;
        border-top: 1px solid #27272a !important;
        margin: 16px 0 !important;
      }
    </style>
  ` : `
    <base target="_blank">
    <style>
      :root {
        color-scheme: light !important;
      }
      html, body {
        margin: 0 !important;
        padding: 0 !important;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif !important;
        font-size: 15px !important;
        line-height: 1.6 !important;
        word-wrap: break-word !important;
        overflow-x: hidden !important;
        color: #18181b !important;
        background-color: #ffffff !important;
      }
      a, a *, [href] {
        color: #2563eb !important;
      }
      img {
        max-width: 100% !important;
        height: auto !important;
        border-radius: 8px !important;
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
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px; line-height: 1.6; color: ${themeMode === "dark" ? "#f4f4f5" : "#18181b"}; background-color: ${themeMode === "dark" ? "transparent" : "#ffffff"};">
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
        backgroundColor: themeMode === "dark" ? "transparent" : "#ffffff",
        display: "block",
        overflow: "hidden"
      }}
      className={`w-full transition-all ${className}`}
      title="Email Message Content"
    />
  )
}
