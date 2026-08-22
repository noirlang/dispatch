import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { api } from "../../lib/api"
import { Inbox, Send, FileText, Trash2, Clock, Star } from "lucide-react"
import EmailList from "./EmailList"
import EmailReader from "./EmailReader"
import ComposeModal from "./ComposeModal"

const folders = [
  { id: "inbox",     label: "Inbox",     icon: <Inbox size={14} /> },
  { id: "approvals", label: "Approvals", icon: <Clock size={14} /> },
  { id: "sent",      label: "Sent",      icon: <Send size={14} /> },
  { id: "drafts",    label: "Drafts",    icon: <FileText size={14} /> },
  { id: "trash",     label: "Trash",     icon: <Trash2 size={14} /> },
] as const

type Folder = typeof folders[number]["id"]

export default function EmailView() {
  const [folder, setFolder] = useState<Folder>("inbox")
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [composing, setComposing] = useState(false)

  return (
    <div className="h-full flex">
      {/* Sidebar */}
      <aside className="w-40 border-r border-[#1a1a1a] flex flex-col p-2 gap-0.5 shrink-0">
        <button
          onClick={() => setComposing(true)}
          className="mb-3 w-full bg-white text-black text-xs font-medium py-1.5 rounded hover:bg-[#e0e0e0] transition-colors"
        >
          + Compose
        </button>
        {folders.map(f => (
          <button
            key={f.id}
            onClick={() => { setFolder(f.id); setSelectedId(null) }}
            className={`flex items-center gap-2 px-2 py-1.5 rounded text-xs transition-colors text-left ${
              folder === f.id ? "bg-[#1a1a1a] text-white" : "text-[#666] hover:text-white"
            }`}
          >
            {f.icon}
            {f.label}
          </button>
        ))}
      </aside>

      {/* Email list */}
      <div className="w-64 border-r border-[#1a1a1a] shrink-0 overflow-auto">
        <EmailList folder={folder} selectedId={selectedId} onSelect={setSelectedId} />
      </div>

      {/* Email reader */}
      <div className="flex-1 overflow-auto">
        {selectedId ? (
          <EmailReader id={selectedId} folder={folder} />
        ) : (
          <div className="h-full flex items-center justify-center text-[#333] text-sm">
            Select an email
          </div>
        )}
      </div>

      {composing && <ComposeModal onClose={() => setComposing(false)} />}
    </div>
  )
}
