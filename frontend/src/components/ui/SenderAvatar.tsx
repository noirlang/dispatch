import { useState, useEffect } from "react"

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3000"

export function resolveAvatarUrl(url?: string | null): string | null {
  if (!url) return null
  if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("data:")) return url
  return `${API_BASE}${url.startsWith("/") ? "" : "/"}${url}`
}

interface Props {
  avatarUrl?: string | null
  initials?: string
  name?: string
  size?: number
  isKnownCompany?: boolean
}

export default function SenderAvatar({ avatarUrl, initials = "?", name, size = 32, isKnownCompany }: Props) {
  const [imgError, setImgError] = useState(false)

  useEffect(() => {
    setImgError(false)
  }, [avatarUrl])

  const resolvedUrl = resolveAvatarUrl(avatarUrl)

  if (resolvedUrl && !imgError) {
    return (
      <img
        src={resolvedUrl}
        alt={name || initials}
        title={name}
        width={size}
        height={size}
        onError={() => setImgError(true)}
        className="rounded-full object-cover shrink-0"
        style={{
          width: size,
          height: size,
          background: isKnownCompany ? "#1a1a1a" : undefined,
          padding: isKnownCompany ? 3 : 0,
        }}
      />
    )
  }

  // Fallback: colored initials circle
  const colors = ["#2563eb", "#7c3aed", "#059669", "#d97706", "#dc2626", "#0891b2"]
  const color = colors[(initials.charCodeAt(0) || 0) % colors.length]

  return (
    <div
      title={name}
      className="rounded-full flex items-center justify-center shrink-0 text-white font-medium select-none"
      style={{ width: size, height: size, background: color, fontSize: size * 0.38 }}
    >
      {initials.slice(0, 2)}
    </div>
  )
}
