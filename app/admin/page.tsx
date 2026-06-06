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

const VIEW_LABELS: Record<AdminView, string> = {
  products: "Productos",
  schedule: "Horarios",
  orders: "Órdenes",
  matches: "Partidos",
  bets: "Apuestas",
}

export default function AdminPage() {
  const [user, setUser] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [products, setProducts] = useState<Product[]>([])
  const [isProductDialogOpen, setIsProductDialogOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | undefined>()
  const [orders, setOrders] = useState<Order[]>([])
  const [view, setView] = useState<AdminView>("orders")
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [matches, setMatches] = useState<Match[]>([])
  const [isMatchDialogOpen, setIsMatchDialogOpen] = useState(false)
  const [editingMatch, setEditingMatch] = useState<Match | undefined>()

  const router = useRouter()

  useEffect(() => {
    const unsubscribe = onAuthStateChange((user) => {
      setUser(user)
      setIsLoading(false)
      if (user) { loadProducts(); loadMatches() }
    })
    return () => unsubscribe()
  }, [])

  async function loadProducts() {
    try { setProducts(await getProducts()) }
    catch (e: any) { toast.error("Error al cargar productos: " + e.message) }
  }

  async function loadMatches() {
    try { setMatches(await getMatches()) }
    catch (e: any) { toast.error("Error al cargar partidos: " + e.message) }
  }

  async function handleCreateProduct(data: Omit<Product, "id">) {
    await createProduct(data); await loadProducts()
    setIsProductDialogOpen(false); setEditingProduct(undefined)
  }

  async function handleUpdateProduct(data: Omit<Product, "id">) {
    if (!editingProduct) return
    await updateProduct(editingProduct.id, data); await loadProducts()
    setIsProductDialogOpen(false); setEditingProduct(undefined)
  }

  async function handleDeleteProduct(id: string) {
    try { await deleteProduct(id); await loadProducts(); toast.success("Producto eliminado") }
    catch (e: any) { toast.error("Error al eliminar: " + e.message) }
  }

  async function handleCreateMatch(data: Omit<Match, "id">) {
    try { await createMatch(data); await loadMatches(); setIsMatchDialogOpen(false); toast.success("Partido creado") }
    catch (e: any) { toast.error("Error al crear partido: " + e.message) }
  }

  async function handleUpdateMatch(data: Omit<Match, "id">) {
    if (!editingMatch) return
    try {
      await updateMatch(editingMatch.id, data); await loadMatches()
      setIsMatchDialogOpen(false); setEditingMatch(undefined); toast.success("Partido actualizado")
    } catch (e: any) { toast.error("Error al actualizar partido: " + e.message) }
  }

  async function handleDeleteMatch(id: string) {
    try { await deleteMatch(id); await loadMatches(); toast.success("Partido eliminado") }
    catch (e: any) { toast.error("Error al eliminar partido: " + e.message) }
  }

  async function handleSignOut() {
    try { await signOutUser(); setUser(null); router.push("/"); toast.success("Sesión cerrada") }
    catch (e: any) { toast.error("Error al cerrar sesión: " + e.message) }
  }

  useEffect(() => {
    const dateStr = format(selectedDate, "yyyy-MM-dd")
    let previousCount: number | null = null
    const unsubscribe = listenToOrders((data) => {
      if (previousCount !== null && data.length > previousCount) {
        new Audio("/nuevoPedido.mp3").play().catch(() => {})
        toast.info("¡Nueva orden recibida!")
      }
      previousCount = data.length
      setOrders(data)
    }, dateStr)
    return () => unsubscribe()
  }, [selectedDate])

  if (isLoading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-medium mx-auto mb-4" />
        <p className="text-foreground/60">Cargando...</p>
      </div>
    </div>
  )

  if (!user) return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md p-8 bg-[var(--white)] rounded-lg shadow-lg">
        <h1 className="text-2xl font-bold mb-6 text-center">Panel de Administración</h1>
        <LoginForm onSuccess={() => {}} />
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6 sm:py-8">

        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Panel Admin</h1>
            <p className="text-foreground/60 mt-0.5 text-sm hidden sm:block">{VIEW_LABELS[view]}</p>
          </div>
          <Button
            variant="outline"
            onClick={handleSignOut}
            className="border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800"
          >
            <LogOut className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Cerrar Sesión</span>
          </Button>
        </div>

        {/* Nav — scrollable strip on mobile, wrap on desktop */}
        <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0 mb-6">
          <div className="flex gap-2 min-w-max sm:min-w-0 sm:flex-wrap pb-1">
            {(Object.keys(VIEW_LABELS) as AdminView[]).map(v => (
              <Button
                key={v}
                size="sm"
                variant={view === v ? "default" : "outline"}
                className={view === v
                  ? "bg-primary-medium hover:bg-primary-dark text-white"
                  : "border-primary-medium text-primary-medium hover:bg-primary-medium/10"}
                onClick={() => setView(v)}
              >
                {VIEW_LABELS[v]}
              </Button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="bg-[var(--white)] rounded-xl shadow-sm border border-black/5 p-4 sm:p-6">

          {view === "products" && (
            <ProductsTable
              products={products}
              onEdit={p => { setEditingProduct(p); setIsProductDialogOpen(true) }}
              onDelete={handleDeleteProduct}
              onCreate={() => { setEditingProduct(undefined); setIsProductDialogOpen(true) }}
            />
          )}

          {view === "orders" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-secondary-light/5 p-3 sm:p-4 rounded-lg border border-secondary-light/10">
                <Button variant="ghost" size="icon" onClick={() => setSelectedDate(d => subDays(d, 1))} className="hover:bg-secondary-light/10">
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <h2 className="text-sm sm:text-xl font-semibold capitalize text-primary-medium">
                  {format(selectedDate, "EEEE d 'de' MMMM", { locale: es })}
                </h2>
                <Button variant="ghost" size="icon" onClick={() => setSelectedDate(d => addDays(d, 1))} className="hover:bg-secondary-light/10">
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
              <OrdersTable orders={orders} onDelete={deleteOrder} onMarkSent={id => updateOrder(id, { sent: true })} />
            </div>
          )}

          {view === "schedule" && <ScheduleTable />}

          {view === "matches" && (
            <MatchesTable
              matches={matches}
              onEdit={m => { setEditingMatch(m); setIsMatchDialogOpen(true) }}
              onDelete={handleDeleteMatch}
              onCreate={() => { setEditingMatch(undefined); setIsMatchDialogOpen(true) }}
            />
          )}

          {view === "bets" && <BetsTable />}
        </div>

        {/* Product dialog */}
        <Dialog open={isProductDialogOpen} onOpenChange={setIsProductDialogOpen}>
          <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingProduct ? "Editar Producto" : "Nuevo Producto"}</DialogTitle>
            </DialogHeader>
            <ProductForm
              product={editingProduct}
              onSubmit={editingProduct ? handleUpdateProduct : handleCreateProduct}
              onCancel={() => { setIsProductDialogOpen(false); setEditingProduct(undefined) }}
            />
          </DialogContent>
        </Dialog>

        {/* Match dialog */}
        <Dialog open={isMatchDialogOpen} onOpenChange={setIsMatchDialogOpen}>
          <DialogContent className="w-[95vw] max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingMatch ? "Editar Partido" : "Nuevo Partido"}</DialogTitle>
            </DialogHeader>
            <MatchForm
              match={editingMatch}
              onSubmit={editingMatch ? handleUpdateMatch : handleCreateMatch}
              onCancel={() => { setIsMatchDialogOpen(false); setEditingMatch(undefined) }}
            />
          </DialogContent>
        </Dialog>

      </div>
    </div>
  )
}
