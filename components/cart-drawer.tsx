"use client"

import { useCart } from "@/context/cart-context"
import { CartItemComponent } from "./cart-item"
import { useEffect, useState } from "react"
import { createOrder } from "@/lib/orders-service"
import { Order } from "@/types/order"
import { getTodayDateString } from "@/utils"
import { getAvailableTimeSlotsForOrder, AvailableTimeSlot, bookSlots } from "@/lib/schedule-service"

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
    deliveryType: 'retiro',
    selectedDate: getTodayDateString()
  })

  // Estados para horarios disponibles
  const [availableSlots, setAvailableSlots] = useState<AvailableTimeSlot[]>([])
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [selectedSlot, setSelectedSlot] = useState<AvailableTimeSlot | null>(null)

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  // Cargar horarios disponibles cuando cambia la fecha o los items del carrito
  useEffect(() => {
    async function loadAvailableSlots() {
      if (items.length === 0 || step !== 2) return

      setLoadingSlots(true)
      try {
        const totalPizzas = items.reduce((sum, item) => sum + item.quantity, 0)
        const slots = await getAvailableTimeSlotsForOrder(
          formData.selectedDate,
          totalPizzas,
          5 // 5 minutos por pizza
        )
        setAvailableSlots(slots)

        // Si no hay slots disponibles, limpiar selección
        if (slots.length === 0) {
          setSelectedSlot(null)
          setFormData(prev => ({ ...prev, deliveryTime: '' }))
        }
      } catch (error) {
        console.error("Error cargando horarios:", error)
        setAvailableSlots([])
      } finally {
        setLoadingSlots(false)
      }
    }

    loadAvailableSlots()
  }, [items, formData.selectedDate, step])

  // Manejar selección de slot
  const handleSlotSelection = (slot: AvailableTimeSlot) => {
    setSelectedSlot(slot)
    setFormData(prev => ({
      ...prev,
      deliveryTime: slot.deliveryTime
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

    if (!formData.name || !formData.deliveryTime || !selectedSlot) {
      alert('Por favor completa todos los campos obligatorios')
      return
    }

    try {
      // 1) Calcular cantidad de pizzas del pedido
      const totalPizzas = items.reduce((acc, item) => acc + item.quantity, 0)

      // 2) Reservar slots ANTES de crear la orden
      console.log('Reservando slots:', selectedSlot.slotIds)
      await bookSlots(selectedSlot.slotIds)

      // 3) Construir objeto order SIN id todavía (id lo genera Firestore)
      const order: Omit<Order, "id"> = {
        order: items.map(item => `${item.quantity}x ${item.name}`).join(', '),
        hour: formData.deliveryTime,
        clientName: formData.name,
        paymentMethod: formData.paymentMethod,
        shippingType: formData.deliveryType,
        total: totalPrice,
        sent: false,
        pizzas: totalPizzas,
        date: formData.selectedDate,
      }

      // 4) Si la reserva funciona, crear la orden
      const orderId = await createOrder(order)

      // 5) Reset de estados
      clearCart()
      setFormData({
        name: '',
        paymentMethod: 'efectivo',
        deliveryTime: '',
        deliveryType: 'retiro',
        selectedDate: getTodayDateString()
      })
      setSelectedSlot(null)
      setAvailableSlots([])
      setStep(1)
      onClose()

      alert('¡Pedido realizado con éxito!')

    } catch (error: any) {
      console.error('Error al crear el pedido:', error)

      // Mensajes de error específicos
      if (error.message?.includes('no tiene capacidad suficiente')) {
        alert('El horario seleccionado ya no está disponible. Por favor selecciona otro horario.')
        // Recargar slots disponibles
        const totalPizzas = items.reduce((sum, item) => sum + item.quantity, 0)
        const slots = await getAvailableTimeSlotsForOrder(
          formData.selectedDate,
          totalPizzas,
          5
        )
        setAvailableSlots(slots)
        setSelectedSlot(null)
        setFormData(prev => ({ ...prev, deliveryTime: '' }))
      } else if (error.message?.includes('no existe')) {
        alert('Error: Los horarios han cambiado. Por favor selecciona nuevamente.')
        setSelectedSlot(null)
        setFormData(prev => ({ ...prev, deliveryTime: '' }))
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

                {/* Fecha de entrega */}
                <div>
                  <label htmlFor="selectedDate" className="block text-sm font-medium text-card-foreground mb-1">
                    Fecha de entrega *
                  </label>
                  <input
                    type="date"
                    id="selectedDate"
                    name="selectedDate"
                    value={formData.selectedDate}
                    onChange={handleInputChange}
                    min={getTodayDateString()}
                    required
                    className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>

                {/* Horarios disponibles */}
                <div>
                  <label className="block text-sm font-medium text-card-foreground mb-2">
                    Hora de entrega *
                  </label>

                  {loadingSlots ? (
                    <div className="text-center py-4 text-muted-foreground">
                      Cargando horarios disponibles...
                    </div>
                  ) : availableSlots.length === 0 ? (
                    <div className="text-center py-4 px-3 bg-muted rounded-md">
                      <p className="text-sm text-muted-foreground">
                        No hay horarios disponibles para esta fecha.
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Intenta seleccionar otra fecha.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {availableSlots.map((slot, index) => (
                        <button
                          key={index}
                          type="button"
                          onClick={() => handleSlotSelection(slot)}
                          className={`w-full p-3 border rounded-md text-left transition-all ${selectedSlot?.deliveryTime === slot.deliveryTime
                            ? 'border-primary bg-primary/10 ring-2 ring-primary/50'
                            : 'border-border hover:border-primary/50 hover:bg-muted'
                            }`}
                        >
                          <div className="flex justify-between items-center">
                            <div>
                              <p className="font-semibold text-card-foreground">
                                Entrega: {slot.deliveryTime}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Preparación inicia: {slot.startTime}
                              </p>
                            </div>
                            {selectedSlot?.deliveryTime === slot.deliveryTime && (
                              <svg
                                className="w-5 h-5 text-primary"
                                fill="currentColor"
                                viewBox="0 0 20 20"
                              >
                                <path
                                  fillRule="evenodd"
                                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                                  clipRule="evenodd"
                                />
                              </svg>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Info de pizzas */}
                  <p className="text-xs text-muted-foreground mt-2">
                    {items.reduce((sum, item) => sum + item.quantity, 0)} pizza(s) -
                    Tiempo estimado: {items.reduce((sum, item) => sum + item.quantity, 0) * 5} minutos
                  </p>
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
