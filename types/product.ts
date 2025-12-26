export interface Product {
  id: string
  name: string
  description: string
  price: number
  imageUrl: string
  category: "pizza" | "bebida" | "postre"
  available: boolean
  stock: number
  offerPrice?: number
}
