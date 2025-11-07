"use client"

import { useState } from "react"
import { CartButton } from "./cart-button"
import { CartDrawer } from "./cart-drawer"

export function Header() {
  const [isCartOpen, setIsCartOpen] = useState(false)

  return (
    <>
      <header className="bg-primary text-white sticky top-0 z-50 shadow-md">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl md:text-4xl font-bold">🍕 Pizzería Bella Napoli</h1>
            <div className="flex items-center gap-6">
              <nav className="hidden md:flex gap-6">
                <a href="#productos" className="hover:text-primary-light transition-colors">
                  Productos
                </a>
                <a href="#contacto" className="hover:text-primary-light transition-colors">
                  Contacto
                </a>
                <a href="/admin" className="hover:text-primary-light transition-colors">
                  Admin
                </a>
              </nav>
              <CartButton onClick={() => setIsCartOpen(true)} />
            </div>
          </div>
        </div>
      </header>

      <CartDrawer isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
    </>
  )
}
