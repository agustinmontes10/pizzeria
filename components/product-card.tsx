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
    <article className="bg-background rounded-lg overflow-hidden border border-foreground/20 hover:shadow-lg transition-shadow duration-300">
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
      </div>

      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="text-xl font-bold text-foreground leading-tight">{product.name}</h3>
          <span className="text-xl font-bold text-primary-medium whitespace-nowrap">${product.price.toFixed(2)}</span>
        </div>

        <p className="text-foreground/70 text-sm leading-relaxed">{product.description}</p>

        <button
          onClick={handleAddToCart}
          disabled={!product.available}
          className="w-full mt-4 bg-primary-medium hover:bg-primary-dark text-white font-semibold py-3 px-4 rounded-md transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {product.available ? "Agregar al carrito" : "No disponible"}
        </button>
      </div>
    </article>
  )
}
