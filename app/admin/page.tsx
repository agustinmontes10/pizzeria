"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { LoginForm } from "@/components/admin/login-form"
import { ProductForm } from "@/components/admin/product-form"
import { ProductsTable } from "@/components/admin/products-table"
import { onAuthStateChange, signOutUser, getCurrentUser } from "@/lib/auth-service"
import {
  getProducts,
  createProduct,
  updateProduct,
  deleteProduct,
} from "@/lib/products-service"
import type { Product } from "@/types/product"
import { toast } from "sonner"
import { LogOut, Plus } from "lucide-react"
import { ScheduleTable } from "@/components/admin/schedule-table"
import { Order } from "@/types/order"
import { deleteOrder, listenToOrders, updateOrder } from "@/lib/orders-service"
import { OrdersTable } from "@/components/admin/orders-table"

export default function AdminPage() {
  const [user, setUser] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [products, setProducts] = useState<Product[]>([])
  const [isProductDialogOpen, setIsProductDialogOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | undefined>()
  const [orders, setOrders] = useState<Order[]>([]);
  const [view, setView] = useState<"products" | "schedule" | "orders">("products")

  const router = useRouter()

  useEffect(() => {
    const unsubscribe = onAuthStateChange((user) => {
      setUser(user)
      setIsLoading(false)
      if (user) {
        loadProducts()
      }
    })

    return () => unsubscribe()
  }, [])

  async function loadProducts() {
    try {
      const productsData = await getProducts()
      setProducts(productsData)
    } catch (error: any) {
      toast.error("Error al cargar productos: " + error.message)
    }
  }

  async function handleCreateProduct(data: Omit<Product, "id">) {
    await createProduct(data)
    await loadProducts()
    setIsProductDialogOpen(false)
    setEditingProduct(undefined)
  }

  async function handleUpdateProduct(data: Omit<Product, "id">) {
    if (!editingProduct) return
    await updateProduct(editingProduct.id, data)
    await loadProducts()
    setIsProductDialogOpen(false)
    setEditingProduct(undefined)
  }

  async function handleDeleteProduct(id: string) {
    try {
      await deleteProduct(id)
      await loadProducts()
      toast.success("Producto eliminado correctamente")
    } catch (error: any) {
      toast.error("Error al eliminar producto: " + error.message)
    }
  }

  async function handleSignOut() {
    try {
      await signOutUser()
      setUser(null)
      router.push("/")
      toast.success("Sesión cerrada correctamente")
    } catch (error: any) {
      toast.error("Error al cerrar sesión: " + error.message)
    }
  }

  function handleEdit(product: Product) {
    setEditingProduct(product)
    setIsProductDialogOpen(true)
  }

  function handleNewProduct() {
    setEditingProduct(undefined)
    setIsProductDialogOpen(true)
  }

  async function handleDeleteOrder(id: string) {
    await deleteOrder(id)
  }

  async function handleMarkSent(id: string) {
    await updateOrder(id, { sent: true })
  }

  useEffect(() => {
    const unsubscribe = listenToOrders((data) => {
      setOrders(data)
    })

    return () => unsubscribe()
  }, [])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-medium mx-auto mb-4"></div>
          <p className="text-foreground/60">Cargando...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="w-full max-w-md p-8 bg-white dark:bg-gray-800 rounded-lg shadow-lg">
          <h1 className="text-2xl font-bold mb-6 text-center">
            Panel de Administración
          </h1>
          <LoginForm onSuccess={() => { }} />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Panel de Administración</h1>
            <p className="text-foreground/60 mt-1">
              {view === "products" ? "Gestiona los productos" : "Gestiona los horarios"}
            </p>
          </div>

          <div className="flex gap-2">
            <Button
              variant={view === "products" ? "default" : "outline"}
              onClick={() => setView("products")}
            >
              Productos
            </Button>

            <Button
              variant={view === "schedule" ? "default" : "outline"}
              onClick={() => setView("schedule")}
            >
              Horarios
            </Button>

            <Button
              variant={view === "orders" ? "default" : "outline"}
              onClick={() => setView("orders")}
            >
              Órdenes
            </Button>


            <Button variant="outline" onClick={handleSignOut}>
              <LogOut className="h-4 w-4 mr-2" />
              Cerrar Sesión
            </Button>
          </div>
        </div>


        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          {view === "products" ? (
            <ProductsTable
              products={products}
              onEdit={handleEdit}
              onDelete={handleDeleteProduct}
              onCreate={handleNewProduct}
            />
          ) : view === "orders" ? (
            <OrdersTable
              orders={orders}
              onDelete={handleDeleteOrder}
              onMarkSent={handleMarkSent}
            />
          ) : (
            <ScheduleTable />
          )}
        </div>


        <Dialog open={isProductDialogOpen} onOpenChange={setIsProductDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingProduct ? "Editar Producto" : "Nuevo Producto"}
              </DialogTitle>
            </DialogHeader>
            <ProductForm
              product={editingProduct}
              onSubmit={editingProduct ? handleUpdateProduct : handleCreateProduct}
              onCancel={() => {
                setIsProductDialogOpen(false)
                setEditingProduct(undefined)
              }}
            />
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}

