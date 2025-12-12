"use client"

import { useCart } from "@/context/cart-context"
import { CartItemComponent } from "./cart-item"
import { useEffect, useState } from "react"
import { createOrder } from "@/lib/orders-service"
import { Order } from "@/types/order"
import { getTodayDateString } from "@/utils"
import { getAvailableTimeSlotsForOrder, AvailableTimeSlot, bookSlots } from "@/lib/schedule-service"
import { verifyAndDecrementStock } from "@/lib/products-service"

interface CartDrawerProps {
  isOpen: boolean
  onClose: () => void
}

export function CartDrawer({ isOpen, onClose }: CartDrawerProps) {
  const { items, totalItems, totalPrice, clearCart } = useCart()
  const [step, setStep] = useState(1)
  const [formData, setFormData] = useState({
    name: '',
    paymentMethod: '',
    deliveryTime: '',
    deliveryType: '',
    selectedDate: getTodayDateString()
  })

  // Estados para horarios disponibles
  const [availableSlots, setAvailableSlots] = useState<AvailableTimeSlot[]>([])
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [selectedSlot, setSelectedSlot] = useState<AvailableTimeSlot | null>(null)

  const SHIPPING_COST = 2500
  const shippingCost = formData.deliveryType === 'delivery' ? SHIPPING_COST : 0
  const finalTotal = totalPrice + shippingCost

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
      // 0) Verificar y descontar stock
      await verifyAndDecrementStock(items.map(item => ({ id: item.id, quantity: item.quantity })))

      // 1) Calcular cantidad de pizzas del pedido
      const totalPizzas = items.reduce((acc, item) => acc + item.quantity, 0)

      // 2) Reservar slots ANTES de crear la orden
      console.log('Reservando slots:', selectedSlot.slotIds)
      try {
        await bookSlots(selectedSlot.slotIds)
      } catch (error) {
        // Si falla la reserva de slots, deberíamos devolver el stock (TODO: Implementar rollback real)
        throw error
      }

      // 3) Construir objeto order SIN id todavía (id lo genera Firestore)
      const order: Omit<Order, "id"> = {
        order: items.map(item => `${item.quantity}x ${item.name}`).join(', '),
        hour: formData.deliveryTime,
        clientName: formData.name,
        paymentMethod: formData.paymentMethod,
        shippingType: formData.deliveryType,
        total: finalTotal,
        sent: false,
        pizzas: totalPizzas,
        date: formData.selectedDate,
      }

      // 4) Si la reserva funciona, crear la orden
      // 4) Si la reserva funciona, crear la orden
      const orderId = await createOrder(order)

      // 5) Enviar mensaje por WhatsApp
      const phoneNumber = "2983388452" // Reemplazar con el número del negocio
      const message = `*Nuevo Pedido!* 🍕

      *Nombre:* ${formData.name}
      *Pedido:*
      ${items.map(item => `- ${item.quantity}x ${item.name}`).join('\n')}

      *Total:* $${finalTotal.toFixed(2)}
      *Pago:* ${formData.paymentMethod}
      *Entrega:* ${formData.deliveryType}
      *Hora:* ${formData.deliveryTime}
      *Fecha:* ${formData.selectedDate}`

      const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`
      window.open(whatsappUrl, '_blank')

      // 5) Reset de estados
      clearCart()
      setFormData({
        name: '',
        paymentMethod: '',
        deliveryTime: '',
        deliveryType: '',
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
        try {
          const slots = await getAvailableTimeSlotsForOrder(
            formData.selectedDate,
            totalPizzas,
            5
          )
          setAvailableSlots(slots)
        } catch (e) { console.error(e) }
        setSelectedSlot(null)
        setFormData(prev => ({ ...prev, deliveryTime: '' }))
      } else if (error.message?.includes('no existe')) {
        alert('Error: Los horarios han cambiado. Por favor selecciona nuevamente.')
        setSelectedSlot(null)
        setFormData(prev => ({ ...prev, deliveryTime: '' }))
      } else if (error.toString().includes('No hay suficiente stock')) {
        alert(error.message || "No hay suficiente stock para uno de los productos.")
      } else {
        alert('Hubo un error al procesar tu pedido. Inténtalo nuevamente: ' + (error.message || error))
      }
    }
  }


  return (
    <>
      {/* Overlay */}
      <div
        className={`fixed inset-0 bg-foreground/50 z-50 transition-opacity duration-300 ${isOpen ? "opacity-100" : "opacity-0 pointer-events-none"}`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div
        className={`fixed bottom-0 left-0 w-full bg-background z-50 shadow-2xl flex flex-col transition-[height] duration-300 ease-in-out overflow-hidden rounded-t-[20px] ${isOpen ? "h-[90vh]" : "h-0"}`}
      >
        <div onClick={onClose}>

          {/* Handle / Arrow */}
          <div
            className="w-full flex justify-center pt-3 pb-1 cursor-pointer hover:bg-foreground/5 transition-colors"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-foreground/50"
            >
              <path d="m6 9 6 6 6-6" />
            </svg>
          </div>

          {/* Header */}
          <div className="flex items-center justify-between px-4 pb-4 border-b border-foreground/20" onClick={onClose}>
            <h2 className="text-2xl font-bold text-foreground">Carrito ({totalItems})</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-foreground/10 rounded-md transition-colors"
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
                className="text-foreground/60 mb-4"
              >
                <circle cx="9" cy="21" r="1" />
                <circle cx="20" cy="21" r="1" />
                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
              </svg>
              <p className="text-foreground/60 text-lg">Tu carrito está vacío</p>
            </div>
          ) : (
            <div className="space-y-2">
              {items.map((item) => (
                <CartItemComponent key={item.id} item={item} />
              ))}
            </div>
          ))}

          {step === 2 && (
            <form onSubmit={handleSendOrder} className="space-y-6">
              <h3 className="text-xl font-bold text-foreground mb-4">Información del pedido</h3>

              <div className="flex flex-col gap-8">
                {/* Nombre */}
                <div>
                  <label htmlFor="name" className="block text-md font-medium text-foreground mb-1">
                    Nombre completo *
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-foreground/20 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-medium/50"
                    placeholder="Tu nombre"
                  />
                </div>

                {/* Método de pago */}
                <div>
                  <p className="block text-md font-medium text-foreground mb-2">Método de pago *</p>
                  <div className="flex gap-6 gap-x-3 gap-y-1 justify-around">
                    <label className={`flex items-center gap-2 px-4 py-2 ${formData.paymentMethod === 'efectivo' ? 'border-2 text-background bg-success rounded-sm' : ''}`}>
                      <input
                        type="radio"
                        name="paymentMethod"
                        value="efectivo"
                        checked={formData.paymentMethod === 'efectivo'}
                        onChange={handleInputChange}
                        className="text-primary-medium focus:ring-primary-medium"
                      />
                      <span>Efectivo</span>
                    </label>
                    <label className={`flex items-center gap-2 px-4 py-2 ${formData.paymentMethod === 'transferencia' ? 'border-2 text-background bg-success rounded-sm' : ''}`}>
                      <input
                        type="radio"
                        name="paymentMethod"
                        value="transferencia"
                        checked={formData.paymentMethod === 'transferencia'}
                        onChange={handleInputChange}
                        className="text-primary-medium focus:ring-primary-medium"
                      />
                      <span>Transferencia</span>
                    </label>
                  </div>
                </div>

                {/* Fecha de entrega */}
                <div>
                  <label htmlFor="selectedDate" className="block text-md font-medium text-foreground mb-1">
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
                    className="w-full px-3 py-2 border border-foreground/20 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-medium/50"
                  />
                </div>

                {/* Horarios disponibles */}
                <div>
                  <label className="block text-md font-medium text-foreground mb-2">
                    Hora de entrega *
                  </label>

                  {loadingSlots ? (
                    <div className="text-center py-4 text-foreground/60">
                      Cargando horarios disponibles...
                    </div>
                  ) : availableSlots.length === 0 ? (
                    <div className="text-center py-4 px-3 bg-foreground/5 rounded-md">
                      <p className="text-sm text-foreground/60">
                        No hay horarios disponibles para esta fecha.
                      </p>
                      <p className="text-xs text-foreground/60 mt-1">
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
                            ? 'border-primary-medium bg-primary-medium/10 ring-2 ring-primary-medium/50'
                            : 'border-foreground/20 hover:border-primary-medium/50 hover:bg-foreground/5'
                            }`}
                        >
                          <div className="flex justify-between items-center">
                            <div>
                              <p className="font-semibold text-foreground">
                                Entrega: {slot.deliveryTime}
                              </p>
                              <p className="text-xs text-foreground/60">
                                Preparación inicia: {slot.startTime}
                              </p>
                            </div>
                            {selectedSlot?.deliveryTime === slot.deliveryTime && (
                              <svg
                                className="w-5 h-5 text-primary-medium"
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
                  <p className="text-xs text-foreground/60 mt-2">
                    {items.reduce((sum, item) => sum + item.quantity, 0)} pizza(s) -
                    Tiempo estimado: {items.reduce((sum, item) => sum + item.quantity, 0) * 5} minutos
                  </p>
                </div>



                {/* Tipo de envío */}
                <div>
                  <p className="block text-md font-medium text-foreground mb-2">Tipo de envío *</p>
                  <div className="flex gap-6 gap-x-3 gap-y-1 justify-around">
                    <label className={`flex items-center gap-2 px-4 py-2 cursor-pointer ${formData.deliveryType === 'retiro' ? 'border-2 text-background bg-success rounded-sm' : ''}`}>
                      <input
                        type="radio"
                        name="deliveryType"
                        value="retiro"
                        checked={formData.deliveryType === 'retiro'}
                        onChange={handleInputChange}
                        className="text-primary-medium focus:ring-primary-medium"
                      />
                      <span>Retiro en local</span>
                    </label>
                    <label className={`flex items-center gap-2 px-4 py-2 cursor-pointer ${formData.deliveryType === 'delivery' ? 'border-2 text-background bg-success rounded-sm' : ''}`}>
                      <input
                        type="radio"
                        name="deliveryType"
                        value="delivery"
                        checked={formData.deliveryType === 'delivery'}
                        onChange={handleInputChange}
                        className="text-primary-medium focus:ring-primary-medium"
                      />
                      <div className="flex flex-col items-center">
                        <span>Envío a domicilio</span>
                        {formData.deliveryType === 'delivery' && (
                          <span className="text-[10px] font-medium opacity-90">(2500 envio)</span>
                        )}
                      </div>
                    </label>
                  </div>
                </div>
              </div>

            </form>
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="border-t border-foreground/20 p-4 space-y-4">
            <div className="flex justify-between items-center text-lg">
              <span className="font-semibold text-foreground">Total:</span>
              <span className="font-bold text-2xl text-primary-medium">${finalTotal.toFixed(2)}</span>
            </div>

            {step === 1 && (
              <>
                <button
                  onClick={() => setStep(2)}
                  className="w-full bg-primary-medium hover:bg-primary-medium/90 text-white font-bold py-3 px-4 rounded-md transition-colors"
                >
                  Continuar
                </button>

                <button
                  onClick={() => { clearCart(); onClose() }}
                  className="w-full bg-foreground/5 hover:bg-foreground/10 text-foreground font-semibold py-2 px-4 rounded-md transition-colors"
                >
                  Vaciar carrito
                </button>
              </>
            )}

            {step === 2 && (
              <>
                <button
                  onClick={handleSendOrder}
                  className="w-full bg-primary-medium hover:bg-primary-medium/90 text-white font-bold py-3 px-4 rounded-md transition-colors"
                >
                  Finalizar pedido
                </button>

                <button
                  onClick={() => setStep(1)}
                  className="w-full mt-2 bg-foreground/5 hover:bg-foreground/10 text-foreground font-semibold py-2 px-4 rounded-md transition-colors"
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
