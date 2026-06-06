import {
  collection,
  doc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
} from "firebase/firestore"
import { db } from "./firebase"
import { Match } from "@/types/match"

const MATCHES_COLLECTION = "matches"

export async function getMatches(): Promise<Match[]> {
  const q = query(collection(db, MATCHES_COLLECTION), orderBy("matchDate", "asc"))
  const snapshot = await getDocs(q)
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as Match[]
}

export async function getNextMatch(): Promise<Match | null> {
  const now = new Date()
  const pad = (n: number) => n.toString().padStart(2, "0")
  // Usar fecha y hora LOCAL para evitar desfase con UTC en horarios nocturnos
  const today = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
  const currentTime = `${pad(now.getHours())}:${pad(now.getMinutes())}`

  const q = query(collection(db, MATCHES_COLLECTION), orderBy("matchDate", "asc"))
  const snapshot = await getDocs(q)
  const matches = snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as Match[]

  return matches.find(m => {
    if (m.isCompleted) return false
    if (m.matchDate > today) return true
    if (m.matchDate === today) return m.matchTime > currentTime
    return false
  }) ?? null
}

export async function createMatch(match: Omit<Match, "id">): Promise<string> {
  const docRef = await addDoc(collection(db, MATCHES_COLLECTION), match)
  return docRef.id
}

export async function updateMatch(id: string, match: Partial<Omit<Match, "id">>): Promise<void> {
  const docRef = doc(db, MATCHES_COLLECTION, id)
  await updateDoc(docRef, match)
}

export async function deleteMatch(id: string): Promise<void> {
  await deleteDoc(doc(db, MATCHES_COLLECTION, id))
}
