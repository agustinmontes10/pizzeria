"use client"

import type { Product } from "@/types/product"
import Image from "next/image"
import { useCart } from "@/context/cart-context"
import { useState } from "react"

interface ProductCardProps {
  product: Product
  quantity: number
}

export function ProductCard({ product, quantity }: ProductCardProps) {
  const { addToCart } = useCart()
  const [buttonState, setButtonState] = useState<"idle" | "loading" | "success">("idle")

  const isOutOfStock = (product.stock || 0) <= 0
  const isMaxStockReached = quantity >= (product.stock || 0)
  const isAvailable = product.available && !isOutOfStock

  const handleAddToCart = () => {
    if (isAvailable && !isMaxStockReached && buttonState === "idle") {
      setButtonState("loading")

      // Simulate loading/animation time
      setTimeout(() => {
        addToCart(product)
        setButtonState("success")

        // Reset to idle after showing success state
        setTimeout(() => {
          setButtonState("idle")
        }, 1500)
      }, 800)
    }
  }

  return (
    <article className="bg-secondary-light rounded-lg overflow-hidden shadow-lg shadow-secondary-light hover:shadow-xl transition-shadow duration-300 relative">
      <div className="relative w-full aspect-square h-[300px]">
        <Image
          src={product.imageUrl || "/placeholder.svg"}
          alt={product.name}
          fill
          className="object-cover"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        />
        {!product.available && (
          <div className="absolute inset-0 bg-foreground/70 flex items-center justify-center">
            <span className="bg-error text-white px-4 py-2 rounded-md font-semibold">No disponible</span>
          </div>
        )}
        {product.available && isOutOfStock && (
          <div className="absolute inset-0 bg-foreground/70 flex items-center justify-center">
            <span className="bg-error text-white px-4 py-2 rounded-md font-semibold">Agotado</span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-secondary-dark to-transparent pointer-events-none" />
      </div>

      <div className="relative -top-1 p-4 bg-gradient-to-t from-secondary-light to-secondary-dark">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="text-xl font-bold text-white/80 leading-tight">{product.name}</h3>
          <span className="text-xl font-bold text-primary-medium whitespace-nowrap">${product.price.toFixed(2)}</span>
        </div>

        <p className="text-white/80 text-sm leading-relaxed">{product.description}</p>
        <p className="text-xs text-white/60 mt-1">Stock: {product.stock || 0}</p>

        <button
          onClick={handleAddToCart}
          disabled={!isAvailable || isMaxStockReached || buttonState !== "idle"}
          className={`w-full mt-4 font-semibold py-3 px-4 rounded-md transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed relative z-10 overflow-hidden ${buttonState === "success"
            ? "bg-success text-white"
            : "bg-primary-medium hover:bg-primary-dark text-white"
            }`}
        >
          {/* Background fill animation */}
          <div
            className={`absolute inset-0 bg-primary-dark transition-all duration-800 ease-out ${buttonState === "loading" ? "w-full" : "w-0"
              }`}
          />

          {/* Button Text */}
          <span className="relative z-10">
            {buttonState === "loading"
              ? "Agregando.."
              : buttonState === "success"
                ? "¡Agregado!"
                : !product.available
                  ? "No disponible"
                  : isOutOfStock
                    ? "Sin Stock"
                    : isMaxStockReached
                      ? "Limitado por Stock"
                      : "Agregar al carrito"
            }
          </span>
        </button>
      </div>

      {quantity > 0 && (
        <div className="absolute w-15 h-15 -top-1 -left-1 pointer-events-none z-20 bg-primary-medium text-white  rounded-br-lg shadow-lg shadow-secondary-light flex items-center justify-center animate-in fade-in slide-in-from-top-2 slide-in-from-left-2 duration-500">
          <p className="font-bold">{quantity}</p>
        </div>
      )}

    </article>
  )
}
