import { doc, runTransaction, getDoc, setDoc } from "firebase/firestore"
import { db } from "./firebase"

const DAILY_STOCK_COLLECTION = "daily_stock"
const DEFAULT_DAILY_LIMIT = 24

/**
 * Verifica si hay cupo diario disponible y lo reserva (incrementa contador) si es posible.
 * Maneja transaccionalmente la lectura y escritura para evitar condiciones de carrera.
 */
export async function verifyAndReserveDailyStock(date: string, quantity: number): Promise<void> {
  const stockRef = doc(db, DAILY_STOCK_COLLECTION, date)

  try {
    await runTransaction(db, async (transaction) => {
      const stockDoc = await transaction.get(stockRef)

      let currentOrdered = 0
      let limit = DEFAULT_DAILY_LIMIT

      if (stockDoc.exists()) {
        const data = stockDoc.data()
        currentOrdered = data.ordered || 0
        limit = data.limit || DEFAULT_DAILY_LIMIT
      }

      console.log(`[DailyStock] Checking stock for ${date}. Ordered: ${currentOrdered}, Limit: ${limit}, Requested: ${quantity}`)

      if (currentOrdered + quantity > limit) {
        console.error(`[DailyStock] Limit reached. Remaining: ${limit - currentOrdered}`)
        throw new Error(`Lo sentimos, solo nos quedan ${Math.max(0, limit - currentOrdered)} pizzas disponibles para este día.`)
      }

      // Si el documento no existe, set con merge: true lo creará.
      // Si existe, actualizamos.
      const newData = {
        date,
        limit,
        ordered: currentOrdered + quantity
      }
      console.log(`[DailyStock] Reserving. New ordered count: ${newData.ordered}`)
      
      transaction.set(stockRef, newData, { merge: true })
    })
  } catch (error) {
    console.error("Error en reserva de stock diario:", error)
    throw error
  }
}

/**
 * Libera el stock diario en caso de que falle otro paso del proceso (rollback).
 */
export async function releaseDailyStock(date: string, quantity: number): Promise<void> {
  const stockRef = doc(db, DAILY_STOCK_COLLECTION, date)

  try {
    await runTransaction(db, async (transaction) => {
      const stockDoc = await transaction.get(stockRef)

      if (!stockDoc.exists()) return // Nada que liberar si no existe

      const data = stockDoc.data()
      const currentOrdered = data.ordered || 0
      
      // No debería ser menor a 0, pero por seguridad
      const newOrdered = Math.max(0, currentOrdered - quantity)

      transaction.update(stockRef, {
        ordered: newOrdered
      })
    })
  } catch (error) {
    console.error("Error liberando stock diario:", error)
    // No lanzamos error aquí para no ocultar el error original que causó el rollback,
    // pero logueamos fuerte.
  }
}

/**
 * Obtiene la configuración de stock para un día.
 */
export async function getDailyStock(date: string): Promise<{ limit: number, ordered: number }> {
    const stockRef = doc(db, DAILY_STOCK_COLLECTION, date)
    const snap = await getDoc(stockRef)

    if (snap.exists()) {
        const data = snap.data()
        return {
            limit: data.limit || DEFAULT_DAILY_LIMIT,
            ordered: data.ordered || 0
        }
    }

    return {
        limit: DEFAULT_DAILY_LIMIT,
        ordered: 0
    }
}

/**
 * Actualiza el límite diario de pizzas.
 */
export async function updateDailyStockLimit(date: string, newLimit: number): Promise<void> {
    const stockRef = doc(db, DAILY_STOCK_COLLECTION, date)
    
    // Usamos set con merge para crear si no existe o actualizar si existe
    await setDoc(stockRef, {
        date,
        limit: newLimit
    }, { merge: true })
}
