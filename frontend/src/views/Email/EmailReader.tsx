import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "../../lib/api"
import { useState } from "react"
import { Reply, Forward, Trash2, CheckCircle, XCircle } from "lucide-react"
import DOMPurify from "dompurify"

interface Email {
  id: number
  from_address: string
  to_address: string
  subject: string
  body: string
  folder: string
  is_read: boolean
  created_at: string
}

interface Props { id: number; folder: string }

export default function EmailReader({ id, folder }: Props) {
  const qc = useQueryClient()
  const [replying, setReplying] = useState(false)
  const [replyBody, setReplyBody] = useState("")

  const { data: email } = useQuery({
    queryKey: ["email", id],
    queryFn: () => api.get<{ id: number; from_address: string; to_address: string; subject: string; body: string; folder: string; is_read: boolean; created_at: string }>(`/emails/${id}`),
  })

  const approve = useMutation({
    mutationFn: () => api.post(`/emails/${id}/approve`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["emails"] }),
  })

  const reject = useMutation({
    mutationFn: () => api.post(`/emails/${id}/reject`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["emails"] }),
  })

  const reply = useMutation({
    mutationFn: () => api.post(`/emails/${id}/reply`, { body: replyBody }),
    onSuccess: () => { setReplying(false); setReplyBody("") },
  })

  if (!email) return null

  const safeBody = DOMPurify.sanitize(email.body || "")

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-[#1a1a1a]">
        <h2 className="text-white font-medium mb-1">{email.subject}</h2>
        <div className="text-[#666] text-xs">From: {email.from_address}</div>
        <div className="text-[#666] text-xs">To: {email.to_address}</div>

        {/* Actions */}
        <div className="flex items-center gap-2 mt-3">
          {folder === "approvals" && (
            <>
              <ActionBtn icon={<CheckCircle size={14} />} label="Approve" onClick={() => approve.mutate()} color="success" />
              <ActionBtn icon={<XCircle size={14} />} label="Reject" onClick={() => reject.mutate()} color="danger" />
            </>
          )}
          <ActionBtn icon={<Reply size={14} />} label="Reply" onClick={() => setReplying(r => !r)} />
          <ActionBtn icon={<Trash2 size={14} />} label="Delete" onClick={() => {}} color="danger" />
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 p-4 overflow-auto">
        {email.body?.startsWith("<") ? (
          <div
            className="text-[#ccc] text-sm leading-relaxed prose prose-invert max-w-none"
            dangerouslySetInnerHTML={{ __html: safeBody }}
          />
        ) : (
          <pre className="text-[#ccc] text-sm leading-relaxed whitespace-pre-wrap">{email.body}</pre>
        )}
      </div>

      {/* Reply box */}
      {replying && (
        <div className="border-t border-[#1a1a1a] p-4">
          <textarea
            value={replyBody}
            onChange={e => setReplyBody(e.target.value)}
            placeholder="Write a reply..."
            className="w-full bg-[#111] border border-[#222] text-white text-sm p-3 rounded resize-none h-24 focus:outline-none focus:border-[#444]"
          />
          <div className="flex gap-2 mt-2">
            <button
              onClick={() => reply.mutate()}
              className="bg-white text-black text-xs px-4 py-1.5 rounded hover:bg-[#e0e0e0] transition-colors"
            >
              Send Reply
            </button>
            <button onClick={() => setReplying(false)} className="text-[#555] text-xs hover:text-white">
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function ActionBtn({ icon, label, onClick, color }: {
  icon: React.ReactNode; label: string; onClick: () => void; color?: "success" | "danger"
}) {
  const colors = { success: "text-[#44ff88] hover:bg-[#44ff8820]", danger: "text-[#ff4444] hover:bg-[#ff444420]" }
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors ${
        color ? colors[color] : "text-[#666] hover:text-white hover:bg-[#1a1a1a]"
      }`}
    >
      {icon} {label}
    </button>
  )
}
