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
  runTransaction,
} from "firebase/firestore"
import { db } from "./firebase"
import type { Product } from "@/types/product"

const PRODUCTS_COLLECTION = "products"

// Obtener todos los productos
export async function getProducts(): Promise<Product[]> {
  try {
    const q = query(collection(db, PRODUCTS_COLLECTION), orderBy("name"))
    const querySnapshot = await getDocs(q)
    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Product[]
  } catch (error) {
    console.error("Error obteniendo productos:", error)
    throw error
  }
}

// Obtener un producto por ID
export async function getProductById(id: string): Promise<Product | null> {
  try {
    const docRef = doc(db, PRODUCTS_COLLECTION, id)
    const docSnap = await getDoc(docRef)
    if (docSnap.exists()) {
      return {
        id: docSnap.id,
        ...docSnap.data(),
      } as Product
    }
    return null
  } catch (error) {
    console.error("Error obteniendo producto:", error)
    throw error
  }
}

// Crear un nuevo producto
export async function createProduct(
  product: Omit<Product, "id">
): Promise<string> {
  try {
    const docRef = await addDoc(collection(db, PRODUCTS_COLLECTION), product)
    return docRef.id
  } catch (error) {
    console.error("Error creando producto:", error)
    throw error
  }
}

// Actualizar un producto
export async function updateProduct(
  id: string,
  product: Partial<Omit<Product, "id">>
): Promise<void> {
  try {
    const docRef = doc(db, PRODUCTS_COLLECTION, id)
    await updateDoc(docRef, product)
  } catch (error) {
    console.error("Error actualizando producto:", error)
    throw error
  }
}

// Eliminar un producto
export async function deleteProduct(id: string): Promise<void> {
  try {
    const docRef = doc(db, PRODUCTS_COLLECTION, id)
    await deleteDoc(docRef)
  } catch (error) {
    console.error("Error eliminando producto:", error)
    throw error
  }
}

// Verificar y descontar stock de múltiples productos
export async function verifyAndDecrementStock(
  items: { id: string; quantity: number }[]
): Promise<void> {
  try {
    await runTransaction(db, async (transaction) => {
      // 1. Leer todos los productos primero
      const productReads = items.map(async (item) => {
        const docRef = doc(db, PRODUCTS_COLLECTION, item.id)
        const docSnap = await transaction.get(docRef)
        return { docRef, docSnap, requestedQuantity: item.quantity }
      })

      const results = await Promise.all(productReads)

      // 2. Verificar stock
      for (const { docSnap, requestedQuantity } of results) {
        if (!docSnap.exists()) {
          throw new Error(`El producto con ID ${docSnap.id} no existe.`)
        }

        const productData = docSnap.data() as Product
        const currentStock = productData.stock || 0

        if (currentStock < requestedQuantity) {
          throw new Error(
            `No hay suficiente stock para ${productData.name}. Stock actual: ${currentStock}, Solicitado: ${requestedQuantity}`
          )
        }
      }

      // 3. Descontar stock
      for (const { docRef, docSnap, requestedQuantity } of results) {
        const currentStock = (docSnap.data() as Product).stock || 0
        transaction.update(docRef, {
          stock: currentStock - requestedQuantity,
        })
      }
    })
  } catch (error) {
    console.error("Error en transacción de stock:", error)
    throw error
  }
}

