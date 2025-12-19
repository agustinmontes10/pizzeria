import {
    collection,
    doc,
    getDocs,
    addDoc,
    query,
    where,
    getDoc,
    updateDoc,
} from "firebase/firestore"
import { db } from "./firebase"
import { TimeSlot } from "@/types/schedule"

const SCHEDULE_COLLECTION = "schedules"

/**
 * Genera slots de tiempo para un día específico
 * @param date - Fecha en formato YYYY-MM-DD
 * @param startHour - Hora de inicio (0-23)
 * @param endHour - Hora de fin (0-23)
 * @param intervalMinutes - Intervalo en minutos entre cada slot (tiempo para hacer una pizza)
 * @param maxPizzasPerSlot - Máximo de pizzas que se pueden hacer por slot (default: 1)
 * @param startMinute - Minuto de inicio (0-59, default: 0)
 * @returns Array de IDs de los slots creados
 */
export async function createDaySlots(
    date: string,
    startHour: number,
    endHour: number,
    intervalMinutes: number,
    maxPizzasPerSlot: number = 1,
    startMinute: number = 0
): Promise<string[]> {
    try {
        const slots: Omit<TimeSlot, "id">[] = []

        // Convertir a minutos totales para validación
        const startTotalMinutes = startHour * 60 + startMinute
        const endTotalMinutes = endHour * 60

        // Validar que la hora de inicio sea menor que la hora de fin
        if (startTotalMinutes >= endTotalMinutes) {
            throw new Error("La hora de inicio debe ser menor que la hora de fin")
        }

        // Validar que el intervalo sea válido
        if (intervalMinutes <= 0 || intervalMinutes > 60) {
            throw new Error("El intervalo debe ser entre 1 y 60 minutos")
        }

        // Generar slots para el día
        let currentHour = startHour
        let currentMinute = startMinute

        while (currentHour < endHour || (currentHour === endHour && currentMinute === 0)) {
            const startTime = `${String(currentHour).padStart(2, "0")}:${String(currentMinute).padStart(2, "0")}`

            // Calcular hora de fin del slot
            let endMinute = currentMinute + intervalMinutes
            let endSlotHour = currentHour

            if (endMinute >= 60) {
                endSlotHour = currentHour + Math.floor(endMinute / 60)
                endMinute = endMinute % 60
            }

            const endTime = `${String(endSlotHour).padStart(2, "0")}:${String(endMinute).padStart(2, "0")}`

            // No crear slot si el tiempo de fin excede la hora límite
            if (endSlotHour > endHour || (endSlotHour === endHour && endMinute > 0)) {
                break
            }

            slots.push({
                date,
                startTime,
                endTime,
                available: true,
                maxPizzas: maxPizzasPerSlot,
                bookedPizzas: 0,
            })

            // Avanzar al siguiente slot
            currentMinute += intervalMinutes
            if (currentMinute >= 60) {
                currentHour += Math.floor(currentMinute / 60)
                currentMinute = currentMinute % 60
            }
        }

        // Guardar todos los slots en Firestore
        const createdIds: string[] = []
        for (const slot of slots) {
            const docRef = await addDoc(collection(db, SCHEDULE_COLLECTION), slot)
            createdIds.push(docRef.id)
        }

        console.log(`Se crearon ${createdIds.length} slots para el día ${date}`)
        return createdIds
    } catch (error) {
        console.error("Error creando slots:", error)
        throw error
    }
}

/**
 * Obtiene todos los slots para un día específico
 * @param date - Fecha en formato YYYY-MM-DD
 * @returns Array de TimeSlots ordenados por hora de inicio
 */
export async function getSlotsByDay(date: string): Promise<TimeSlot[]> {
    try {
        const q = query(
            collection(db, SCHEDULE_COLLECTION),
            where("date", "==", date)
        )

        const querySnapshot = await getDocs(q)
        const slots = querySnapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
        })) as TimeSlot[]

        // Ordenar por hora de inicio en el cliente
        slots.sort((a, b) => a.startTime.localeCompare(b.startTime))

        return slots
    } catch (error) {
        console.error("Error obteniendo slots por día:", error)
        throw error
    }
}

/**
 * Interface para horarios disponibles con información de entrega
 */
export interface AvailableTimeSlot {
    deliveryTime: string // Hora de entrega (cuando estará listo el pedido)
    startTime: string // Hora de inicio de preparación
    slotsNeeded: number // Cantidad de slots necesarios
    slotIds: string[] // IDs de los slots que se usarán
}

/**
 * Obtiene los horarios disponibles para un pedido según la cantidad de pizzas
 * @param date - Fecha en formato YYYY-MM-DD
 * @param totalPizzas - Cantidad total de pizzas del pedido
 * @param intervalMinutes - Intervalo en minutos por pizza (default: 5)
 * @returns Array de horarios disponibles con hora de entrega
 */
