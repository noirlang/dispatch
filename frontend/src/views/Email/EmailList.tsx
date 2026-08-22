import { useQuery } from "@tanstack/react-query"
import { api } from "../../lib/api"
import { formatDistanceToNow } from "date-fns"
import SenderAvatar from "../../components/ui/SenderAvatar"

interface Email {
  id: number
  from: string
  subject: string
  is_read: boolean
  created_at: string
  sender_name?: string
  avatar_url?: string | null
  avatar_initials?: string
  is_known_company?: boolean
}

interface Props {
  folder: string
  selectedId: number | null
  onSelect: (id: number) => void
}

export default function EmailList({ folder, selectedId, onSelect }: Props) {
  const { data, isLoading } = useQuery({
    queryKey: ["emails", folder],
    queryFn: () => api.get<Email[]>(`/emails?folder=${folder}`),
  })

  if (isLoading) return <div className="p-4 text-[#444] text-xs">Loading...</div>
  if (!data?.length) return <div className="p-4 text-[#444] text-xs">No messages</div>

  return (
    <div className="flex flex-col">
      {data.map(email => (
        <button
          key={email.id}
          onClick={() => onSelect(email.id)}
          className={`flex items-start gap-3 p-3 border-b border-[#111] text-left transition-colors hover:bg-[#111] ${
            selectedId === email.id ? "bg-[#1a1a1a]" : ""
          }`}
        >
          {/* Avatar */}
          <div className="mt-0.5 shrink-0">
            <SenderAvatar
              avatarUrl={email.avatar_url}
              initials={email.avatar_initials || "?"}
              name={email.sender_name || email.from}
              size={32}
              isKnownCompany={email.is_known_company}
            />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex justify-between items-start gap-1">
              <span className={`text-xs truncate ${email.is_read ? "text-[#555]" : "text-white font-medium"}`}>
                {email.sender_name || email.from}
              </span>
              <span className="text-[#333] text-[10px] shrink-0">
                {formatDistanceToNow(new Date(email.created_at), { addSuffix: true })}
              </span>
            </div>
            <div className={`text-xs mt-0.5 truncate ${email.is_read ? "text-[#333]" : "text-[#aaa]"}`}>
              {email.subject}
            </div>
          </div>

          {!email.is_read && <div className="w-1.5 h-1.5 bg-white rounded-full shrink-0 mt-2" />}
        </button>
      ))}
    </div>
  )
}
