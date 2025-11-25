"use client"

import Image from "next/image"
import type { CartItem } from "@/types/cart"
import { useCart } from "@/context/cart-context"

interface CartItemProps {
  item: CartItem
}

export function CartItemComponent({ item }: CartItemProps) {
  const { updateQuantity, removeFromCart } = useCart()

  return (
    <div className="flex gap-4 py-4 border-b border-foreground/20">
      <div className="relative w-20 h-20 flex-shrink-0">
        <Image
          src={item.imageUrl || "/placeholder.svg"}
          alt={item.name}
          fill
          className="object-cover rounded-md"
          sizes="80px"
        />
      </div>

      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-foreground truncate">{item.name}</h3>
        <p className="text-primary-medium font-bold">${item.price.toFixed(2)}</p>

        <div className="flex items-center gap-2 mt-2">
          <button
            onClick={() => updateQuantity(item.id, item.quantity - 1)}
            className="w-7 h-7 flex items-center justify-center bg-foreground/5 hover:bg-foreground/10 rounded-md transition-colors"
            aria-label="Disminuir cantidad"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>

          <span className="w-8 text-center font-semibold">{item.quantity}</span>

          <button
            onClick={() => updateQuantity(item.id, item.quantity + 1)}
            className="w-7 h-7 flex items-center justify-center bg-foreground/5 hover:bg-foreground/10 rounded-md transition-colors"
            aria-label="Aumentar cantidad"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>
        </div>
      </div>

      <button
        onClick={() => removeFromCart(item.id)}
        className="text-error hover:text-error/80 transition-colors self-start"
        aria-label="Eliminar del carrito"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M3 6h18" />
          <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
          <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
        </svg>
      </button>
    </div>
  )
}
