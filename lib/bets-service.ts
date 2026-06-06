import {
  collection,
  doc,
  addDoc,
  deleteDoc,
  query,
  orderBy,
  onSnapshot,
  getDocs,
} from "firebase/firestore"
import { db } from "./firebase"
import { Bet } from "@/types/bet"

const BETS_COLLECTION = "bets"

export async function createBet(bet: Omit<Bet, "id">): Promise<string> {
  const docRef = await addDoc(collection(db, BETS_COLLECTION), bet)
  return docRef.id
}

export async function deleteBet(id: string): Promise<void> {
  await deleteDoc(doc(db, BETS_COLLECTION, id))
}

export async function getBets(): Promise<Bet[]> {
  const q = query(collection(db, BETS_COLLECTION), orderBy("createdAt", "desc"))
  const snapshot = await getDocs(q)
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as Bet[]
}

export function listenToBets(callback: (bets: Bet[]) => void) {
  const q = query(collection(db, BETS_COLLECTION), orderBy("createdAt", "desc"))
  return onSnapshot(q, snapshot => {
    const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as Bet[]
    callback(data)
  })
}
