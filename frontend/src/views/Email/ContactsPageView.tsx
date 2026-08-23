import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "../../lib/api"
import { useDateLocale } from "../../store/themeAndLocale"
import { motion, AnimatePresence } from "framer-motion"
import { formatDistanceToNow } from "date-fns"
import SenderAvatar from "../../components/ui/SenderAvatar"
import {
  Users,
  UsersRound,
  Search,
  Plus,
  Mail,
  Star,
  Ban,
  Trash2,
  Send,
  Clock,
  X,
  UserPlus,
  ArrowLeft
} from "lucide-react"

interface Contact {
  email: string
  name: string
  avatar_url?: string | null
  initials?: string
  status: "approved" | "important" | "blocked"
  is_important: boolean
  is_blocked: boolean
  emails_count: number
  last_contact_at?: string | null
  recent_emails?: Array<{
    id: number
    subject: string
    snippet: string
    from: string
    to: string
    folder: string
    created_at: string
  }>
}

interface Group {
  id: number
  name: string
  alias: string
  description?: string
  color?: string
  members: string[]
  member_count: number
  created_at: string
}

interface Props {
  onCompose: (toTarget: string) => void
  onOpenEmail: (emailId: number) => void
}

export default function ContactsPageView({ onCompose, onOpenEmail }: Props) {
  const dateLocale = useDateLocale()
  const qc = useQueryClient()

  const [activeTab, setActiveTab] = useState<"contacts" | "groups">("contacts")
  const [search, setSearch] = useState("")
  const [filterType, setFilterType] = useState<"all" | "important" | "blocked">("all")

  const [selectedContactEmail, setSelectedContactEmail] = useState<string | null>(null)
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null)

  // Modals / Quick Forms
  const [showAddContactModal, setShowAddContactModal] = useState(false)
  const [newContactEmail, setNewContactEmail] = useState("")
  const [newContactStatus, setNewContactStatus] = useState<"approved" | "important" | "blocked">("approved")

  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false)
  const [newGroupName, setNewGroupName] = useState("")
  const [newGroupDesc, setNewGroupDesc] = useState("")
  const [newGroupMembers, setNewGroupMembers] = useState("")

  const [addMemberInput, setAddMemberInput] = useState("")

  // Fetch Contacts
  const { data: contacts = [], isLoading: loadingContacts } = useQuery({
    queryKey: ["email-contacts"],
    queryFn: () => api.get<Contact[]>("/emails/contacts"),
    refetchInterval: 5000,
  })

  // Fetch Groups
  const { data: groups = [], isLoading: loadingGroups } = useQuery({
    queryKey: ["contact-groups"],
    queryFn: () => api.get<Group[]>("/contact_groups"),
    refetchInterval: 5000,
  })

  // Add Contact / Rule
  const addContactMutation = useMutation({
    mutationFn: () =>
      api.post("/sender_rules", {
        email_address: newContactEmail.trim().toLowerCase(),
        status: newContactStatus
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["email-contacts"] })
      qc.invalidateQueries({ queryKey: ["sender-rules"] })
      setSelectedContactEmail(newContactEmail.trim().toLowerCase())
      setNewContactEmail("")
      setShowAddContactModal(false)
    }
  })

  // Toggle Important Contact
  const updateRuleStatus = useMutation({
    mutationFn: ({ email, status }: { email: string; status: string }) =>
      api.post("/sender_rules", { email_address: email, status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["email-contacts"] })
      qc.invalidateQueries({ queryKey: ["sender-rules"] })
      qc.invalidateQueries({ queryKey: ["emails"] })
    }
  })

  // Create Group
  const createGroupMutation = useMutation({
    mutationFn: () => {
      const membersArr = newGroupMembers
        .split(/[,\n]/)
        .map(m => m.trim().toLowerCase())
        .filter(Boolean)
      return api.post("/contact_groups", {
        name: newGroupName.trim().replace(/^@/, ""),
        description: newGroupDesc.trim(),
        members: membersArr
      })
    },
    onSuccess: (data: any) => {
      qc.invalidateQueries({ queryKey: ["contact-groups"] })
      setSelectedGroupId(data.id)
      setNewGroupName("")
      setNewGroupDesc("")
      setNewGroupMembers("")
      setShowCreateGroupModal(false)
    }
  })

  // Delete Group
  const deleteGroupMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/contact_groups/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contact-groups"] })
      setSelectedGroupId(null)
    }
  })

  // Update Group Members
  const updateGroupMutation = useMutation({
    mutationFn: ({ id, members }: { id: number; members: string[] }) =>
      api.patch(`/contact_groups/${id}`, { members }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contact-groups"] })
      setAddMemberInput("")
    }
  })

  // Filtered Contacts
  const filteredContacts = contacts
    .filter(c => {
      if (filterType === "important") return c.is_important
      if (filterType === "blocked") return c.is_blocked
      return true
    })
    .filter(c =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.email.toLowerCase().includes(search.toLowerCase())
    )

  // Filtered Groups
  const filteredGroups = groups.filter(g =>
    g.name.toLowerCase().includes(search.toLowerCase()) ||
    g.alias.toLowerCase().includes(search.toLowerCase()) ||
    g.description?.toLowerCase().includes(search.toLowerCase())
  )

  const hasContactSelectedOnMobile = Boolean(selectedContactEmail)
  const hasGroupSelectedOnMobile = Boolean(selectedGroupId)

  const selectedContact = contacts.find(c => c.email === selectedContactEmail) || filteredContacts[0]
  const selectedGroup = groups.find(g => g.id === selectedGroupId) || filteredGroups[0]

  return (
    <div className="h-full flex flex-col bg-[var(--bg-primary)] overflow-hidden">
      {/* Top Main Navigation Header */}
      <div className="px-3 sm:px-4 py-2.5 sm:py-3 border-b border-[var(--border-color)] bg-[var(--bg-secondary)] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <div className="p-1.5 sm:p-2 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-main)] shrink-0">
            <Users size={16} />
          </div>
          <div className="min-w-0">
            <h1 className="text-xs sm:text-sm font-bold text-[var(--text-main)] truncate">
              Kişiler & Gruplar
            </h1>
            <p className="hidden sm:block text-[11px] text-[var(--text-dim)] truncate">
              Adres defterinizi ve toplu gönderim gruplarınızı yönetin
            </p>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1 p-1 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] shrink-0">
          <button
            type="button"
            onClick={() => {
              setActiveTab("contacts")
              setSearch("")
              setSelectedContactEmail(null)
            }}
            className={`flex items-center gap-1.5 px-2.5 sm:px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === "contacts"
                ? "bg-[var(--bg-card)] text-[var(--text-main)] shadow-xs font-bold"
                : "text-[var(--text-muted)] hover:text-[var(--text-main)]"
            }`}
            title="Kişiler"
          >
            <Users size={15} />
            <span className="hidden sm:inline">Kişiler ({contacts.length})</span>
            <span className="sm:hidden text-[11px] font-mono font-bold">{contacts.length}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab("groups")
              setSearch("")
              setSelectedGroupId(null)
            }}
            className={`flex items-center gap-1.5 px-2.5 sm:px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === "groups"
                ? "bg-[var(--bg-card)] text-[#3b82f6] shadow-xs font-bold"
                : "text-[var(--text-muted)] hover:text-[var(--text-main)]"
            }`}
            title="E-Posta Grupları"
          >
            <UsersRound size={15} />
            <span className="hidden sm:inline">E-Posta Grupları @Grup ({groups.length})</span>
            <span className="sm:hidden text-[11px] font-mono font-bold text-[#3b82f6]">{groups.length}</span>
          </button>
        </div>
      </div>

      {/* Main Body Split View */}
      <div className="flex-1 flex overflow-hidden">
        {activeTab === "contacts" ? (
          /* =========================================================================
             CONTACTS VIEW
             ========================================================================= */
          <>
            {/* Left Column: Contacts List */}
            <div className={`w-full md:w-80 border-r border-[var(--border-color)] bg-[var(--bg-primary)] flex-col shrink-0 overflow-hidden ${
              hasContactSelectedOnMobile ? "hidden md:flex" : "flex"
            }`}>
              {/* Search & Actions */}
              <div className="p-3 border-b border-[var(--border-color)] bg-[var(--bg-secondary)] flex flex-col gap-2.5 shrink-0">
                <div className="flex items-center gap-2 px-3 py-2 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl text-xs shadow-xs focus-within:border-[var(--text-main)] transition-colors">
                  <Search size={14} className="text-[var(--text-dim)] shrink-0" />
                  <input
                    type="text"
                    placeholder="Kişilerde ara..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="w-full bg-transparent text-[var(--text-main)] placeholder-[var(--text-dim)] focus:outline-none text-xs"
                  />
                  {search && (
                    <button
                      type="button"
                      onClick={() => setSearch("")}
                      className="text-[var(--text-dim)] hover:text-[var(--text-main)]"
                    >
                      <X size={13} />
                    </button>
                  )}
                </div>

                <div className="flex items-center justify-between gap-1">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setFilterType("all")}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${
                        filterType === "all" ? "bg-[var(--bg-card)] text-[var(--text-main)] shadow-xs" : "text-[var(--text-dim)] hover:text-[var(--text-main)]"
                      }`}
                    >
                      Tümü ({contacts.length})
                    </button>
                    <button
                      onClick={() => setFilterType("important")}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${
                        filterType === "important" ? "bg-[#f59e0b20] text-[#f59e0b] shadow-xs" : "text-[var(--text-dim)] hover:text-[var(--text-main)]"
                      }`}
                    >
                      ⭐ VIP
                    </button>
                    <button
                      onClick={() => setFilterType("blocked")}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${
                        filterType === "blocked" ? "bg-[#ef444420] text-[#ef4444] shadow-xs" : "text-[var(--text-dim)] hover:text-[var(--text-main)]"
                      }`}
                    >
                      🚫 Engelli
                    </button>
                  </div>

                  <button
                    onClick={() => setShowAddContactModal(true)}
                    className="px-2.5 py-1 rounded-lg bg-[var(--accent)] text-[var(--accent-invert)] text-[10px] font-bold flex items-center gap-1 hover:opacity-90 transition-opacity shadow-xs"
                    title="Yeni Kişi Ekle"
                  >
                    <Plus size={12} />
                    <span>Ekle</span>
                  </button>
                </div>
              </div>

              {/* List */}
              <div className="flex-1 overflow-y-auto py-2">
                {loadingContacts && (
                  <div className="p-6 text-[var(--text-dim)] text-xs text-center">Yükleniyor...</div>
                )}
                {!loadingContacts && filteredContacts.length === 0 && (
                  <div className="p-8 text-[var(--text-dim)] text-xs text-center">Kişi bulunamadı.</div>
                )}

                {filteredContacts.map(c => {
                  const isSelected = selectedContact?.email === c.email
                  return (
                    <motion.div
                      key={c.email}
                      whileHover={{ x: 2 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setSelectedContactEmail(c.email)}
                      className={`mx-3 my-1.5 p-3 rounded-2xl border transition-all flex items-center justify-between cursor-pointer shadow-xs ${
                        isSelected
                          ? "bg-[var(--bg-secondary)] border-[var(--text-main)] ring-1 ring-[var(--text-main)]"
                          : "bg-[var(--bg-secondary)] border-[var(--border-color)] hover:border-[var(--text-dim)]"
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <SenderAvatar
                          avatarUrl={c.avatar_url}
                          initials={c.initials || c.name[0]?.toUpperCase() || "?"}
                          name={c.name}
                          size={38}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-bold text-[var(--text-main)] truncate flex items-center gap-1.5">
                            <span className="truncate">{c.name}</span>
                            {c.is_important && <Star size={11} className="fill-[#f59e0b] text-[#f59e0b] shrink-0" />}
                            {c.is_blocked && <Ban size={11} className="text-[#ef4444] shrink-0" />}
                          </div>
                          <div className="text-[11px] text-[var(--text-dim)] font-mono truncate mt-0.5">{c.email}</div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={e => {
                          e.stopPropagation()
                          onCompose(c.email)
                        }}
                        className="p-2 text-[var(--text-dim)] hover:text-[var(--text-main)] hover:bg-[var(--bg-card)] rounded-xl transition-colors shrink-0 ml-2"
                        title="E-posta Yaz"
                      >
                        <Mail size={14} />
                      </button>
                    </motion.div>
                  )
                })}
              </div>
            </div>

            {/* Right Column: Selected Contact Detail */}
            <div className={`flex-1 bg-[var(--bg-primary)] overflow-y-auto p-4 sm:p-8 flex-col gap-6 ${
              hasContactSelectedOnMobile ? "flex" : "hidden md:flex"
            }`}>
              {/* Mobile Back Button */}
              <div className="md:hidden flex items-center justify-between pb-2 border-b border-[var(--border-color)]">
                <button
                  type="button"
                  onClick={() => setSelectedContactEmail(null)}
                  className="flex items-center gap-1.5 text-xs font-bold text-[var(--text-muted)] hover:text-[var(--text-main)] px-3 py-1.5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)]"
                >
                  <ArrowLeft size={14} />
                  <span>Kişiler Listesine Dön</span>
                </button>
              </div>

              {selectedContact ? (
                <div className="max-w-2xl flex flex-col gap-6">
                  {/* Contact Header Card */}
                  <div className="p-5 sm:p-6 rounded-3xl bg-[var(--bg-secondary)] border border-[var(--border-color)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs">
                    <div className="flex items-center gap-4 min-w-0">
                      <SenderAvatar
                        avatarUrl={selectedContact.avatar_url}
                        initials={selectedContact.initials || selectedContact.name[0]?.toUpperCase() || "?"}
                        name={selectedContact.name}
                        size={52}
                      />
                      <div className="min-w-0">
                        <div className="text-sm sm:text-base font-bold text-[var(--text-main)] flex flex-wrap items-center gap-2">
                          <span className="truncate">{selectedContact.name}</span>
                          {selectedContact.is_important && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#f59e0b15] text-[#f59e0b] border border-[#f59e0b30] flex items-center gap-1 shrink-0">
                              <Star size={10} className="fill-[#f59e0b]" />
                              <span>Önemli Kişi (VIP)</span>
                            </span>
                          )}
                          {selectedContact.is_blocked && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#ef444415] text-[#ef4444] border border-[#ef444430] flex items-center gap-1 shrink-0">
                              <Ban size={10} />
                              <span>Engellenen</span>
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-[var(--text-dim)] font-mono mt-1 truncate">
                          {selectedContact.email}
                        </div>
                        {selectedContact.last_contact_at && (
                          <div className="text-[10px] text-[var(--text-muted)] mt-1.5 flex items-center gap-1">
                            <Clock size={11} />
                            <span>
                              Son İletişim: {formatDistanceToNow(new Date(selectedContact.last_contact_at), { addSuffix: true, locale: dateLocale })}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Quick Compose Button */}
                    <motion.button
                      whileTap={{ scale: 0.96 }}
                      whileHover={{ scale: 1.02 }}
                      onClick={() => onCompose(selectedContact.email)}
                      className="w-full sm:w-auto bg-[var(--accent)] text-[var(--accent-invert)] text-xs font-bold py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 shadow-sm hover:opacity-90 transition-all shrink-0"
                    >
                      <Send size={13} />
                      <span>E-posta Yaz</span>
                    </motion.button>
                  </div>

                  {/* Actions & Status Bar */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        updateRuleStatus.mutate({
                          email: selectedContact.email,
                          status: selectedContact.is_important ? "approved" : "important"
                        })
                      }
                      className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold border transition-all ${
                        selectedContact.is_important
                          ? "bg-[#f59e0b15] text-[#f59e0b] border-[#f59e0b30]"
                          : "bg-[var(--bg-secondary)] text-[var(--text-muted)] border-[var(--border-color)] hover:text-[#f59e0b]"
                      }`}
                    >
                      <Star size={13} className={selectedContact.is_important ? "fill-[#f59e0b]" : ""} />
                      <span>{selectedContact.is_important ? "Önemli Kişiden Çıkar" : "Önemli Kişi Yap ⭐"}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        updateRuleStatus.mutate({
                          email: selectedContact.email,
                          status: selectedContact.is_blocked ? "approved" : "blocked"
                        })
                      }
                      className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold border transition-all ${
                        selectedContact.is_blocked
                          ? "bg-[#ef444415] text-[#ef4444] border-[#ef444430]"
                          : "bg-[var(--bg-secondary)] text-[var(--text-muted)] border-[var(--border-color)] hover:text-[#ef4444]"
                      }`}
                    >
                      <Ban size={13} />
                      <span>{selectedContact.is_blocked ? "Engeli Kaldır" : "Kişiyi Engelle 🚫"}</span>
                    </button>
                  </div>

                  {/* Recent Email History */}
                  <div className="flex flex-col gap-3">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] flex items-center justify-between">
                      <span>İletişim Geçmişi ({selectedContact.recent_emails?.length || 0})</span>
                      <span className="text-[10px] text-[var(--text-dim)] font-normal">Bu kişiyle geçmiş iletiler</span>
                    </h3>

                    {selectedContact.recent_emails && selectedContact.recent_emails.length > 0 ? (
                      <div className="flex flex-col gap-2">
                        {selectedContact.recent_emails.map(e => (
                          <div
                            key={e.id}
                            onClick={() => onOpenEmail(e.id)}
                            className="p-3.5 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-color)] hover:border-[var(--text-dim)] cursor-pointer transition-all flex items-start justify-between gap-3 group shadow-xs"
                          >
                            <div className="flex flex-col gap-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase ${
                                  e.folder === "sent" ? "bg-[#3b82f615] text-[#3b82f6]" : "bg-[#22c55e15] text-[#22c55e]"
                                }`}>
                                  {e.folder === "sent" ? "Giden" : "Gelen"}
                                </span>
                                <span className="text-xs font-bold text-[var(--text-main)] truncate group-hover:underline">
                                  {e.subject || "(Konu Yok)"}
                                </span>
                              </div>
                              <p className="text-[11px] text-[var(--text-muted)] line-clamp-1">
                                {e.snippet}
                              </p>
                            </div>

                            <span className="text-[10px] text-[var(--text-dim)] font-mono shrink-0">
                              {formatDistanceToNow(new Date(e.created_at), { addSuffix: true, locale: dateLocale })}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-6 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-color)] text-xs text-[var(--text-dim)] text-center">
                        Bu kişiyle henüz kayıtlı bir e-posta geçmişi yok.
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="h-full flex items-center justify-center text-xs text-[var(--text-dim)]">
                  Detayları görüntülemek için soldan bir kişi seçin.
                </div>
              )}
            </div>
          </>
        ) : (
          /* =========================================================================
             GROUPS VIEW
             ========================================================================= */
          <>
            {/* Left Column: Groups List */}
            <div className={`w-full md:w-80 border-r border-[var(--border-color)] bg-[var(--bg-primary)] flex-col shrink-0 overflow-hidden ${
              hasGroupSelectedOnMobile ? "hidden md:flex" : "flex"
            }`}>
              <div className="p-3 border-b border-[var(--border-color)] bg-[var(--bg-secondary)] flex flex-col gap-2.5 shrink-0">
                <div className="flex items-center gap-2 px-3 py-2 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl text-xs shadow-xs focus-within:border-[var(--text-main)] transition-colors">
                  <Search size={14} className="text-[var(--text-dim)] shrink-0" />
                  <input
                    type="text"
                    placeholder="Gruplarda ara..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="w-full bg-transparent text-[var(--text-main)] placeholder-[var(--text-dim)] focus:outline-none text-xs"
                  />
                  {search && (
                    <button
                      type="button"
                      onClick={() => setSearch("")}
                      className="text-[var(--text-dim)] hover:text-[var(--text-main)]"
                    >
                      <X size={13} />
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => setShowCreateGroupModal(true)}
                  className="w-full bg-[var(--accent)] text-[var(--accent-invert)] text-xs font-bold py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 hover:opacity-90 shadow-sm transition-all"
                >
                  <Plus size={13} />
                  <span>Yeni E-Posta Grubu Oluştur</span>
                </button>
              </div>

              {/* List */}
              <div className="flex-1 overflow-y-auto py-2">
                {loadingGroups && (
                  <div className="p-6 text-[var(--text-dim)] text-xs text-center">Yükleniyor...</div>
                )}
                {!loadingGroups && filteredGroups.length === 0 && (
                  <div className="p-8 text-[var(--text-dim)] text-xs text-center">Grup bulunamadı.</div>
                )}

                {filteredGroups.map(g => {
                  const isSelected = selectedGroup?.id === g.id
                  return (
                    <motion.div
                      key={g.id}
                      whileHover={{ x: 2 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setSelectedGroupId(g.id)}
                      className={`mx-3 my-1.5 p-3 rounded-2xl border transition-all flex items-center justify-between cursor-pointer shadow-xs ${
                        isSelected
                          ? "bg-[var(--bg-secondary)] border-[#3b82f6] ring-1 ring-[#3b82f6]"
                          : "bg-[var(--bg-secondary)] border-[var(--border-color)] hover:border-[var(--text-dim)]"
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-full bg-[#3b82f615] text-[#3b82f6] border border-[#3b82f630] flex items-center justify-center font-bold text-xs font-mono shrink-0">
                          @
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-bold text-[#3b82f6] truncate font-mono">
                            {g.alias}
                          </div>
                          <div className="text-[10px] text-[var(--text-dim)] truncate mt-0.5">
                            {g.description || `${g.member_count} üye`}
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={e => {
                          e.stopPropagation()
                          onCompose(g.alias)
                        }}
                        className="p-2 text-[var(--text-dim)] hover:text-[#3b82f6] hover:bg-[var(--bg-card)] rounded-xl transition-colors shrink-0 ml-2"
                        title="Gruba E-posta Yaz"
                      >
                        <Mail size={14} />
                      </button>
                    </motion.div>
                  )
                })}
              </div>
            </div>

            {/* Right Column: Selected Group Detail */}
            <div className={`flex-1 bg-[var(--bg-primary)] overflow-y-auto p-4 sm:p-8 flex-col gap-6 ${
              hasGroupSelectedOnMobile ? "flex" : "hidden md:flex"
            }`}>
              {/* Mobile Back Button */}
              <div className="md:hidden flex items-center justify-between pb-2 border-b border-[var(--border-color)]">
                <button
                  type="button"
                  onClick={() => setSelectedGroupId(null)}
                  className="flex items-center gap-1.5 text-xs font-bold text-[var(--text-muted)] hover:text-[var(--text-main)] px-3 py-1.5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)]"
                >
                  <ArrowLeft size={14} />
                  <span>Gruplar Listesine Dön</span>
                </button>
              </div>

              {selectedGroup ? (
                <div className="max-w-2xl flex flex-col gap-6">
                  {/* Group Header Card */}
                  <div className="p-5 sm:p-6 rounded-3xl bg-[var(--bg-secondary)] border border-[var(--border-color)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs">
                    <div className="flex items-center gap-4">
                      <div className="w-12 sm:w-14 h-12 sm:h-14 rounded-2xl bg-[#3b82f615] text-[#3b82f6] border border-[#3b82f630] flex items-center justify-center font-bold text-lg sm:text-xl font-mono shrink-0">
                        @
                      </div>
                      <div>
                        <div className="text-base sm:text-lg font-bold text-[var(--text-main)] font-mono flex items-center gap-2">
                          <span>{selectedGroup.alias}</span>
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-sans font-bold bg-[#3b82f615] text-[#3b82f6] border border-[#3b82f630]">
                            {selectedGroup.member_count} Üye
                          </span>
                        </div>
                        <div className="text-xs text-[var(--text-muted)] mt-1">
                          {selectedGroup.description || "Grup açıklaması belirtilmedi."}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <motion.button
                        whileTap={{ scale: 0.96 }}
                        whileHover={{ scale: 1.02 }}
                        onClick={() => onCompose(selectedGroup.alias)}
                        className="flex-1 sm:flex-initial bg-[#3b82f6] hover:bg-[#2563eb] text-white text-xs font-bold py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 shadow-sm transition-all"
                      >
                        <Send size={13} />
                        <span>Gruba E-posta Gönder</span>
                      </motion.button>

                      <button
                        type="button"
                        onClick={() => {
                          if (confirm(`${selectedGroup.alias} grubunu silmek istediğinizden emin misiniz?`)) {
                            deleteGroupMutation.mutate(selectedGroup.id)
                          }
                        }}
                        className="p-2.5 rounded-xl text-[var(--text-dim)] hover:text-[#ef4444] hover:bg-[#ef444415] border border-[var(--border-color)] transition-colors"
                        title="Grubu Sil"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>

                  {/* Add Member Box */}
                  <div className="p-4 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-color)] flex items-center gap-3">
                    <input
                      type="email"
                      placeholder="Gruba eklenecek e-posta adresi (örn: kisi@dispatch.local)..."
                      value={addMemberInput}
                      onChange={e => setAddMemberInput(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === "Enter" && addMemberInput.trim()) {
                          const newM = addMemberInput.trim().toLowerCase()
                          if (!selectedGroup.members.includes(newM)) {
                            updateGroupMutation.mutate({
                              id: selectedGroup.id,
                              members: [...selectedGroup.members, newM]
                            })
                          }
                        }
                      }}
                      className="flex-1 bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-main)] text-xs px-3.5 py-2.5 rounded-xl focus:outline-none font-mono"
                    />
                    <button
                      type="button"
                      disabled={!addMemberInput.trim()}
                      onClick={() => {
                        const newM = addMemberInput.trim().toLowerCase()
                        if (!selectedGroup.members.includes(newM)) {
                          updateGroupMutation.mutate({
                            id: selectedGroup.id,
                            members: [...selectedGroup.members, newM]
                          })
                        }
                      }}
                      className="bg-[var(--accent)] text-[var(--accent-invert)] text-xs px-4 py-2.5 rounded-xl font-bold flex items-center gap-1 disabled:opacity-40 shadow-sm hover:opacity-90"
                    >
                      <Plus size={13} />
                      <span>Üye Ekle</span>
                    </button>
                  </div>

                  {/* Members List */}
                  <div className="flex flex-col gap-3">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
                      Grup Üyeleri ({selectedGroup.members.length})
                    </h3>

                    <div className="flex flex-col gap-2">
                      {selectedGroup.members.map(m => (
                        <div
                          key={m}
                          className="p-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] flex items-center justify-between gap-3 text-xs"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-6 h-6 rounded-full bg-[var(--bg-primary)] border border-[var(--border-color)] flex items-center justify-center font-bold text-[10px] text-[var(--text-main)] shrink-0">
                              {m[0]?.toUpperCase() || "?"}
                            </div>
                            <span className="font-mono text-[var(--text-main)] font-medium truncate">{m}</span>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => onCompose(m)}
                              className="p-1.5 text-[var(--text-dim)] hover:text-[var(--text-main)] rounded-lg hover:bg-[var(--bg-card)]"
                              title="Bireysel E-posta Yaz"
                            >
                              <Mail size={13} />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const newMembers = selectedGroup.members.filter(x => x !== m)
                                updateGroupMutation.mutate({
                                  id: selectedGroup.id,
                                  members: newMembers
                                })
                              }}
                              className="p-1.5 text-[var(--text-dim)] hover:text-[#ef4444] rounded-lg hover:bg-[#ef444415]"
                              title="Gruptan Çıkar"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="h-full flex items-center justify-center text-xs text-[var(--text-dim)]">
                  Detayları görüntülemek için soldan bir grup seçin.
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Add Contact Modal */}
      <AnimatePresence>
        {showAddContactModal && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-[var(--bg-secondary)] border border-[var(--border-color)] p-6 rounded-2xl shadow-xl flex flex-col gap-4"
            >
              <div className="flex items-center justify-between pb-2 border-b border-[var(--border-color)]">
                <div className="flex items-center gap-2">
                  <UserPlus size={16} className="text-[var(--text-main)]" />
                  <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-main)]">
                    Yeni Kişi Ekle
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddContactModal(false)}
                  className="p-1 rounded-lg text-[var(--text-dim)] hover:text-[var(--text-main)]"
                >
                  <X size={16} />
                </button>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-[var(--text-muted)] block mb-1">E-Posta Adresi</label>
                <input
                  type="email"
                  placeholder="kisi@example.com"
                  value={newContactEmail}
                  onChange={e => setNewContactEmail(e.target.value)}
                  className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-main)] text-xs px-3.5 py-2.5 rounded-xl focus:outline-none font-mono"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-[var(--text-muted)] block mb-1">Kişi Durumu</label>
                <select
                  value={newContactStatus}
                  onChange={e => setNewContactStatus(e.target.value as any)}
                  className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-main)] text-xs px-3.5 py-2.5 rounded-xl focus:outline-none font-semibold"
                >
                  <option value="approved">Onaylı (Gelen Kutusu)</option>
                  <option value="important">⭐ Önemli Kişi (VIP)</option>
                  <option value="blocked">🚫 Engelli (Çöp Kutusu)</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddContactModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-[var(--text-muted)] hover:text-[var(--text-main)]"
                >
                  İptal
                </button>
                <button
                  type="button"
                  disabled={!newContactEmail.trim() || addContactMutation.isPending}
                  onClick={() => addContactMutation.mutate()}
                  className="bg-[var(--accent)] text-[var(--accent-invert)] px-5 py-2 rounded-xl text-xs font-bold hover:opacity-90 disabled:opacity-40 shadow-sm"
                >
                  {addContactMutation.isPending ? "Kaydediliyor..." : "Kaydet"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Create Group Modal */}
      <AnimatePresence>
        {showCreateGroupModal && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-[var(--bg-secondary)] border border-[var(--border-color)] p-6 rounded-2xl shadow-xl flex flex-col gap-4"
            >
              <div className="flex items-center justify-between pb-2 border-b border-[var(--border-color)]">
                <div className="flex items-center gap-2">
                  <UsersRound size={16} className="text-[#3b82f6]" />
                  <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-main)]">
                    Yeni E-Posta Grubu Oluştur
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowCreateGroupModal(false)}
                  className="p-1 rounded-lg text-[var(--text-dim)] hover:text-[var(--text-main)]"
                >
                  <X size={16} />
                </button>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-[var(--text-muted)] block mb-1">
                  Grup İsmi (örn: <span className="font-mono text-[var(--text-main)]">ekip</span>)
                </label>
                <div className="flex items-center bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl px-3 py-2">
                  <span className="text-[var(--text-dim)] font-mono text-xs font-bold">@</span>
                  <input
                    type="text"
                    placeholder="ekip"
                    value={newGroupName}
                    onChange={e => setNewGroupName(e.target.value.replace(/[^a-zA-Z0-9_-]/g, ""))}
                    className="w-full bg-transparent text-[var(--text-main)] text-xs focus:outline-none ml-1 font-mono font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-[var(--text-muted)] block mb-1">Açıklama (Opsiyonel)</label>
                <input
                  type="text"
                  placeholder="Yazılım ve Operasyon Ekibi"
                  value={newGroupDesc}
                  onChange={e => setNewGroupDesc(e.target.value)}
                  className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-main)] text-xs px-3.5 py-2.5 rounded-xl focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-[var(--text-muted)] block mb-1">
                  Üyeler (Virgülle veya alt alta e-posta adresleri yazın)
                </label>
                <textarea
                  rows={3}
                  placeholder="ahmet@dispatch.local, mehmet@dispatch.local"
                  value={newGroupMembers}
                  onChange={e => setNewGroupMembers(e.target.value)}
                  className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-main)] text-xs p-3 rounded-xl focus:outline-none font-mono"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateGroupModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-[var(--text-muted)] hover:text-[var(--text-main)]"
                >
                  İptal
                </button>
                <button
                  type="button"
                  disabled={!newGroupName.trim() || !newGroupMembers.trim() || createGroupMutation.isPending}
                  onClick={() => createGroupMutation.mutate()}
                  className="bg-[#3b82f6] hover:bg-[#2563eb] text-white px-5 py-2 rounded-xl text-xs font-bold disabled:opacity-40 shadow-sm"
                >
                  {createGroupMutation.isPending ? "Oluşturuluyor..." : "Grubu Oluştur"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
