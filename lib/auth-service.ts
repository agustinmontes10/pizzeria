import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User,
} from "firebase/auth"
import { auth } from "./firebase"

// Iniciar sesión
export async function signIn(email: string, password: string) {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password)
    return userCredential.user
  } catch (error) {
    console.error("Error al iniciar sesión:", error)
    throw error
  }
}

// Cerrar sesión
export async function signOutUser() {
  try {
    await signOut(auth)
  } catch (error) {
    console.error("Error al cerrar sesión:", error)
    throw error
  }
}

// Observar cambios en el estado de autenticación
export function onAuthStateChange(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, callback)
}

// Obtener usuario actual
export function getCurrentUser(): User | null {
  return auth.currentUser
}

