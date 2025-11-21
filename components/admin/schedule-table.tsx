"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { ChevronLeft, ChevronRight, Plus, Trash2 } from "lucide-react"
import { getSlotsByDay, createDaySlots as createSlots } from "@/lib/schedule-service"
import { TimeSlot } from "@/types/schedule"

export function ScheduleTable() {
    const [selectedDate, setSelectedDate] = useState(() => {
        const d = new Date()
        return d.toISOString().split("T")[0]
    })

    const [slots, setSlots] = useState<TimeSlot[]>([])
    const [loading, setLoading] = useState(false)
    const [creating, setCreating] = useState(false)

    // Configuración para crear slots
    const [startTime, setStartTime] = useState("20:00")
    const [endTime, setEndTime] = useState("23:00")
    const [intervalMinutes, setIntervalMinutes] = useState(5)
    const [showConfig, setShowConfig] = useState(false)

    async function loadSlots(date: string) {
        setLoading(true)
        try {
            const result = await getSlotsByDay(date)
            setSlots(result)
            if (result.length === 0) {
                toast.info("No hay horarios para este día")
            }
        } catch (err) {
            console.error(err)
            toast.error("No se pudieron cargar los horarios")
        }
        setLoading(false)
    }

    useEffect(() => {
        loadSlots(selectedDate)
    }, [selectedDate])

    function changeDate(delta: number) {
        const d = new Date(selectedDate)
        d.setDate(d.getDate() + delta)
        setSelectedDate(d.toISOString().split("T")[0])
    }

    async function handleCreateSlots() {
        setCreating(true)
        try {
            // Parsear hora y minutos de los inputs de tiempo
            const [startHour, startMinute] = startTime.split(":").map(Number)
            const [endHour, endMinute] = endTime.split(":").map(Number)

            // Convertir todo a minutos para calcular correctamente
            const startTotalMinutes = startHour * 60 + startMinute
            const endTotalMinutes = endHour * 60 + endMinute

            if (startTotalMinutes >= endTotalMinutes) {
                toast.error("La hora de inicio debe ser menor que la hora de fin")
                setCreating(false)
                return
            }

            const createdIds = await createSlots(
                selectedDate,
                startHour,
                endHour,
                intervalMinutes,
                1,
                startMinute
            )
            toast.success(`Se crearon ${createdIds.length} horarios`)
            setShowConfig(false)
            loadSlots(selectedDate)
        } catch (e) {
            console.error(e)
            toast.error("Error creando horarios: " + (e as Error).message)
        }
        setCreating(false)
    }

    function formatDate(dateStr: string) {
        const d = new Date(dateStr + "T00:00:00")
        return d.toLocaleDateString("es-AR", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric"
        })
    }

    return (
        <div className="w-full space-y-4">
            {/* FECHA Y ACCIONES */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="icon" onClick={() => changeDate(-1)}>
                        <ChevronLeft className="h-4 w-4" />
                    </Button>

                    <input
                        type="date"
                        className="px-3 py-2 rounded-md border"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                    />

                    <Button variant="outline" size="icon" onClick={() => changeDate(1)}>
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>

                <Button onClick={() => setShowConfig(!showConfig)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Crear horarios
                </Button>
            </div>

            {/* FECHA SELECCIONADA */}
            <div className="text-sm text-muted-foreground">
                {formatDate(selectedDate)}
            </div>

            {/* CONFIGURACIÓN PARA CREAR SLOTS */}
            {showConfig && (
                <div className="rounded-lg border p-4 space-y-4 bg-muted/50">
                    <h3 className="font-semibold">Configuración de horarios</h3>

                    <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="startTime">Hora inicio</Label>
                            <Input
                                id="startTime"
                                type="time"
                                value={startTime}
                                onChange={(e) => setStartTime(e.target.value)}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="endTime">Hora fin</Label>
                            <Input
                                id="endTime"
                                type="time"
                                value={endTime}
                                onChange={(e) => setEndTime(e.target.value)}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="interval">Intervalo (minutos)</Label>
                            <Input
                                id="interval"
                                type="number"
                                min="1"
                                max="60"
                                value={intervalMinutes}
                                onChange={(e) => setIntervalMinutes(parseInt(e.target.value))}
                            />
                        </div>
                    </div>

                    <div className="text-sm text-muted-foreground">
                        Se crearán slots desde las {startTime} hasta las {endTime} con intervalos de {intervalMinutes} minutos
                    </div>

                    <div className="flex gap-2">
                        <Button onClick={handleCreateSlots} disabled={creating}>
                            {creating ? "Creando..." : "Generar horarios"}
                        </Button>
                        <Button variant="outline" onClick={() => setShowConfig(false)}>
                            Cancelar
                        </Button>
                    </div>
                </div>
            )}

            {/* TABLA DE SLOTS */}
            {loading ? (
                <p className="text-center text-muted-foreground py-8">Cargando...</p>
            ) : slots.length === 0 ? (
                <div className="text-center py-8 border rounded-lg">
                    <p className="text-muted-foreground">No hay horarios para este día</p>
                    <Button
                        variant="link"
                        onClick={() => setShowConfig(true)}
                        className="mt-2"
                    >
                        Crear horarios
                    </Button>
                </div>
            ) : (
                <div className="rounded-md border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Horario</TableHead>
                                <TableHead>Estado</TableHead>
                                <TableHead>Pizzas</TableHead>
                                <TableHead className="text-right">Acciones</TableHead>
                            </TableRow>
                        </TableHeader>

                        <TableBody>
                            {slots.map((slot) => (
                                <TableRow key={slot.id}>
                                    <TableCell className="font-medium">
                                        {slot.startTime} - {slot.endTime}
                                    </TableCell>
                                    <TableCell>
                                        <span
                                            className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${slot.available
                                                ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-200"
                                                : "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-200"
                                                }`}
                                        >
                                            {slot.available ? "Disponible" : "Ocupado"}
                                        </span>
                                    </TableCell>
                                    <TableCell>
                                        <span className="text-sm">
                                            {slot.bookedPizzas} / {slot.maxPizzas}
                                        </span>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-destructive"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            )}

            {/* RESUMEN */}
            {slots.length > 0 && (
                <div className="text-sm text-muted-foreground">
                    Total: {slots.length} slots | Disponibles: {slots.filter(s => s.available).length} | Ocupados: {slots.filter(s => !s.available).length}
                </div>
            )}
        </div>
    )
}