export async function getAvailableTimeSlotsForOrder(
    date: string,
    totalPizzas: number,
    intervalMinutes: number = 5
): Promise<AvailableTimeSlot[]> {
    try {
        // Obtener todos los slots del día
        const allSlots = await getSlotsByDay(date)

        if (allSlots.length === 0) {
            return []
        }

        // Calcular cuántos slots necesitamos para este pedido
        const slotsNeeded = Math.ceil(totalPizzas)

        const availableTimeSlots: AvailableTimeSlot[] = []

        // Pre-calcular información de tiempo actual
        const now = new Date()
        const currentYear = now.getFullYear()
        const currentMonth = String(now.getMonth() + 1).padStart(2, "0")
        const currentDay = String(now.getDate()).padStart(2, "0")
        const currentDate = `${currentYear}-${currentMonth}-${currentDay}`
        
        const currentHours = String(now.getHours()).padStart(2, "0")
        const currentMinutes = String(now.getMinutes()).padStart(2, "0")
        const currentTime = `${currentHours}:${currentMinutes}`
        
        const isToday = date === currentDate

        // Buscar secuencias de slots consecutivos disponibles
        for (let i = 0; i <= allSlots.length - slotsNeeded; i++) {
            const consecutiveSlots = allSlots.slice(i, i + slotsNeeded)

            // Verificar que todos los slots sean consecutivos y estén disponibles
            let allAvailable = true
            let areConsecutive = true

            for (let j = 0; j < consecutiveSlots.length; j++) {
                const slot = consecutiveSlots[j]

                // Verificar disponibilidad
                if (!slot.available || slot.bookedPizzas >= slot.maxPizzas) {
                    allAvailable = false
                    break
                }

                // Verificar que sean consecutivos (excepto el primero)
                if (j > 0) {
                    const prevSlot = consecutiveSlots[j - 1]
                    if (prevSlot.endTime !== slot.startTime) {
                        areConsecutive = false
                        break
                    }
                }
            }

            // Si todos los slots están disponibles y son consecutivos, verificar si el horario es válido
            if (allAvailable && areConsecutive) {
                const firstSlot = consecutiveSlots[0]
                const lastSlot = consecutiveSlots[consecutiveSlots.length - 1]

                // Si es hoy, validar que el slot de inicio no sea anterior a la hora actual
                if (isToday && firstSlot.startTime < currentTime) {
                    continue
                }

                availableTimeSlots.push({
                    deliveryTime: lastSlot.endTime, // La hora de entrega es cuando termina el último slot
                    startTime: firstSlot.startTime, // Hora en que se empieza a preparar
                    slotsNeeded: slotsNeeded,
                    slotIds: consecutiveSlots.map(s => s.id)
                })
            }
        }

        return availableTimeSlots
    } catch (error) {
        console.error("Error obteniendo horarios disponibles:", error)
        throw error
    }
}

/**
 * Reserva slots para un pedido incrementando el contador de pizzas reservadas
 * @param slotIds - Array de IDs de los slots a reservar
 * @returns true si la reserva fue exitosa
 * @throws Error si algún slot no está disponible o no existe
 */
export async function bookSlots(slotIds: string[]): Promise<boolean> {
    try {
        // Verificar disponibilidad de todos los slots antes de reservar
        for (const slotId of slotIds) {
            const slotDocRef = doc(db, SCHEDULE_COLLECTION, slotId)
            const slotDoc = await getDoc(slotDocRef)

            if (!slotDoc.exists()) {
                throw new Error(`Slot ${slotId} no existe`)
            }

            const slotData = slotDoc.data() as Omit<TimeSlot, "id">

            // Verificar que el slot esté disponible y tenga capacidad
            if (!slotData.available) {
                throw new Error(`Slot ${slotId} no está disponible`)
            }

            // Cada slot se reserva para 1 pizza
            if (slotData.bookedPizzas + 1 > slotData.maxPizzas) {
                throw new Error(`Slot ${slotId} no tiene capacidad suficiente`)
            }
        }

        // Si todos los slots están disponibles, proceder con la reserva
        for (const slotId of slotIds) {
            const slotDocRef = doc(db, SCHEDULE_COLLECTION, slotId)
            const slotDoc = await getDoc(slotDocRef)
            const slotData = slotDoc.data() as Omit<TimeSlot, "id">

            // Incrementar el contador de pizzas reservadas en 1
            await updateDoc(slotDocRef, {
                bookedPizzas: slotData.bookedPizzas + 1
            })
        }

        console.log(`Se reservaron ${slotIds.length} slots`)
        return true
    } catch (error) {
        console.error("Error reservando slots:", error)
        throw error
    }
}
