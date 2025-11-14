"use client"

import { useCart } from "@/context/cart-context"
import { CartItemComponent } from "./cart-item"
import { useEffect, useState } from "react"
import { createOrder } from "@/lib/orders-service"
import { Order } from "@/types/order"
import { reserveSlots } from "@/lib/schedule-service"
import { getTodayDateString } from "@/utils"

interface CartDrawerProps {
  isOpen: boolean
  onClose: () => void
}

export function CartDrawer({ isOpen, onClose }: CartDrawerProps) {
  const { items, totalItems, totalPrice, clearCart } = useCart()
  const [step, setStep] = useState(1)
  const [formData, setFormData] = useState({
    name: '',
    paymentMethod: 'efectivo',
    deliveryTime: '',
    deliveryType: 'retiro'
  })

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  // Bloquear scroll cuando el drawer está abierto
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = "unset"
    }

    return () => {
      document.body.style.overflow = "unset"
    }
  }, [isOpen])

  async function handleSendOrder(e: React.FormEvent) {
    e.preventDefault()

    if (!formData.name || !formData.deliveryTime) {
      alert('Por favor completa todos los campos obligatorios')
      return
    }

    try {
      // 1) Calcular cantidad de pizzas del pedido
      const totalPizzas = items.reduce((acc, item) => acc + item.quantity, 0)

      // 2) Construir objeto order SIN id todavía (id lo genera Firestore)
      const order: Omit<Order, "id"> = {
        order: items.map(item => `${item.quantity}x ${item.name}`).join(', '),
        hour: formData.deliveryTime,
        clientName: formData.name,
        paymentMethod: formData.paymentMethod,
        shippingType: formData.deliveryType,
        total: totalPrice,
        sent: false,
        pizzas: totalPizzas,          // ✅ Agregalo a tu tipo Order
        date: getTodayDateString(),  // ✅ Necesitas YYYY-MM-DD para los slots
      }

      // 3) Reservar slots ANTES de crear orden
      await reserveSlots(order.date, order.hour, order.pizzas)

      // 4) Si la reserva funciona, creas la orden
      const orderId = await createOrder(order)

      // 5) Reset de estados
      clearCart()
      setFormData({
        name: '',
        paymentMethod: 'efectivo',
        deliveryTime: '',
        deliveryType: 'retiro'
      })
      setStep(1)
      onClose()

      alert('¡Pedido realizado con éxito!')

    } catch (error: any) {
      console.error('Error al crear el pedido:', error)

      if (error.message === "Horario no disponible") {
        alert('El horario ya fue tomado. Por favor elegí otro.')
      } else {
        alert('Hubo un error al procesar tu pedido. Inténtalo nuevamente.')
      }
    }
  }

  if (!isOpen) return null

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-foreground/50 z-50 transition-opacity" onClick={onClose} aria-hidden="true" />

      {/* Drawer */}
      <div className="fixed top-0 right-0 h-full w-full max-w-md bg-card z-50 shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-2xl font-bold text-card-foreground">Carrito ({totalItems})</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-muted rounded-md transition-colors"
            aria-label="Cerrar carrito"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto p-4">
          {step === 1 && (items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="64"
                height="64"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                className="text-muted-foreground mb-4"
              >
                <circle cx="9" cy="21" r="1" />
                <circle cx="20" cy="21" r="1" />
                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
              </svg>
              <p className="text-muted-foreground text-lg">Tu carrito está vacío</p>
            </div>
          ) : (
            <div className="space-y-2">
              {items.map((item) => (
                <CartItemComponent key={item.id} item={item} />
              ))}
            </div>
          ))}

          {step === 2 && (
            <form onSubmit={handleSendOrder} className="space-y-4">
              <h3 className="text-xl font-bold text-card-foreground mb-4">Información del pedido</h3>

              <div className="space-y-4">
                {/* Nombre */}
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-card-foreground mb-1">
                    Nombre completo *
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
                    placeholder="Tu nombre"
                  />
                </div>

                {/* Método de pago */}
                <div>
                  <p className="block text-sm font-medium text-card-foreground mb-2">Método de pago *</p>
                  <div className="space-y-2">
                    <label className="flex items-center space-x-2">
                      <input
                        type="radio"
                        name="paymentMethod"
                        value="efectivo"
                        checked={formData.paymentMethod === 'efectivo'}
                        onChange={handleInputChange}
                        className="text-primary focus:ring-primary"
                      />
                      <span>Efectivo</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input
                        type="radio"
                        name="paymentMethod"
                        value="transferencia"
                        checked={formData.paymentMethod === 'transferencia'}
                        onChange={handleInputChange}
                        className="text-primary focus:ring-primary"
                      />
                      <span>Transferencia</span>
                    </label>
                  </div>
                </div>

                {/* Hora de entrega */}
                <div>
                  <label htmlFor="deliveryTime" className="block text-sm font-medium text-card-foreground mb-1">
                    Hora de entrega *
                  </label>
                  <select
                    id="deliveryTime"
                    name="deliveryTime"
                    value={formData.deliveryTime}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
                  >
                    <option value="">Selecciona una hora</option>
                    <option value="12:00">12:00 PM</option>
                    <option value="12:30">12:30 PM</option>
                    <option value="13:00">01:00 PM</option>
                    <option value="13:30">01:30 PM</option>
                    <option value="14:00">02:00 PM</option>
                    <option value="14:30">02:30 PM</option>
                    <option value="15:00">03:00 PM</option>
                    <option value="19:00">07:00 PM</option>
                    <option value="19:30">07:30 PM</option>
                    <option value="20:00">08:00 PM</option>
                    <option value="20:30">08:30 PM</option>
                    <option value="21:00">09:00 PM</option>
                    <option value="21:30">09:30 PM</option>
                  </select>
                </div>

                {/* Tipo de envío */}
                <div>
                  <p className="block text-sm font-medium text-card-foreground mb-2">Tipo de envío *</p>
                  <div className="space-y-2">
                    <label className="flex items-center space-x-2">
                      <input
                        type="radio"
                        name="deliveryType"
                        value="retiro"
                        checked={formData.deliveryType === 'retiro'}
                        onChange={handleInputChange}
                        className="text-primary focus:ring-primary"
                      />
                      <span>Retiro en local</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input
                        type="radio"
                        name="deliveryType"
                        value="delivery"
                        checked={formData.deliveryType === 'delivery'}
                        onChange={handleInputChange}
                        className="text-primary focus:ring-primary"
                      />
                      <span>Envío a domicilio</span>
                    </label>
                  </div>
                </div>
              </div>
           
            </form>
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="border-t border-border p-4 space-y-4">
            <div className="flex justify-between items-center text-lg">
              <span className="font-semibold text-card-foreground">Total:</span>
              <span className="font-bold text-2xl text-primary">${totalPrice.toFixed(2)}</span>
            </div>

            {step === 1 && (
              <>
                <button
                  onClick={() => setStep(2)}
                  className="w-full bg-primary hover:bg-primary/90 text-white font-bold py-3 px-4 rounded-md transition-colors"
                >
                  Continuar
                </button>

                <button
                  onClick={clearCart}
                  className="w-full bg-muted hover:bg-muted-foreground/20 text-card-foreground font-semibold py-2 px-4 rounded-md transition-colors"
                >
                  Vaciar carrito
                </button>
              </>
            )}

            {step === 2 && (
              <>
                <button
                  onClick={handleSendOrder}
                  className="w-full bg-primary hover:bg-primary/90 text-white font-bold py-3 px-4 rounded-md transition-colors"
                >
                  Finalizar pedido
                </button>

                <button
                  onClick={() => setStep(1)}
                  className="w-full mt-2 bg-muted hover:bg-muted-foreground/20 text-card-foreground font-semibold py-2 px-4 rounded-md transition-colors"
                >
                  Volver al carrito
                </button>
              </>
            )}

          </div>
        )}
      </div>
    </>
  )
}
