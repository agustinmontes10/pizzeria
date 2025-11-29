"use client"

import { useState, useEffect, useRef } from "react"
import { useCart } from "@/context/cart-context"

interface CartButtonProps {
  onClick: () => void
}

export function CartButton({ onClick }: CartButtonProps) {
  const { totalItems } = useCart()
  const [isBouncing, setIsBouncing] = useState(false)
  const prevTotalItems = useRef(totalItems)

  useEffect(() => {
    if (totalItems > 0) {
      setIsBouncing(true)
    }
    prevTotalItems.current = totalItems
  }, [totalItems])

  return (
    <button
      onClick={onClick}
      className={`
                fixed bottom-5 right-5 p-5
                bg-primary-medium hover:bg-secondary-dark rounded-lg transition-colors 
                shadow-xl shadow-secondary-light
                ${isBouncing ? "animate-bounce" : ""}
              `}
      aria-label="Abrir carrito"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="9" cy="21" r="1" />
        <circle cx="20" cy="21" r="1" />
        <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
      </svg>

      {totalItems > 0 && (
        <span className="absolute top-[2px] right-[20px] bg-secondary text-white text-lg font-bold rounded-full h-5 w-5 flex items-center justify-center">
          {totalItems}
        </span>
      )}
    </button>
  )
}
