import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { api } from "../../lib/api"
import { format, addWeeks, subWeeks, startOfWeek, eachDayOfInterval, endOfWeek, isToday } from "date-fns"
import { ChevronLeft, ChevronRight } from "lucide-react"

interface CalEvent {
  id: number
  title: string
  starts_at: string
  all_day: boolean
  color?: string
}

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

export default function CalendarView() {
  const [weekStart, setWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }))
  const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 })
  const days = eachDayOfInterval({ start: weekStart, end: weekEnd })

  const { data: events = [] } = useQuery({
    queryKey: ["calendar", weekStart.toISOString()],
    queryFn: () => api.get<CalEvent[]>(`/calendar/events?start=${weekStart.toISOString()}&end=${weekEnd.toISOString()}`),
  })

  function eventsForDay(day: Date) {
    return events.filter(e => {
      const d = new Date(e.starts_at)
      return d.toDateString() === day.toDateString()
    })
  }

  return (
    <div className="h-full flex flex-col">
      {/* Week nav */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#1a1a1a] shrink-0">
        <button onClick={() => setWeekStart(w => subWeeks(w, 1))} className="text-[#666] hover:text-white">
          <ChevronLeft size={16} />
        </button>
        <span className="text-white text-sm">
          {format(weekStart, "MMM d")} – {format(weekEnd, "MMM d, yyyy")}
        </span>
        <button onClick={() => setWeekStart(w => addWeeks(w, 1))} className="text-[#666] hover:text-white">
          <ChevronRight size={16} />
        </button>
      </div>

      {/* Days - vertical scroll */}
      <div className="flex-1 overflow-auto">
        {days.map(day => (
          <div key={day.toISOString()} className="border-b border-[#111]">
            {/* Day header */}
            <div className={`px-4 py-2 flex items-center gap-2 ${isToday(day) ? "bg-[#1a1a1a]" : ""}`}>
              <span className="text-xs text-[#555] uppercase font-medium w-8">
                {format(day, "EEE").toUpperCase()}
              </span>
              <span className={`text-sm font-medium ${isToday(day) ? "text-white" : "text-[#888]"}`}>
                {format(day, "d MMM")}
              </span>
              {isToday(day) && <span className="text-[10px] text-[#44ff88] ml-1">Today</span>}
            </div>

            {/* Events */}
            <div className="px-4 pb-2 flex flex-col gap-1">
              {eventsForDay(day).length === 0 ? (
                <span className="text-[#333] text-xs py-1">—</span>
              ) : (
                eventsForDay(day).map(ev => (
                  <div
                    key={ev.id}
                    className="flex items-center gap-2 py-1 px-2 rounded hover:bg-[#111] cursor-pointer group"
                  >
                    <span className="text-[#555] text-xs w-12 shrink-0">
                      {ev.all_day ? "All day" : format(new Date(ev.starts_at), "HH:mm")}
                    </span>
                    <div
                      className="w-1 h-4 rounded-full shrink-0"
                      style={{ background: ev.color || "#ffffff40" }}
                    />
                    <span className="text-[#ccc] text-xs group-hover:text-white">{ev.title}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
