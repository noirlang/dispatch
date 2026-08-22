import { useQuery } from "@tanstack/react-query"
import { api } from "../../lib/api"
import { formatDistanceToNow } from "date-fns"

interface Email {
  id: number
  from_address: string
  subject: string
  is_read: boolean
  created_at: string
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
          className={`p-3 border-b border-[#111] text-left transition-colors hover:bg-[#111] ${
            selectedId === email.id ? "bg-[#1a1a1a]" : ""
          }`}
        >
          <div className="flex justify-between items-start gap-2">
            <span className={`text-xs truncate flex-1 ${email.is_read ? "text-[#666]" : "text-white font-medium"}`}>
              {email.from_address}
            </span>
            <span className="text-[#444] text-[10px] shrink-0">
              {formatDistanceToNow(new Date(email.created_at), { addSuffix: true })}
            </span>
          </div>
          <div className={`text-xs mt-0.5 truncate ${email.is_read ? "text-[#444]" : "text-[#ccc]"}`}>
            {email.subject}
          </div>
          {!email.is_read && <div className="w-1.5 h-1.5 bg-white rounded-full mt-1" />}
        </button>
      ))}
    </div>
  )
}
