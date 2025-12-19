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
    try {
      await onDelete(id)
    } finally {
      setProcessingId(null)
    }
  }

  async function handleMarkSent(id: string) {
    setProcessingId(id)
    try {
      await onMarkSent(id)
    } finally {
      setProcessingId(null)
    }
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Cliente</TableHead>
            <TableHead>Pedido</TableHead>
            <TableHead>Horario</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead>Pago</TableHead>
            <TableHead>Total</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead className="text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {orders.length === 0 ? (
            <TableRow>
              <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                No hay pedidos para mostrar.
              </TableCell>
            </TableRow>
          ) : (
            orders.map((order) => (
              <TableRow key={order.id}>
                <TableCell className="font-medium">{order.clientName}</TableCell>

                <TableCell className="max-w-xs whitespace-normal">{order.order}</TableCell>

                <TableCell>{order.hour}</TableCell>

                <TableCell className="capitalize">{order.shippingType}</TableCell>

                <TableCell className="capitalize">{order.paymentMethod}</TableCell>

                <TableCell>${order.total.toFixed(2)}</TableCell>

                <TableCell>
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                      order.sent
                        ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                        : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                    }`}
                  >
                    {order.sent ? "Enviado" : "Pendiente"}
                  </span>
                </TableCell>

                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    {!order.sent && (
                      <Button
                        size="icon"
                        variant="outline"
                        disabled={processingId === order.id}
                        onClick={() => handleMarkSent(order.id)}
                      >
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      </Button>
                    )}

                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          size="icon"
                          variant="destructive"
                          disabled={processingId === order.id}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>

                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>¿Eliminar pedido?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Esta acción no se puede deshacer. Se eliminará
                            permanentemente el pedido de {order.clientName}.
                          </AlertDialogDescription>
                        </AlertDialogHeader>

                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                            className="bg-destructive hover:bg-destructive/90"
                            onClick={() => handleDelete(order.id)}
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
  )
}
