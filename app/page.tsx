"use client"

import { useState, useMemo } from "react"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { CategoryFilter } from "@/components/category-filter"
import { ProductGrid } from "@/components/product-grid"
import { mockProducts } from "@/data/products"

export default function HomePage() {
  const [activeCategory, setActiveCategory] = useState("all")

  const filteredProducts = useMemo(() => {
    if (activeCategory === "all") {
      return mockProducts
    }
    return mockProducts.filter((product) => product.category === activeCategory)
  }, [activeCategory])

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1">
        {/* Products Section */}
        <section id="productos" className="container mx-auto px-4 py-12">
          <ProductGrid products={filteredProducts} />
        </section>
      </main>

      <Footer />
    </div>
  )
}
