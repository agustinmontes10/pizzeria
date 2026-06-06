"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Pencil, Trash2, Plus } from "lucide-react"
import type { Product } from "@/types/product"
import Image from "next/image"
import { getDailyStock, updateDailyStockLimit } from "@/lib/daily-stock-service"
import { getTodayDateString } from "@/utils"

interface ProductsTableProps {
  products: Product[]
  onEdit: (product: Product) => void
  onDelete: (id: string) => Promise<void>
  onCreate: () => void
}

export function ProductsTable({ products, onEdit, onDelete, onCreate }: ProductsTableProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [dailyConfig, setDailyConfig] = useState<{ limit: number; ordered: number }>({ limit: 24, ordered: 0 })
  const [loadingStock, setLoadingStock] = useState(false)

  useEffect(() => {
    loadDailyStock()
  }, [])

  async function loadDailyStock() {
    setLoadingStock(true)
    try {
      const stock = await getDailyStock(getTodayDateString())
      setDailyConfig(stock)
    } catch (e) {
      console.error("Error cargando stock diario:", e)
    } finally {
      setLoadingStock(false)
    }
  }

  async function handleUpdateLimit(newLimit: number) {
    try {
      await updateDailyStockLimit(getTodayDateString(), newLimit)
      setDailyConfig(prev => ({ ...prev, limit: newLimit }))
    } catch (e) {
      console.error("Error actualizando límite:", e)
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id)
    try {
      await onDelete(id)
    } finally {
      setDeletingId(null)
    }
  }

  const available = Math.max(0, dailyConfig.limit - dailyConfig.ordered)

  return (
    <div className="space-y-6">

      {/* Daily Stock */}
      <div className="p-4 bg-primary-medium/5 border border-primary-medium/10 rounded-xl flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="font-semibold text-foreground">Stock diario</h3>
          <p className="text-sm text-foreground/50 mt-0.5">{getTodayDateString()}</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex gap-3">
            <div className="px-4 py-2 bg-background border border-foreground/10 rounded-lg text-center min-w-[90px]">
              <span className="block text-xs text-foreground/50 uppercase tracking-wide font-semibold">Vendidas</span>
              <span className="block text-2xl font-bold text-foreground">{dailyConfig.ordered}</span>
            </div>
            <div className="px-4 py-2 bg-background border border-foreground/10 rounded-lg text-center min-w-[90px]">
              <span className="block text-xs text-foreground/50 uppercase tracking-wide font-semibold">Disponibles</span>
              <span className={`block text-2xl font-bold ${available === 0 ? "text-red-500" : "text-primary-medium"}`}>
                {available}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-foreground/70 whitespace-nowrap">Límite:</label>
            <input
              type="number"
              min="0"
              className="border border-foreground/20 rounded-lg px-3 py-1.5 w-20 text-center focus:outline-none focus:ring-2 focus:ring-primary-medium/50"
              value={dailyConfig.limit}
              onChange={e => handleUpdateLimit(parseInt(e.target.value) || 0)}
            />
            <Button
              variant="ghost"
              size="icon"
              onClick={loadDailyStock}
              disabled={loadingStock}
              className="h-8 w-8 hover:bg-foreground/5"
              title="Actualizar"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={loadingStock ? "animate-spin" : ""}>
                <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
                <path d="M21 3v5h-5" />
              </svg>
            </Button>
          </div>
        </div>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Productos</h2>
        <Button onClick={onCreate} className="bg-primary-medium hover:bg-primary-dark text-white">
          <Plus className="h-4 w-4 mr-2" />
          Nuevo producto
        </Button>
      </div>

      {/* Table */}
      {products.length === 0 ? (
        <div className="text-center py-12 text-foreground/50">
          <p>No hay productos todavía.</p>
          <p className="text-sm mt-1">Creá uno nuevo para comenzar.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-foreground/10">
                <th className="text-left py-3 px-4 font-semibold text-foreground/60">Imagen</th>
                <th className="text-left py-3 px-4 font-semibold text-foreground/60">Nombre</th>
                <th className="text-left py-3 px-4 font-semibold text-foreground/60">Descripción</th>
                <th className="text-left py-3 px-4 font-semibold text-foreground/60">Categoría</th>
                <th className="text-left py-3 px-4 font-semibold text-foreground/60">Precio</th>
                <th className="text-left py-3 px-4 font-semibold text-foreground/60">Stock</th>
                <th className="text-left py-3 px-4 font-semibold text-foreground/60">Estado</th>
                <th className="text-right py-3 px-4 font-semibold text-foreground/60">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {products.map(product => (
                <tr key={product.id} className="border-b border-foreground/5 hover:bg-foreground/2">
                  <td className="py-3 px-4">
                    <div className="relative h-14 w-14 overflow-hidden rounded-lg">
                      <Image src={product.imageUrl} alt={product.name} fill className="object-cover" />
                    </div>
                  </td>
                  <td className="py-3 px-4 font-medium">{product.name}</td>
                  <td className="py-3 px-4 text-foreground/60 max-w-[200px] truncate">{product.description}</td>
                  <td className="py-3 px-4 text-foreground/70 capitalize">{product.category}</td>
                  <td className="py-3 px-4">
                    {product.offerPrice && product.offerPrice > 0 ? (
                      <div className="flex flex-col">
                        <span className="text-xs text-foreground/40 line-through">${product.price.toFixed(2)}</span>
                        <span className="font-semibold text-primary-medium">${product.offerPrice.toFixed(2)}</span>
                      </div>
                    ) : (
                      <span className="font-medium">${product.price.toFixed(2)}</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-foreground/70">{product.stock}</td>
                  <td className="py-3 px-4">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      product.available
                        ? "bg-green-100 text-green-700"
                        : "bg-red-100 text-red-600"
                    }`}>
                      {product.available ? "Disponible" : "No disponible"}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onEdit(product)}
                        className="h-8 w-8 hover:bg-primary-medium/10"
                      >
                        <Pencil className="h-4 w-4 text-primary-medium" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            disabled={deletingId === product.id}
                            className="h-8 w-8 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>¿Eliminar producto?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Esta acción no se puede deshacer. Se eliminará permanentemente "{product.name}".
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(product.id)}
                              className="bg-red-500 hover:bg-red-600 text-white"
                            >
                              Eliminar
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
