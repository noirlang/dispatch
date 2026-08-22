import { useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "../../lib/api"
import { X } from "lucide-react"

interface Props { onClose: () => void }

export default function ComposeModal({ onClose }: Props) {
  const qc = useQueryClient()
  const [form, setForm] = useState({ to: "", subject: "", body: "" })

  const send = useMutation({
    mutationFn: () => api.post("/emails", form),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["emails", "sent"] }); onClose() },
  })

  return (
    <div className="fixed inset-0 bg-black/60 flex items-end justify-end p-4 z-50">
      <div className="bg-[#111] border border-[#222] rounded-lg w-full max-w-md flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#222]">
          <span className="text-white text-sm font-medium">New Message</span>
          <button onClick={onClose} className="text-[#555] hover:text-white"><X size={16} /></button>
        </div>

        <div className="flex flex-col gap-0">
          {(["to", "subject"] as const).map(f => (
            <input
              key={f}
              placeholder={f === "to" ? "To" : "Subject"}
              value={form[f]}
              onChange={e => setForm(p => ({ ...p, [f]: e.target.value }))}
              className="px-4 py-2.5 bg-transparent border-b border-[#1a1a1a] text-white text-sm placeholder-[#444] focus:outline-none"
            />
          ))}
          <textarea
            placeholder="Write your message..."
            value={form.body}
            onChange={e => setForm(p => ({ ...p, body: e.target.value }))}
            className="px-4 py-3 bg-transparent text-white text-sm placeholder-[#444] focus:outline-none resize-none h-40"
          />
        </div>

        <div className="px-4 py-3 border-t border-[#1a1a1a]">
          <button
            onClick={() => send.mutate()}
            disabled={send.isPending}
            className="bg-white text-black text-xs px-5 py-2 rounded font-medium hover:bg-[#e0e0e0] transition-colors disabled:opacity-50"
          >
            {send.isPending ? "Sending..." : "Send"}
          </button>
        </div>
      </div>
    </div>
  )
}
