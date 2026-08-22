import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "../../lib/api"
import { useT } from "../../store/themeAndLocale"
import {
  format,
  addWeeks,
  subWeeks,
  startOfWeek,
  eachDayOfInterval,
  endOfWeek,
  isToday,
} from "date-fns"
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Calendar as CalIcon,
  MapPin,
  
  Trash2,
  X,
  Edit2
} from "lucide-react"

interface CalEvent {
  id: number
  title: string
  description?: string
  location?: string
  starts_at: string
  ends_at?: string
  all_day: boolean
  color?: string
  source?: string
}

export default function CalendarView() {
  const t = useT()
  const qc = useQueryClient()

  const [weekStart, setWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }))
  const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 })
  const days = eachDayOfInterval({ start: weekStart, end: weekEnd })

  // Modal State for Add / Edit
  const [modalOpen, setModalOpen] = useState(false)
  const [editingEvent, setEditingEvent] = useState<CalEvent | null>(null)
  const [form, setForm] = useState({
    title: "",
    description: "",
    location: "",
    starts_at: "",
    time: "10:00",
    all_day: false,
    color: "#22c55e",
  })

  const { data: events = [] } = useQuery({
    queryKey: ["calendar", weekStart.toISOString()],
    queryFn: () =>
      api.get<CalEvent[]>(
        `/calendar/events?start=${weekStart.toISOString()}&end=${weekEnd.toISOString()}`
      ),
  })

  const saveMutation = useMutation({
    mutationFn: async () => {
      const fullDate = form.starts_at || format(new Date(), "yyyy-MM-dd")
      const timeStr = form.all_day ? "00:00:00" : `${form.time || "10:00"}:00`
      const payload = {
        title: form.title,
        description: form.description,
        location: form.location,
        starts_at: new Date(`${fullDate}T${timeStr}`).toISOString(),
        all_day: form.all_day,
        color: form.color,
      }

      if (editingEvent) {
        return api.patch(`/calendar/events/${editingEvent.id}`, payload)
      }
      return api.post("/calendar/events", payload)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["calendar"] })
      closeModal()
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/calendar/events/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["calendar"] })
      closeModal()
    },
  })

  function openCreateModal(day?: Date) {
    setEditingEvent(null)
    const targetDate = day ? format(day, "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd")
    setForm({
      title: "",
      description: "",
      location: "",
      starts_at: targetDate,
      time: "10:00",
      all_day: false,
      color: "#22c55e",
    })
    setModalOpen(true)
  }

  function openEditModal(event: CalEvent) {
    setEditingEvent(event)
    const d = new Date(event.starts_at)
    setForm({
      title: event.title || "",
      description: event.description || "",
      location: event.location || "",
      starts_at: format(d, "yyyy-MM-dd"),
      time: format(d, "HH:mm"),
      all_day: event.all_day || false,
      color: event.color || "#22c55e",
    })
    setModalOpen(true)
  }

  function closeModal() {
    setModalOpen(false)
    setEditingEvent(null)
  }

  function eventsForDay(day: Date) {
    return events.filter((e) => {
      const d = new Date(e.starts_at)
      return d.toDateString() === day.toDateString()
    })
  }

  return (
    <div className="h-full flex flex-col max-w-5xl mx-auto p-6 animate-fadeIn">
      {/* Top Header & Week Navigation */}
      <div className="flex items-center justify-between pb-6 mb-4 border-b border-[var(--border-color)]">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)]">
            <CalIcon size={18} className="text-[var(--text-main)]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[var(--text-main)]">{t("calendar")}</h1>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              Vertical scrollable agenda with smart email auto-extraction
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Week Selector */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] shadow-xs">
            <button
              onClick={() => setWeekStart((w) => subWeeks(w, 1))}
              className="p-1 text-[var(--text-muted)] hover:text-[var(--text-main)] rounded"
              title="Previous Week"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-xs font-semibold font-mono text-[var(--text-main)] px-2">
              {format(weekStart, "MMM d")} – {format(weekEnd, "MMM d, yyyy")}
            </span>
            <button
              onClick={() => setWeekStart((w) => addWeeks(w, 1))}
              className="p-1 text-[var(--text-muted)] hover:text-[var(--text-main)] rounded"
              title="Next Week"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          <button
            onClick={() => openCreateModal()}
            className="flex items-center gap-1.5 bg-[var(--accent)] text-[var(--accent-invert)] px-4 py-2 rounded-xl text-xs font-bold hover:opacity-90 transition-all shadow-sm"
          >
            <Plus size={14} />
            <span>{t("add_event")}</span>
          </button>
        </div>
      </div>

      {/* Vertical Agenda Flow */}
      <div className="flex-1 overflow-y-auto pr-2 flex flex-col gap-4">
        {days.map((day) => {
          const dayEvents = eventsForDay(day)
          const today = isToday(day)

          return (
            <div
              key={day.toISOString()}
              className={`p-5 rounded-2xl border transition-all ${
                today
                  ? "bg-[var(--bg-secondary)] border-[var(--text-main)] shadow-sm"
                  : "bg-[var(--bg-card)] border-[var(--border-color)]"
              }`}
            >
              {/* Day Header */}
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-[var(--border-color)]">
                <div className="flex items-center gap-2.5">
                  <span
                    className={`text-xs uppercase font-bold tracking-wider ${
                      today ? "text-[var(--text-main)]" : "text-[var(--text-dim)]"
                    }`}
                  >
                    {format(day, "EEEE")}
                  </span>
                  <span className="text-sm font-extrabold text-[var(--text-main)]">
                    {format(day, "d MMMM yyyy")}
                  </span>
                  {today && (
                    <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-[#22c55e15] text-[#22c55e] border border-[#22c55e30]">
                      {t("today")}
                    </span>
                  )}
                </div>

                <button
                  onClick={() => openCreateModal(day)}
                  className="text-xs text-[var(--text-dim)] hover:text-[var(--text-main)] flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-[var(--bg-secondary)]"
                >
                  <Plus size={12} />
                  <span>{t("add_event")}</span>
                </button>
              </div>

              {/* Day's Events List */}
              <div className="flex flex-col gap-2">
                {dayEvents.length === 0 ? (
                  <span className="text-xs text-[var(--text-dim)] italic py-1">
                    {t("no_events")}
                  </span>
                ) : (
                  dayEvents.map((ev) => (
                    <div
                      key={ev.id}
                      onClick={() => openEditModal(ev)}
                      className="flex items-center justify-between p-3.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] hover:border-[var(--text-muted)] cursor-pointer group transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-2 h-7 rounded-full shrink-0"
                          style={{ backgroundColor: ev.color || "#22c55e" }}
                        />
                        <div>
                          <div className="text-sm font-semibold text-[var(--text-main)] group-hover:underline">
                            {ev.title}
                          </div>
                          {ev.description && (
                            <div className="text-xs text-[var(--text-muted)] mt-0.5 line-clamp-1">
                              {ev.description}
                            </div>
                          )}
                          {ev.location && (
                            <div className="flex items-center gap-1 text-[11px] text-[var(--text-dim)] mt-1">
                              <MapPin size={11} />
                              <span>{ev.location}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="text-xs font-mono font-medium text-[var(--text-dim)]">
                          {ev.all_day
                            ? t("all_day")
                            : format(new Date(ev.starts_at), "HH:mm")}
                        </span>
                        <Edit2 size={13} className="text-[var(--text-dim)] group-hover:text-[var(--text-main)]" />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Add / Edit Event Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl w-full max-w-md p-6 shadow-2xl flex flex-col gap-4">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border-color)]">
              <span className="text-base font-bold text-[var(--text-main)]">
                {editingEvent ? "Edit Event" : "Create Event"}
              </span>
              <button onClick={closeModal} className="text-[var(--text-dim)] hover:text-[var(--text-main)]">
                <X size={16} />
              </button>
            </div>

            <div className="flex flex-col gap-3">
              <div>
                <label className="text-xs font-semibold text-[var(--text-muted)] block mb-1">
                  Event Title
                </label>
                <input
                  autoFocus
                  type="text"
                  placeholder="e.g. Project Review Meeting"
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-main)] text-sm px-3.5 py-2 rounded-xl focus:outline-none focus:border-[var(--text-main)] font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-[var(--text-muted)] block mb-1">
                    Date
                  </label>
                  <input
                    type="date"
                    value={form.starts_at}
                    onChange={(e) => setForm((f) => ({ ...f, starts_at: e.target.value }))}
                    className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-main)] text-xs px-3 py-2 rounded-xl focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-[var(--text-muted)] block mb-1">
                    Time
                  </label>
                  <input
                    type="time"
                    disabled={form.all_day}
                    value={form.time}
                    onChange={(e) => setForm((f) => ({ ...f, time: e.target.value }))}
                    className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-main)] text-xs px-3 py-2 rounded-xl focus:outline-none disabled:opacity-40"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="all_day"
                  checked={form.all_day}
                  onChange={(e) => setForm((f) => ({ ...f, all_day: e.target.checked }))}
                  className="w-4 h-4 accent-[var(--text-main)]"
                />
                <label htmlFor="all_day" className="text-xs font-medium text-[var(--text-muted)] cursor-pointer">
                  {t("all_day")}
                </label>
              </div>

              <div>
                <label className="text-xs font-semibold text-[var(--text-muted)] block mb-1">
                  Location
                </label>
                <input
                  type="text"
                  placeholder="e.g. Google Meet / Room 4B"
                  value={form.location}
                  onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
                  className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-main)] text-xs px-3.5 py-2 rounded-xl focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-[var(--text-muted)] block mb-1">
                  Description / Notes
                </label>
                <textarea
                  placeholder="Additional notes..."
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-main)] text-xs p-3 rounded-xl h-20 resize-none focus:outline-none"
                />
              </div>

              {/* Color Tag Picker */}
              <div>
                <label className="text-xs font-semibold text-[var(--text-muted)] block mb-1">
                  Tag Color
                </label>
                <div className="flex items-center gap-2">
                  {["#22c55e", "#3b82f6", "#f59e0b", "#ef4444", "#a855f7", "#ec4899"].map(
                    (c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setForm((f) => ({ ...f, color: c }))}
                        className={`w-6 h-6 rounded-full border-2 transition-all ${
                          form.color === c ? "scale-110 border-white" : "border-transparent"
                        }`}
                        style={{ backgroundColor: c }}
                      />
                    )
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-[var(--border-color)]">
              {editingEvent ? (
                <button
                  type="button"
                  onClick={() => deleteMutation.mutate(editingEvent.id)}
                  className="text-xs font-semibold text-[#ef4444] hover:underline flex items-center gap-1"
                >
                  <Trash2 size={13} />
                  <span>Delete</span>
                </button>
              ) : (
                <div />
              )}

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 text-xs font-medium text-[var(--text-muted)] hover:text-[var(--text-main)]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={saveMutation.isPending || !form.title}
                  onClick={() => saveMutation.mutate()}
                  className="bg-[var(--accent)] text-[var(--accent-invert)] px-5 py-2 rounded-xl text-xs font-bold hover:opacity-90 transition-all disabled:opacity-40"
                >
                  {saveMutation.isPending ? "Saving..." : editingEvent ? "Save Changes" : "Create"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
