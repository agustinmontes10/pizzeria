"use client"

import { useState } from "react"
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
import { CheckCircle, Trash2 } from "lucide-react"
import { Order } from "@/types/order"

interface OrdersTableProps {
  orders: Order[]
  onDelete: (id: string) => Promise<void>
  onMarkSent: (id: string) => Promise<void>
}

export function OrdersTable({ orders, onDelete, onMarkSent }: OrdersTableProps) {
  const [processingId, setProcessingId] = useState<string | null>(null)

  async function handleDelete(id: string) {
    setProcessingId(id)
    try { await onDelete(id) } finally { setProcessingId(null) }
  }

  async function handleMarkSent(id: string) {
    setProcessingId(id)
    try { await onMarkSent(id) } finally { setProcessingId(null) }
  }

  const totalRevenue = orders.reduce((sum, o) => sum + o.total, 0)
  const pendingCount = orders.filter(o => !o.sent).length

  const StatusBadge = ({ sent }: { sent: boolean }) => (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
      sent ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
    }`}>
      {sent ? "Enviado" : "Pendiente"}
    </span>
  )

  const ActionButtons = ({ order }: { order: Order }) => (
    <div className="flex gap-2 items-center">
      {!order.sent && (
        <Button
          variant="ghost" size="icon"
          disabled={processingId === order.id}
          onClick={() => handleMarkSent(order.id)}
          className="h-8 w-8 hover:bg-green-50"
          title="Marcar como enviado"
        >
          <CheckCircle className="h-4 w-4 text-green-600" />
        </Button>
      )}
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button
            variant="ghost" size="icon"
            disabled={processingId === order.id}
            className="h-8 w-8 hover:bg-red-50"
          >
            <Trash2 className="h-4 w-4 text-red-500" />
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent className="w-[90vw] max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar pedido?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará permanentemente el pedido de {order.clientName}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => handleDelete(order.id)} className="bg-red-500 hover:bg-red-600 text-white">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )

  return (
    <div className="space-y-4">

      {/* Stats */}
      {orders.length > 0 && (
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          <div className="px-3 py-2 sm:px-4 sm:py-3 bg-background border border-foreground/10 rounded-xl text-center">
            <span className="block text-xs text-foreground/50 uppercase tracking-wide font-semibold">Pedidos</span>
            <span className="block text-xl sm:text-2xl font-bold text-foreground">{orders.length}</span>
          </div>
          <div className="px-3 py-2 sm:px-4 sm:py-3 bg-background border border-foreground/10 rounded-xl text-center">
            <span className="block text-xs text-foreground/50 uppercase tracking-wide font-semibold">Pendientes</span>
            <span className={`block text-xl sm:text-2xl font-bold ${pendingCount > 0 ? "text-amber-500" : "text-foreground/30"}`}>
              {pendingCount}
            </span>
          </div>
          <div className="px-3 py-2 sm:px-4 sm:py-3 bg-primary-medium/5 border border-primary-medium/10 rounded-xl text-center">
            <span className="block text-xs text-foreground/50 uppercase tracking-wide font-semibold">Total</span>
            <span className="block text-xl sm:text-2xl font-bold text-primary-medium">${totalRevenue.toFixed(0)}</span>
          </div>
        </div>
      )}

      {orders.length === 0 ? (
        <div className="text-center py-12 text-foreground/50">
          <p>No hay pedidos para este día.</p>
        </div>
      ) : (
        <>
          {/* Mobile: card view */}
          <div className="sm:hidden space-y-3">
            {orders.map(order => (
              <div key={order.id} className="border border-foreground/10 rounded-xl p-4 space-y-3 bg-background">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-foreground">{order.clientName}</p>
                    <p className="text-sm text-foreground/60 mt-0.5">{order.hour} · {order.pizzas} pizza{order.pizzas !== 1 ? "s" : ""}</p>
                  </div>
                  <StatusBadge sent={order.sent} />
                </div>

                <p className="text-sm text-foreground/70 leading-relaxed">{order.order}</p>

                <div className="text-xs text-foreground/50 truncate">{order.shippingType}</div>

                <div className="flex items-center justify-between pt-1 border-t border-foreground/5">
                  <div>
                    <span className="text-xs text-foreground/50">{order.paymentMethod} · </span>
                    <span className="font-bold text-primary-medium">${order.total.toFixed(0)}</span>
                  </div>
                  <ActionButtons order={order} />
                </div>
              </div>
            ))}
          </div>

          {/* Desktop: table view */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-foreground/10">
                  <th className="text-left py-3 px-4 font-semibold text-foreground/60">Cliente</th>
                  <th className="text-left py-3 px-4 font-semibold text-foreground/60">Pedido</th>
                  <th className="text-left py-3 px-4 font-semibold text-foreground/60">Hora</th>
                  <th className="text-left py-3 px-4 font-semibold text-foreground/60">Entrega</th>
                  <th className="text-left py-3 px-4 font-semibold text-foreground/60">Pago</th>
                  <th className="text-left py-3 px-4 font-semibold text-foreground/60">Total</th>
                  <th className="text-left py-3 px-4 font-semibold text-foreground/60">Estado</th>
                  <th className="text-right py-3 px-4 font-semibold text-foreground/60">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {orders.map(order => (
                  <tr key={order.id} className="border-b border-foreground/5 hover:bg-foreground/2">
                    <td className="py-3 px-4 font-medium">{order.clientName}</td>
                    <td className="py-3 px-4 text-foreground/70 max-w-[180px] whitespace-normal">{order.order}</td>
                    <td className="py-3 px-4 font-medium">{order.hour}</td>
                    <td className="py-3 px-4 text-foreground/70 max-w-[160px] truncate">{order.shippingType}</td>
                    <td className="py-3 px-4 text-foreground/70 capitalize">{order.paymentMethod}</td>
                    <td className="py-3 px-4 font-semibold">${order.total.toFixed(2)}</td>
                    <td className="py-3 px-4"><StatusBadge sent={order.sent} /></td>
                    <td className="py-3 px-4">
                      <div className="flex justify-end">
                        <ActionButtons order={order} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
