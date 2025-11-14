import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore"
import { db } from "./firebase"

const SCHEDULE_COLLECTION = "schedule"
const SLOT_INTERVAL = 5 // minutos por pizza
const TIME_START = "20:00"
const TIME_END = "23:00"

// Genera slots del día (20:00 a 23:00 por ejemplo)
export function generateDailySlots(start = TIME_START, end = TIME_END) {
    const slots: Record<string, boolean> = {}
    let [h, m] = start.split(":").map(Number)
    const [hEnd, mEnd] = end.split(":").map(Number)

    while (h < hEnd || (h === hEnd && m <= mEnd)) {
        const key = `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`
        slots[key] = false
        m += SLOT_INTERVAL
        if (m >= 60) {
            m = 0
            h += 1
        }
    }

    return slots
}

// Inicializa el documento del día si no existe
export async function initDaySchedule(date: string) {
    const ref = doc(db, SCHEDULE_COLLECTION, date)
    const snap = await getDoc(ref)

    if (!snap.exists()) {
        const slots = generateDailySlots(TIME_START, TIME_END)
        await setDoc(ref, { slots })
    }
}

// Obtiene los slots del día
export async function getDaySlots(date: string) {
    await initDaySchedule(date)
    const ref = doc(db, SCHEDULE_COLLECTION, date)
    const snap = await getDoc(ref)

    if (!snap.exists()) return null
    return snap.data().slots as Record<string, boolean>
}

export async function getAvailableSlots(date: string, pizzas: number) {
    const slots = await getDaySlots(date)
    if (!slots) return []
    const keys = Object.keys(slots)

    const required = pizzas // cantidad de slots consecutivos

    const available: string[] = []

    for (let i = 0; i < keys.length; i++) {
        const h = keys[i]
        let valid = true
        // Validar hacia atrás
        for (let j = 0; j < required; j++) {
            const idx = i - j
            if (idx < 0 || slots[keys[idx]] === true) {
                valid = false
                break
            }
        }
        if (valid) {
            available.push(h)
        }
    }

    return available
}

export async function reserveSlots(date: string, hour: string, pizzas: number) {
    const ref = doc(db, SCHEDULE_COLLECTION, date)
    const snap = await getDoc(ref)

    if (!snap.exists()) throw new Error("El día no está inicializado")

    const slots = snap.data().slots as Record<string, boolean>
    const keys = Object.keys(slots)

    const idx = keys.indexOf(hour)
    if (idx === -1) throw new Error("Hora inválida")

    // Validar que todos los slots hacia atrás están libres
    for (let j = 0; j < pizzas; j++) {
        const slotIdx = idx - j
        if (slotIdx < 0 || slots[keys[slotIdx]] === true) {
            throw new Error("Horario no disponible") // ❌ horario ocupado
        }
    }

    // ✅ Reservar slots
    for (let j = 0; j < pizzas; j++) {
        const slotIdx = idx - j
        slots[keys[slotIdx]] = true
    }

    // Guardar cambios
    await updateDoc(ref, { slots })
}

export async function resetDaySlots(date: string) {
    try {
        const ref = doc(db, SCHEDULE_COLLECTION, date)
        const slots = generateDailySlots(TIME_START, TIME_END)
        await setDoc(ref, { slots }, { merge: false })
        return slots
    } catch (error) {
        console.error("Error en resetDaySlots:", error)
        throw error
    }
}