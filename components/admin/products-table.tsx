"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
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
import { useEffect } from "react"

interface ProductsTableProps {
  products: Product[]
  onEdit: (product: Product) => void
  onDelete: (id: string) => Promise<void>
  onCreate: () => void
}

export function ProductsTable({
  products,
  onEdit,
  onDelete,
  onCreate,
}: ProductsTableProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null)
  
  // Daily Stock State
  const [dailyConfig, setDailyConfig] = useState<{ limit: number, ordered: number }>({ limit: 24, ordered: 0 })
  const [loadingStock, setLoadingStock] = useState(false)

  useEffect(() => {
    loadDailyStock()
  }, [])

  async function loadDailyStock() {
    setLoadingStock(true)
    try {
        const today = getTodayDateString()
        const stock = await getDailyStock(today)
        setDailyConfig(stock)
    } catch (e) {
        console.error("Error cargando stock diario:", e)
    } finally {
        setLoadingStock(false)
    }
  }

  async function handleUpdateLimit(newLimit: number) {
     try {
        const today = getTodayDateString()
        await updateDailyStockLimit(today, newLimit)
        setDailyConfig(prev => ({ ...prev, limit: newLimit }))
     } catch (e) {
        console.error("Error actualizando límite:", e)
        alert("No se pudo actualizar el límite diario.")
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

  return (
    <div className="space-y-6">
      
      {/* Daily Stock Control */}
      <div className="p-4 border rounded-md bg-secondary/5 flex items-center justify-between">
          <div className="flex items-center gap-6">
              <div>
                  <h3 className="font-semibold text-lg">Control de Stock Diario</h3>
                  <p className="text-sm text-muted-foreground">{getTodayDateString()}</p>
              </div>
              <div className="flex gap-4">
                  <div className="px-3 py-1 bg-background border rounded-md text-center min-w-[100px]">
                      <span className="block text-xs text-muted-foreground uppercase font-bold">Vendidas</span>
                      <span className="block text-xl font-bold text-foreground">{dailyConfig.ordered}</span>
                  </div>
                  <div className="px-3 py-1 bg-background border rounded-md text-center min-w-[100px]">
                      <span className="block text-xs text-muted-foreground uppercase font-bold">Disponibles</span>
                      <span className="block text-xl font-bold text-primary-medium">
                          {Math.max(0, dailyConfig.limit - dailyConfig.ordered)}
                      </span>
                  </div>
              </div>
          </div>
          <div className="flex items-center gap-4">
              <div className="flex flex-col items-end gap-1">
                  <label className="text-sm font-medium">Límite Diario:</label>
                  <input 
                     type="number" 
                     min="0"
                     className="border rounded px-2 py-1 w-24 text-right"
                     value={dailyConfig.limit}
                     onChange={(e) => handleUpdateLimit(parseInt(e.target.value) || 0)}
                  />
              </div>
              <Button 
                variant="outline" 
                size="icon" 
                onClick={loadDailyStock} 
                disabled={loadingStock}
                title="Actualizar datos"
              >
                  <svg 
                    xmlns="http://www.w3.org/2000/svg" 
                    width="16" 
                    height="16" 
                    viewBox="0 0 24 24" 
                    fill="none" 
                    stroke="currentColor" 
                    strokeWidth="2" 
                    strokeLinecap="round" 
                    strokeLinejoin="round"
                    className={loadingStock ? "animate-spin" : ""}
                  >
                      <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
                      <path d="M21 3v5h-5" />
                  </svg>
              </Button>
          </div>
      </div>

      <div className="flex justify-end">
        <Button onClick={onCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Producto
        </Button>
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Imagen</TableHead>
              <TableHead>Nombre</TableHead>
              <TableHead>Descripción</TableHead>
              <TableHead>Categoría</TableHead>
              <TableHead>Precio</TableHead>
              <TableHead>Stock</TableHead>
              <TableHead>Disponible</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  No hay productos. Crea uno nuevo para comenzar.
                </TableCell>
              </TableRow>
            ) : (
              products.map((product) => (
                <TableRow key={product.id}>
                  <TableCell>
                    <div className="relative h-16 w-16 overflow-hidden rounded-md">
                      <Image
                        src={product.imageUrl}
                        alt={product.name}
                        fill
                        className="object-cover"
                      />
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">{product.name}</TableCell>
                  <TableCell className="max-w-xs truncate">
                    {product.description}
                  </TableCell>
                  <TableCell>
                    <span className="capitalize">{product.category}</span>
                  </TableCell>
                  <TableCell>${product.price.toFixed(2)}</TableCell>
                  <TableCell>{product.stock}</TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${product.available
                        ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                        : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                        }`}
                    >
                      {product.available ? "Disponible" : "No disponible"}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => onEdit(product)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="destructive"
                            size="icon"
                            disabled={deletingId === product.id}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Esta acción no se puede deshacer. Esto eliminará
                              permanentemente el producto "{product.name}".
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(product.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Eliminar
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

