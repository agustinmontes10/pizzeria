"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { ChevronLeft, ChevronRight, Plus, Trash2 } from "lucide-react"
import { getSlotsByDay, createDaySlots as createSlots } from "@/lib/schedule-service"
import { TimeSlot } from "@/types/schedule"

export function ScheduleTable() {
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split("T")[0])
  const [slots, setSlots] = useState<TimeSlot[]>([])
  const [loading, setLoading] = useState(false)
  const [creating, setCreating] = useState(false)
  const [startTime, setStartTime] = useState("20:00")
  const [endTime, setEndTime] = useState("23:00")
  const [intervalMinutes, setIntervalMinutes] = useState(5)
  const [showConfig, setShowConfig] = useState(false)

  async function loadSlots(date: string) {
    setLoading(true)
    try {
      const result = await getSlotsByDay(date)
      setSlots(result)
      if (result.length === 0) toast.info("No hay horarios para este día")
    } catch (err) {
      console.error(err)
      toast.error("No se pudieron cargar los horarios")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadSlots(selectedDate) }, [selectedDate])

  function changeDate(delta: number) {
    const d = new Date(selectedDate)
    d.setDate(d.getDate() + delta)
    setSelectedDate(d.toISOString().split("T")[0])
  }

  async function handleCreateSlots() {
    setCreating(true)
    try {
      const [startHour, startMinute] = startTime.split(":").map(Number)
      const [endHour, endMinute] = endTime.split(":").map(Number)

      if (startHour * 60 + startMinute >= endHour * 60 + endMinute) {
        toast.error("La hora de inicio debe ser menor que la hora de fin")
        return
      }

      const createdIds = await createSlots(selectedDate, startHour, endHour, intervalMinutes, 1, startMinute, endMinute)
      toast.success(`Se crearon ${createdIds.length} horarios`)
      setShowConfig(false)
      loadSlots(selectedDate)
    } catch (e) {
      console.error(e)
      toast.error("Error creando horarios: " + (e as Error).message)
    } finally {
      setCreating(false)
    }
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr + "T00:00:00").toLocaleDateString("es-AR", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  const availableCount = slots.filter(s => s.available).length
  const occupiedCount = slots.filter(s => !s.available).length

  return (
    <div className="space-y-5">

      {/* Header with date navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => changeDate(-1)} className="hover:bg-foreground/5">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <input
            type="date"
            className="px-3 py-2 rounded-lg border border-foreground/20 text-sm focus:outline-none focus:ring-2 focus:ring-primary-medium/50"
            value={selectedDate}
            onChange={e => setSelectedDate(e.target.value)}
          />
          <Button variant="ghost" size="icon" onClick={() => changeDate(1)} className="hover:bg-foreground/5">
            <ChevronRight className="h-4 w-4" />
          </Button>
          <span className="text-sm text-foreground/50 capitalize hidden sm:inline">{formatDate(selectedDate)}</span>
        </div>

        <Button
          onClick={() => setShowConfig(!showConfig)}
          className="bg-primary-medium hover:bg-primary-dark text-white"
        >
          <Plus className="h-4 w-4 mr-2" />
          Crear horarios
        </Button>
      </div>

      {/* Config panel */}
      {showConfig && (
        <div className="p-5 bg-primary-medium/5 border border-primary-medium/10 rounded-xl space-y-4">
          <h3 className="font-semibold text-foreground">Configurar horarios</h3>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground/70 mb-1">Hora inicio</label>
              <input
                type="time"
                value={startTime}
                onChange={e => setStartTime(e.target.value)}
                className="w-full px-3 py-2 border border-foreground/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-medium/50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground/70 mb-1">Hora fin</label>
              <input
                type="time"
                value={endTime}
                onChange={e => setEndTime(e.target.value)}
                className="w-full px-3 py-2 border border-foreground/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-medium/50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground/70 mb-1">Intervalo (min)</label>
              <input
                type="number"
                min="1"
                max="60"
                value={intervalMinutes}
                onChange={e => setIntervalMinutes(parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-foreground/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-medium/50"
              />
            </div>
          </div>
          <p className="text-sm text-foreground/50">
            Slots desde {startTime} hasta {endTime} cada {intervalMinutes} minutos
          </p>
          <div className="flex gap-2">
            <Button
              onClick={handleCreateSlots}
              disabled={creating}
              className="bg-primary-medium hover:bg-primary-dark text-white"
            >
              {creating ? "Creando..." : "Generar horarios"}
            </Button>
            <Button variant="outline" onClick={() => setShowConfig(false)}>
              Cancelar
            </Button>
          </div>
        </div>
      )}

      {/* Summary */}
      {slots.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <div className="px-4 py-3 bg-background border border-foreground/10 rounded-xl text-center">
            <span className="block text-xs text-foreground/50 uppercase tracking-wide font-semibold">Total slots</span>
            <span className="block text-2xl font-bold text-foreground">{slots.length}</span>
          </div>
          <div className="px-4 py-3 bg-background border border-foreground/10 rounded-xl text-center">
            <span className="block text-xs text-foreground/50 uppercase tracking-wide font-semibold">Disponibles</span>
            <span className="block text-2xl font-bold text-green-600">{availableCount}</span>
          </div>
          <div className="px-4 py-3 bg-background border border-foreground/10 rounded-xl text-center">
            <span className="block text-xs text-foreground/50 uppercase tracking-wide font-semibold">Ocupados</span>
            <span className={`block text-2xl font-bold ${occupiedCount > 0 ? "text-amber-500" : "text-foreground/30"}`}>
              {occupiedCount}
            </span>
          </div>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="text-center py-12 text-foreground/50">Cargando horarios...</div>
      ) : slots.length === 0 ? (
        <div className="text-center py-12 text-foreground/50">
          <p>No hay horarios para este día.</p>
          <button
            onClick={() => setShowConfig(true)}
            className="text-sm text-primary-medium hover:underline mt-1"
          >
            Crear horarios
          </button>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-foreground/10">
                <th className="text-left py-3 px-4 font-semibold text-foreground/60">Horario</th>
                <th className="text-left py-3 px-4 font-semibold text-foreground/60">Estado</th>
                <th className="text-left py-3 px-4 font-semibold text-foreground/60">Pizzas</th>
                <th className="text-right py-3 px-4 font-semibold text-foreground/60">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {slots.map(slot => (
                <tr key={slot.id} className="border-b border-foreground/5 hover:bg-foreground/2">
                  <td className="py-3 px-4 font-medium">{slot.startTime} — {slot.endTime}</td>
                  <td className="py-3 px-4">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      slot.available
                        ? "bg-green-100 text-green-700"
                        : "bg-red-100 text-red-600"
                    }`}>
                      {slot.available ? "Disponible" : "Ocupado"}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <span className="text-foreground/70">{slot.bookedPizzas} / {slot.maxPizzas}</span>
                      <div className="w-16 h-1.5 bg-foreground/10 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary-medium rounded-full"
                          style={{ width: `${Math.min(100, (slot.bookedPizzas / slot.maxPizzas) * 100)}%` }}
                        />
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex justify-end">
                      <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-red-50">
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
