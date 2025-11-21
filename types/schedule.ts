export interface TimeSlot {
    id: string
    date: string // Formato: YYYY-MM-DD
    startTime: string // Formato: HH:mm
    endTime: string // Formato: HH:mm
    available: boolean
    maxPizzas: number
    bookedPizzas: number
}
