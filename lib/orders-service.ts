import {
    collection,
    doc,
    getDocs,
    getDoc,
    addDoc,
    updateDoc,
    deleteDoc,
    query,
    orderBy,
} from "firebase/firestore"
import { db } from "./firebase"
import { Order } from "@/types/order"

const ORDERS_COLLECTION = "orders"

// Obtener todos las ordenes
export async function getOrders(): Promise<Order[]> {
    try {
        const q = query(collection(db, ORDERS_COLLECTION), orderBy("name"))
        const querySnapshot = await getDocs(q)
        return querySnapshot.docs.map((order) => ({
            id: order.id,
            ...order.data(),
        })) as Order[]
    } catch (error) {
        console.error("Error obteniendo ordenes:", error)
        throw error
    }
}

// Obtener una orden por ID
export async function getOrderById(id: string): Promise<Order | null> {
    try {
        const docRef = doc(db, ORDERS_COLLECTION, id)
        const docSnap = await getDoc(docRef)
        if (docSnap.exists()) {
            return {
                id: docSnap.id,
                ...docSnap.data(),
            } as Order
        }
        return null
    } catch (error) {
        console.error("Error obteniendo orden:", error)
        throw error
    }
}

// Crear una nueva orden
export async function createOrder(order: Omit<Order, "id">): Promise<string> {
    try {
        console.log('entroooo')
        const docRef = await addDoc(collection(db, ORDERS_COLLECTION), order)
        return docRef.id
    } catch (error) {
        console.error("Error creando orden:", error)
        throw error
    }
}

// Actualizar una orden
export async function updateOrder(
    id: string,
    order: Partial<Omit<Order, "id">>
): Promise<void> {
    try {
        const docRef = doc(db, ORDERS_COLLECTION, id)
        await updateDoc(docRef, order)
    } catch (error) {
        console.error("Error actualizando orden:", error)
        throw error
    }
}

// Eliminar una orden
export async function deleteOrder(id: string): Promise<void> {
    try {
        const docRef = doc(db, ORDERS_COLLECTION, id)
        await deleteDoc(docRef)
    } catch (error) {
        console.error("Error eliminando orden:", error)
        throw error
    }
}