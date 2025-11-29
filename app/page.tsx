"use client"

import { useState, useMemo, useEffect } from "react"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { CategoryFilter } from "@/components/category-filter"
import { ProductGrid } from "@/components/product-grid"
import { getProducts } from "@/lib/products-service"
import type { Product } from "@/types/product"
import { toast } from "sonner"
import { CartButton } from "@/components/cart-button"
import { CartDrawer } from "@/components/cart-drawer"

export default function HomePage() {
  const [activeCategory, setActiveCategory] = useState("all")
  const [products, setProducts] = useState<Product[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isCartOpen, setIsCartOpen] = useState(false)

  useEffect(() => {
    async function loadProducts() {
      try {
        const productsData = await getProducts()
        // Solo mostrar productos disponibles
        setProducts(productsData.filter((p) => p.available))
      } catch (error: any) {
        console.error("Error cargando productos:", error)
        toast.error("Error al cargar productos")
        // Fallback a array vacío en caso de error
        setProducts([])
      } finally {
        setIsLoading(false)
      }
    }
    loadProducts()
  }, [])

  const filteredProducts = useMemo(() => {
    if (activeCategory === "all") {
      return products
    }
    return products.filter((product) => product.category === activeCategory)
  }, [activeCategory, products])

  return (
    <div className="min-h-screen flex flex-col bg-primary-light">
      <Header />

      <main className="flex-1">
        {/* Products Section */}
        <section id="productos" className="container mx-auto px-4 py-12">
          {isLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-medium mx-auto mb-4"></div>
              <p className="text-foreground/60">Cargando productos...</p>
            </div>
          ) : (
            <ProductGrid products={filteredProducts} />
          )}
        </section>
      </main>

      <Footer />

      <CartButton onClick={() => setIsCartOpen(true)} />
      <CartDrawer isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />

    </div>
  )
}
