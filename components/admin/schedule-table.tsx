"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { generateDailySlots, getDaySlots, initDaySchedule, reserveSlots, resetDaySlots } from "@/lib/schedule-service"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { toast } from "sonner"
import { ChevronLeft, ChevronRight } from "lucide-react"

export function ScheduleTable() {
    const [selectedDate, setSelectedDate] = useState(() => {
        const d = new Date()
        return d.toISOString().split("T")[0]
    })

    const [slots, setSlots] = useState<Record<string, boolean> | null>(null)
    const [loading, setLoading] = useState(false)
    const [creating, setCreating] = useState(false)

    async function loadSlots(date: string) {
        setLoading(true)
        try {
            await initDaySchedule(date)
            const result = await getDaySlots(date)
            setSlots(result)
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

    async function createDaySlots() {
        setCreating(true)
        try {
            await resetDaySlots(selectedDate)
            toast.success("Horarios generados")
            loadSlots(selectedDate)
        } catch (e) {
            console.error(e)
            toast.error("Error creando horarios")
        }
        setCreating(false)
    }


    return (
        <div className="w-full">
            {/* FECHA Y ACCIONES */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <Button variant="outline" onClick={() => changeDate(-1)}>
                        <ChevronLeft />
                    </Button>

                    <input
                        type="date"
                        className="px-3 py-2 rounded-md border"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                    />

                    <Button variant="outline" onClick={() => changeDate(1)}>
                        <ChevronRight />
                    </Button>
                </div>

                <Button onClick={createDaySlots} disabled={creating}>
                    {creating ? "Creando..." : "Crear horarios del día"}
                </Button>
            </div>

            {/* TABLA */}
            {loading ? (
                <p className="text-center text-muted-foreground">Cargando...</p>
            ) : !slots ? (
                <p className="text-center text-muted-foreground">No hay horarios</p>
            ) : (
                <div className="rounded-md border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Hora</TableHead>
                                <TableHead>Estado</TableHead>
                            </TableRow>
                        </TableHeader>

                        <TableBody>
                            {Object.keys(slots).map((hour) => (
                                <TableRow key={hour}>
                                    <TableCell className="font-medium">{hour}</TableCell>
                                    <TableCell>
                                        <span
                                            className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${slots[hour]
                                                    ? "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-200"
                                                    : "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-200"
                                                }`}
                                        >
                                            {slots[hour] ? "Ocupado" : "Disponible"}
                                        </span>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            )}
        </div>
    )
}
