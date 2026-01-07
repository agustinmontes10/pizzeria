"use client"

import { useCart } from "@/context/cart-context"
import { CartItemComponent } from "./cart-item"
import { useEffect, useState } from "react"
import { createOrder } from "@/lib/orders-service"
import { Order } from "@/types/order"
import { getTodayDateString } from "@/utils"
import { getAvailableTimeSlotsForOrder, AvailableTimeSlot, bookSlots } from "@/lib/schedule-service"
import { verifyAndDecrementStock } from "@/lib/products-service"
import { verifyAndReserveDailyStock, releaseDailyStock } from "@/lib/daily-stock-service"
import { toast } from "sonner"

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
    address: '',
    selectedDate: getTodayDateString()
  })

  // Estados para horarios disponibles
  const [availableSlots, setAvailableSlots] = useState<AvailableTimeSlot[]>([])
  const [loadingSlots, setLoadingSlots] = useState(false)

  const [selectedSlot, setSelectedSlot] = useState<AvailableTimeSlot | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [whatsappUrl, setWhatsappUrl] = useState<string | null>(null)

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
        let slots = await getAvailableTimeSlotsForOrder(
          formData.selectedDate,
          totalPizzas,
          5 // 5 minutos por pizza
        )

        // Filtrar horarios ya pasados si es el día actual
        if (formData.selectedDate === getTodayDateString()) {
          const now = new Date()
          const currentTotalMinutes = now.getHours() * 60 + now.getMinutes()

          slots = slots.filter(slot => {
            const [h, m] = slot.deliveryTime.split(':').map(Number)
            return (h * 60 + m) > currentTotalMinutes
          })
        }

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

    if (!formData.name || !formData.deliveryTime || !selectedSlot || !formData.paymentMethod || !formData.deliveryType) {
      toast.error('Por favor completa todos los campos obligatorios')
      return
    }

    if (formData.deliveryType === 'delivery' && !formData.address) {
      toast.error('Por favor ingresa tu dirección de envío')
      return
    }

    // Show loading toast
    const loadingToastId = toast.loading('Realizando pedido...')
    setIsSubmitting(true)

    try {
      // 1) Calcular cantidad de pizzas del pedido
      const totalPizzas = items.reduce((acc, item) => acc + item.quantity, 0)

      // 2) Verificar y reservar STOCK DIARIO (primero, para asegurar cupo global)
      await verifyAndReserveDailyStock(formData.selectedDate, totalPizzas)

      try {
        // 3) Verificar y descontar STOCK DE PRODUCTOS (ingredientes)
        await verifyAndDecrementStock(items.map(item => ({ id: item.id, quantity: item.quantity })))

        // 4) Reservar slots
        console.log('Reservando slots:', selectedSlot.slotIds)
        try {
          await bookSlots(selectedSlot.slotIds)
        } catch (slotError) {
          throw slotError
        }

        // 5) Construir objeto order
        const order: Omit<Order, "id"> = {
          order: items.map(item => `${item.quantity}x ${item.name}`).join(', '),
          hour: formData.deliveryTime,
          clientName: formData.name,
          paymentMethod: formData.paymentMethod === 'transferencia' ? 'Transferencia - alias: napospizza' : formData.paymentMethod,
          shippingType: formData.deliveryType === 'delivery' ? `Envío - ${formData.address}` : 'Retiro - Juan Elicagaray 880',
          total: finalTotal,
          sent: false,
          pizzas: totalPizzas,
          date: formData.selectedDate,
        }

        const orderId = await createOrder(order)

        // 6) Construir URL de WhatsApp y guardar en estado
        const phoneNumber = "2983388452"
        const message = `*Nuevo Pedido!* 🍕

        *Nombre:* ${formData.name}
        *Pedido:*
        ${items.map(item => `- ${item.quantity}x ${item.name}`).join('\n')}

        *Total:* $${finalTotal.toFixed(2)}
        *Pago:* ${formData.paymentMethod === 'transferencia' ? 'Transferencia - napospizza' : formData.paymentMethod}
        *Entrega:* ${formData.deliveryType === 'delivery' ? `Envío - ${formData.address}` : 'Retiro - Juan Elicagaray 880'}
        *Hora:* ${formData.deliveryTime}
        *Fecha:* ${formData.selectedDate}`

        const url = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`
        setWhatsappUrl(url)

        // Intentar abrir WhatsApp inmediatamente (funcionará en Desktop/Android, fallará silenciosamente en iOS)
        window.open(url, '_blank')

        // 7) Limpiar carrito y mostrar pantalla de éxito (fallback para iOS)
        clearCart()
        setStep(3)
        // No cerramos el drawer, dejamos que el usuario lo cierre o envíe el mensaje manualmente

        toast.dismiss(loadingToastId)
        toast.success('¡Pedido realizado con éxito!')
        setIsSubmitting(false)

      } catch (innerError: any) {
        // Si falla algo DESPUÉS de reservar el stock diario (ej: stock de ingredientes o slots),
        // debemos liberar el stock diario reservado.
        console.error("Error en proceso interno, liberando stock diario:", innerError)
        await releaseDailyStock(formData.selectedDate, totalPizzas)
        throw innerError // Re-lanzar para que el catch exterior lo maneje
      }

    } catch (error: any) {
      console.error('Error al crear el pedido:', error)
      toast.dismiss(loadingToastId) // Dismiss loading toast

      // Mensajes de error específicos
      if (error.message?.includes('capacidad suficiente') || error.message?.includes('disponibles para este día')) {
        toast.error(error.message)
      } else if (error.message?.includes('no existe')) {
        toast.error('Error: Los horarios han cambiado. Por favor selecciona nuevamente.')
        setSelectedSlot(null)
        setFormData(prev => ({ ...prev, deliveryTime: '' }))
      } else if (error.toString().includes('No hay suficiente stock')) {
        toast.error(error.message || "No hay suficiente stock para uno de los productos.")
      } else {
        toast.error('Hubo un error al procesar tu pedido. Inténtalo nuevamente: ' + (error.message || error))
      }
      setIsSubmitting(false)
    }
  }


  const handleClose = () => {
    setStep(1)
    setFormData({
      name: '',
      paymentMethod: '',
      deliveryTime: '',
      deliveryType: '',
      address: '',
      selectedDate: getTodayDateString()
    })
    setSelectedSlot(null)
    setAvailableSlots([])
    setIsSubmitting(false)
    setWhatsappUrl(null)
    onClose()
  }

  return (
    <>
      {/* Overlay */}
      <div
        className={`fixed inset-0 bg-foreground/50 z-50 transition-opacity duration-300 ${isOpen ? "opacity-100" : "opacity-0 pointer-events-none"}`}
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div
        className={`fixed bottom-0 left-0 w-full bg-background z-50 shadow-2xl flex flex-col transition-[height] duration-300 ease-in-out overflow-hidden rounded-t-[20px] ${isOpen ? "h-[90vh]" : "h-0"}`}
      >
        <div onClick={handleClose}>

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
          <div className="flex items-center justify-between px-4 pb-4 border-b border-foreground/20" onClick={handleClose}>
            <h2 className="text-2xl font-bold text-foreground">
              {step === 3 ? 'Pedido Exitoso' : `Carrito (${totalItems})`}
            </h2>
            <button
              onClick={handleClose}
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
                  {formData.paymentMethod === 'transferencia' && (
                    <div className="mt-3 p-3 bg-secondary/10 rounded-md text-center">
                      <p className="text-sm text-foreground/80">
                        Alias: <span className="font-semibold select-all">napospizza</span>
                      </p>
                    </div>
                  )}
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

                  {formData.deliveryType === 'retiro' && (
                    <div className="mt-3 p-3 bg-secondary/10 rounded-md text-center">
                      <p className="text-sm text-foreground/80">
                        Retira por: <span className="font-semibold">Juan Elicagaray 880</span>
                      </p>
                    </div>
                  )}

                  {formData.deliveryType === 'delivery' && (
                    <div className="mt-4">
                      <label htmlFor="address" className="block text-md font-medium text-foreground mb-1">
                        Dirección de envío *
                      </label>
                      <input
                        type="text"
                        id="address"
                        name="address"
                        value={formData.address}
                        onChange={handleInputChange}
                        required
                        className="w-full px-3 py-2 border border-foreground/20 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-medium/50"
                        placeholder="Calle y número"
                      />
                    </div>
                  )}
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
                    <>
                      <div className="space-y-2 max-h-100 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-foreground/20 scrollbar-track-transparent">
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
                      {availableSlots.length > 3 && (
                        <p className="text-center text-md text-foreground font-semibold mt-5 animate-pulse">
                          Desliza para ver más horarios ↓
                        </p>
                      )}
                    </>
                  )}

                  {/* Info de pizzas */}
                  <p className="text-xs text-foreground/60 mt-2">
                    {items.reduce((sum, item) => sum + item.quantity, 0)} pizza(s) -
                    Tiempo estimado: {items.reduce((sum, item) => sum + item.quantity, 0) * 5} minutos
                  </p>
                </div>

              </div>

            </form>
          )}

          {step === 3 && (
            <div className="flex flex-col items-center justify-center h-full space-y-6 text-center animate-in fade-in slide-in-from-bottom-5 duration-500">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="40"
                  height="40"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-green-600"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>

              <h3 className="text-2xl font-bold text-foreground">¡Tu pedido está listo!</h3>

              <div className="space-y-2 max-w-xs mx-auto text-foreground/80">
                <p className="text-md">Tu orden ha sido registrada correctamente.</p>
                <p className="text-md">Si no se abrió WhatsApp automáticamente, haz clic en el botón de abajo para enviar los detalles.</p>
              </div>

              {whatsappUrl && (
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full max-w-xs bg-[#25D366] hover:bg-[#128C7E] text-white font-bold py-4 px-6 rounded-lg transition-all transform hover:scale-105 shadow-lg flex items-center justify-center gap-2"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    className="w-6 h-6"
                  >
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.008-.57-.008-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                  </svg>
                  Enviar a WhatsApp
                </a>
              )}

              <button
                onClick={handleClose}
                className="text-foreground/60 hover:text-foreground font-medium text-sm mt-4 underline decoration-dotted underline-offset-4"
              >
                Cerrar y volver al inicio
              </button>
            </div>
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
                  onClick={() => { clearCart(); handleClose() }}
                  className="w-full bg-foreground/5 hover:bg-foreground/10 text-foreground font-semibold py-2 px-4 rounded-md transition-colors"
                >
                  Vaciar carrito y Cerrar
                </button>
              </>
            )}

            {step === 2 && (
              <>
                <button
                  onClick={handleSendOrder}
                  disabled={isSubmitting}
                  className={`w-full bg-primary-medium hover:bg-primary-medium/90 text-white font-bold py-3 px-4 rounded-md transition-colors ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {isSubmitting ? 'Procesando...' : 'Finalizar pedido'}
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
