"use client"

import type { Product } from "@/types/product"
import Image from "next/image"
import { useCart } from "@/context/cart-context"

interface ProductCardProps {
  product: Product
}

export function ProductCard({ product }: ProductCardProps) {
  const { addToCart } = useCart()

  const handleAddToCart = () => {
    if (product.available) {
      addToCart(product)
    }
  }

  return (
    <article className="bg-secondary-light rounded-lg overflow-hidden shadow-lg shadow-secondary-light hover:shadow-xl transition-shadow duration-300 relative">
      <div className="relative w-full aspect-square">
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
        <div className="absolute inset-0 bg-gradient-to-t from-secondary-dark to-transparent pointer-events-none" />
      </div>

      <div className="relative -top-1 p-4 bg-gradient-to-t from-secondary-light to-secondary-dark">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="text-xl font-bold text-white/80 leading-tight">{product.name}</h3>
          <span className="text-xl font-bold text-primary-medium whitespace-nowrap">${product.price.toFixed(2)}</span>
        </div>

        <p className="text-white/80 text-sm leading-relaxed">{product.description}</p>

        <button
          onClick={handleAddToCart}
          disabled={!product.available}
          className="w-full mt-4 bg-primary-medium hover:bg-primary-dark text-white font-semibold py-3 px-4 rounded-md transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed relative z-10"
        >
          {product.available ? "Agregar al carrito" : "No disponible"}
        </button>
      </div>


    </article>
  )
}
