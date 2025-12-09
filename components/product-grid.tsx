import type { Product } from "@/types/product"
import { ProductCard } from "./product-card"
import type { CartItem } from "@/types/cart"

interface ProductGridProps {
  products: Product[]
  items: CartItem[]
}

export function ProductGrid({ products, items }: ProductGridProps) {
  if (products.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-xl text-foreground/60">No hay productos disponibles en esta categoría</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} quantity={items.find((item) => item.id === product.id)?.quantity || 0} />
      ))}
    </div>
  )
}
