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
import { onAuthStateChange, signOutUser } from "@/lib/auth-service"
import {
  getProducts,
  createProduct,
  updateProduct,
  deleteProduct,
} from "@/lib/products-service"
import type { Product } from "@/types/product"
import { toast } from "sonner"
import { LogOut, ChevronLeft, ChevronRight } from "lucide-react"
import { ScheduleTable } from "@/components/admin/schedule-table"
import { Order } from "@/types/order"
import { deleteOrder, listenToOrders, updateOrder } from "@/lib/orders-service"
import { OrdersTable } from "@/components/admin/orders-table"
import { format, addDays, subDays } from "date-fns"
import { es } from "date-fns/locale"
import { MatchForm } from "@/components/admin/match-form"
import { MatchesTable } from "@/components/admin/matches-table"
import { BetsTable } from "@/components/admin/bets-table"
import { Match } from "@/types/match"
import { getMatches, createMatch, updateMatch, deleteMatch } from "@/lib/matches-service"

type AdminView = "products" | "schedule" | "orders" | "matches" | "bets"

export default function AdminPage() {
  const [user, setUser] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [products, setProducts] = useState<Product[]>([])
  const [isProductDialogOpen, setIsProductDialogOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | undefined>()
  const [orders, setOrders] = useState<Order[]>([])
  const [view, setView] = useState<AdminView>("products")
  const [selectedDate, setSelectedDate] = useState(new Date())

  // Matches state
  const [matches, setMatches] = useState<Match[]>([])
  const [isMatchDialogOpen, setIsMatchDialogOpen] = useState(false)
  const [editingMatch, setEditingMatch] = useState<Match | undefined>()

  const router = useRouter()

  useEffect(() => {
    const unsubscribe = onAuthStateChange((user) => {
      setUser(user)
      setIsLoading(false)
      if (user) {
        loadProducts()
        loadMatches()
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

  async function loadMatches() {
    try {
      const matchesData = await getMatches()
      setMatches(matchesData)
    } catch (error: any) {
      toast.error("Error al cargar partidos: " + error.message)
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

  async function handleCreateMatch(data: Omit<Match, "id">) {
    try {
      await createMatch(data)
      await loadMatches()
      setIsMatchDialogOpen(false)
      toast.success("Partido creado correctamente")
    } catch (error: any) {
      toast.error("Error al crear partido: " + error.message)
    }
  }

  async function handleUpdateMatch(data: Omit<Match, "id">) {
    if (!editingMatch) return
    try {
      await updateMatch(editingMatch.id, data)
      await loadMatches()
      setIsMatchDialogOpen(false)
      setEditingMatch(undefined)
      toast.success("Partido actualizado correctamente")
    } catch (error: any) {
      toast.error("Error al actualizar partido: " + error.message)
    }
  }

  async function handleDeleteMatch(id: string) {
    try {
      await deleteMatch(id)
      await loadMatches()
      toast.success("Partido eliminado correctamente")
    } catch (error: any) {
      toast.error("Error al eliminar partido: " + error.message)
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

  function handleEditProduct(product: Product) {
    setEditingProduct(product)
    setIsProductDialogOpen(true)
  }

  function handleNewProduct() {
    setEditingProduct(undefined)
    setIsProductDialogOpen(true)
  }

  function handleEditMatch(match: Match) {
    setEditingMatch(match)
    setIsMatchDialogOpen(true)
  }

  function handleNewMatch() {
    setEditingMatch(undefined)
    setIsMatchDialogOpen(true)
  }

  async function handleDeleteOrder(id: string) {
    await deleteOrder(id)
  }

  async function handleMarkSent(id: string) {
    await updateOrder(id, { sent: true })
  }

  useEffect(() => {
    const dateStr = format(selectedDate, "yyyy-MM-dd")
    let previousCount: number | null = null

    const unsubscribe = listenToOrders((data) => {
      if (previousCount !== null && data.length > previousCount) {
        const audio = new Audio("/nuevoPedido.mp3")
        audio.play().catch(error => console.error("Error reproduciendo audio:", error))
        toast.info("¡Nueva orden recibida!")
      }
      previousCount = data.length
      setOrders(data)
    }, dateStr)

    return () => unsubscribe()
  }, [selectedDate])

  const handlePrevDay = () => setSelectedDate(prev => subDays(prev, 1))
  const handleNextDay = () => setSelectedDate(prev => addDays(prev, 1))

  const viewLabels: Record<AdminView, string> = {
    products: "Gestiona los productos",
    schedule: "Gestiona los horarios",
    orders: "Gestiona las órdenes",
    matches: "Gestiona los partidos para apuestas",
    bets: "Apuestas realizadas por clientes",
  }

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
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-full max-w-md p-8 bg-[var(--white)] rounded-lg shadow-lg">
          <h1 className="text-2xl font-bold mb-6 text-center">Panel de Administración</h1>
          <LoginForm onSuccess={() => { }} />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Panel de Administración</h1>
            <p className="text-foreground/60 mt-1">{viewLabels[view]}</p>
          </div>

          <div className="flex flex-wrap gap-2">
            {(["products", "schedule", "orders", "matches", "bets"] as AdminView[]).map(v => (
              <Button
                key={v}
                className={view === v ? "bg-primary-medium hover:bg-primary-dark text-white" : "border-primary-medium text-primary-medium hover:bg-primary-medium/10"}
                variant={view === v ? "default" : "outline"}
                onClick={() => setView(v)}
              >
                {{ products: "Productos", schedule: "Horarios", orders: "Órdenes", matches: "Partidos", bets: "Apuestas" }[v]}
              </Button>
            ))}

            <Button
              variant="outline"
              onClick={handleSignOut}
              className="border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Cerrar Sesión
            </Button>
          </div>
        </div>

        <div className="bg-[var(--white)] rounded-xl shadow-sm border border-black/5 p-6">
          {view === "products" && (
            <ProductsTable
              products={products}
              onEdit={handleEditProduct}
              onDelete={handleDeleteProduct}
              onCreate={handleNewProduct}
            />
          )}

          {view === "orders" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-secondary-light/5 p-4 rounded-lg border border-secondary-light/10">
                <Button variant="ghost" size="icon" onClick={handlePrevDay} className="hover:bg-secondary-light/10">
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <h2 className="text-xl font-semibold capitalize text-primary-medium">
                  {format(selectedDate, "EEEE d 'de' MMMM", { locale: es })}
                </h2>
                <Button variant="ghost" size="icon" onClick={handleNextDay} className="hover:bg-secondary-light/10">
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
              <OrdersTable orders={orders} onDelete={handleDeleteOrder} onMarkSent={handleMarkSent} />
            </div>
          )}

          {view === "schedule" && <ScheduleTable />}

          {view === "matches" && (
            <MatchesTable
              matches={matches}
              onEdit={handleEditMatch}
              onDelete={handleDeleteMatch}
              onCreate={handleNewMatch}
            />
          )}

          {view === "bets" && <BetsTable />}
        </div>

        {/* Product dialog */}
        <Dialog open={isProductDialogOpen} onOpenChange={setIsProductDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingProduct ? "Editar Producto" : "Nuevo Producto"}</DialogTitle>
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

        {/* Match dialog */}
        <Dialog open={isMatchDialogOpen} onOpenChange={setIsMatchDialogOpen}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingMatch ? "Editar Partido" : "Nuevo Partido"}</DialogTitle>
            </DialogHeader>
            <MatchForm
              match={editingMatch}
              onSubmit={editingMatch ? handleUpdateMatch : handleCreateMatch}
              onCancel={() => {
                setIsMatchDialogOpen(false)
                setEditingMatch(undefined)
              }}
            />
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
