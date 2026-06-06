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
import { getNextMatch } from "@/lib/matches-service"
import { createBet } from "@/lib/bets-service"
import { Match } from "@/types/match"

interface CartDrawerProps {
  isOpen: boolean
  onClose: () => void
}

// Steps: 1=cart, 2=form, 3=bet, 4=success
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

  const [availableSlots, setAvailableSlots] = useState<AvailableTimeSlot[]>([])
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [selectedSlot, setSelectedSlot] = useState<AvailableTimeSlot | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [whatsappUrl, setWhatsappUrl] = useState<string | null>(null)

  // Bet state
  const [nextMatch, setNextMatch] = useState<Match | null>(null)
  const [loadingMatch, setLoadingMatch] = useState(false)
  const [betType, setBetType] = useState<1 | 2 | null>(null)
  const [predictedHomeScore, setPredictedHomeScore] = useState<string>("")
  const [predictedAwayScore, setPredictedAwayScore] = useState<string>("")
  const [predictedPlayerScores, setPredictedPlayerScores] = useState<boolean | undefined>(undefined)
  const [betSaved, setBetSaved] = useState(false)

  const SHIPPING_COST = 2500
  const shippingCost = formData.deliveryType === 'delivery' ? SHIPPING_COST : 0
  const finalTotal = totalPrice + shippingCost

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  useEffect(() => {
    async function loadAvailableSlots() {
      if (items.length === 0 || step !== 2) return
      setLoadingSlots(true)
      try {
        const totalPizzas = items.reduce((sum, item) => sum + item.quantity, 0)
        let slots = await getAvailableTimeSlotsForOrder(formData.selectedDate, totalPizzas, 5)

        if (formData.selectedDate === getTodayDateString()) {
          const now = new Date()
          const currentTotalMinutes = now.getHours() * 60 + now.getMinutes()
          slots = slots.filter(slot => {
            const [h, m] = slot.deliveryTime.split(':').map(Number)
            return (h * 60 + m) > currentTotalMinutes
          })
        }

        setAvailableSlots(slots)
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

  // Load next match when entering bet step
  useEffect(() => {
    if (step !== 3) return
    setLoadingMatch(true)
    getNextMatch()
      .then(match => {
        setNextMatch(match)
        // Si el partido no tiene jugador configurado y el usuario tenía tipo 2 seleccionado, resetear
        if (!match?.betPlayer && betType === 2) setBetType(null)
      })
      .catch(err => console.error("Error cargando partido:", err))
      .finally(() => setLoadingMatch(false))
  }, [step])

  const handleSlotSelection = (slot: AvailableTimeSlot) => {
    setSelectedSlot(slot)
    setFormData(prev => ({ ...prev, deliveryTime: slot.deliveryTime }))
  }

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = "unset"
    }
    return () => { document.body.style.overflow = "unset" }
  }, [isOpen])

  // Validate form fields and move to bet step
  function handleContinueToBet() {
    if (!formData.name || !formData.deliveryTime || !selectedSlot || !formData.paymentMethod || !formData.deliveryType) {
      toast.error('Por favor completa todos los campos obligatorios')
      return
    }
    if (formData.deliveryType === 'delivery' && !formData.address) {
      toast.error('Por favor ingresa tu dirección de envío')
      return
    }
    setStep(3)
  }

  // Create order + optional bet, then show success
  async function handleFinalizeOrder() {
    // Validate bet prediction if a bet type was selected
    if (betType === 1 && nextMatch) {
      if (predictedHomeScore === "" || predictedAwayScore === "") {
        toast.error('Por favor ingresá el resultado que predecís')
        return
      }
    }
    if (betType === 2 && nextMatch && predictedPlayerScores === undefined) {
      toast.error(`Por favor elegí si ${nextMatch.betPlayer} anota o no`)
      return
    }

    const loadingToastId = toast.loading('Realizando pedido...')
    setIsSubmitting(true)

    try {
      const totalPizzas = items.reduce((acc, item) => acc + item.quantity, 0)

      await verifyAndReserveDailyStock(formData.selectedDate, totalPizzas)

      try {
        await verifyAndDecrementStock(items.map(item => ({ id: item.id, quantity: item.quantity })))

        try {
          await bookSlots(selectedSlot!.slotIds)
        } catch (slotError) {
          throw slotError
        }

        const order: Omit<Order, "id"> = {
          order: items.map(item => `${item.quantity}x ${item.name}`).join(', '),
          hour: formData.deliveryTime,
          clientName: formData.name,
          paymentMethod: formData.paymentMethod === 'transferencia' ? 'Transferencia - alias: napospizzas' : formData.paymentMethod,
          shippingType: formData.deliveryType === 'delivery' ? `Envío - ${formData.address}` : 'Retiro - Juan Elicagaray 880',
          total: finalTotal,
          sent: false,
          pizzas: totalPizzas,
          date: formData.selectedDate,
        }

        const orderId = await createOrder(order)

        // Save bet if one was chosen — re-validar que el partido no haya arrancado
        if (betType !== null && nextMatch) {
          const matchStillValid = await getNextMatch()
          if (!matchStillValid || matchStillValid.id !== nextMatch.id) {
            // El partido ya arrancó mientras el usuario completaba el formulario
            toast.error(`⚽ El partido ${nextMatch.homeTeam} vs ${nextMatch.awayTeam} ya arrancó. Tu apuesta no fue registrada.`, { duration: 6000 })
            setBetSaved(false)
          } else {
            await createBet({
              orderId,
              clientName: formData.name,
              matchId: nextMatch.id,
              homeTeam: nextMatch.homeTeam,
              awayTeam: nextMatch.awayTeam,
              matchDate: nextMatch.matchDate,
              betType,
              ...(betType === 1 && {
                predictedHomeScore: Number(predictedHomeScore),
                predictedAwayScore: Number(predictedAwayScore),
              }),
              ...(betType === 2 && {
                predictedPlayerScores,
                betPlayerName: nextMatch.betPlayer,
                betPlayerDiscount: nextMatch.betPlayerDiscount ?? 30,
              }),
              createdAt: new Date().toISOString(),
              orderTotal: finalTotal,
            })
            setBetSaved(true)
          }
        }

        const betLine = betSaved && betType === 1 && nextMatch
          ? `\n*Apuesta:* Resultado exacto ${nextMatch.homeTeam} ${predictedHomeScore}-${predictedAwayScore} ${nextMatch.awayTeam}`
          : betSaved && betType === 2 && nextMatch
          ? `\n*Apuesta:* ${nextMatch.betPlayer} ${predictedPlayerScores ? 'anota' : 'no anota'} vs ${nextMatch.awayTeam}`
          : ''

        const phoneNumber = "2983388452"
        const message = `*Nuevo Pedido!* 🍕

        *Nombre:* ${formData.name}
        *Pedido:*
        ${items.map(item => `- ${item.quantity}x ${item.name}`).join('\n')}

        *Total:* $${finalTotal.toFixed(2)}
        *Pago:* ${formData.paymentMethod === 'transferencia' ? 'Transferencia - napospizzas' : formData.paymentMethod}
        *Entrega:* ${formData.deliveryType === 'delivery' ? `Envío - ${formData.address}` : 'Retiro - Juan Elicagaray 880'}
        *Hora:* ${formData.deliveryTime}
        *Fecha:* ${formData.selectedDate}${betLine}`

        const url = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`
        setWhatsappUrl(url)
        window.open(url, '_blank')

        clearCart()
        setStep(4)

        toast.dismiss(loadingToastId)
        toast.success('¡Pedido realizado con éxito!')
        setIsSubmitting(false)

      } catch (innerError: any) {
        console.error("Error en proceso interno, liberando stock diario:", innerError)
        await releaseDailyStock(formData.selectedDate, totalPizzas)
        throw innerError
      }

    } catch (error: any) {
      console.error('Error al crear el pedido:', error)
      toast.dismiss(loadingToastId)

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
    setBetType(null)
    setPredictedHomeScore("")
    setPredictedAwayScore("")
    setPredictedPlayerScores(undefined)
    setBetSaved(false)
    setNextMatch(null)
    onClose()
  }

  const stepTitle = step === 4
    ? 'Pedido Exitoso'
    : step === 3
    ? '¡Hacé tu apuesta! ⚽'
    : `Carrito (${totalItems})`

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
          <div className="w-full flex justify-center pt-3 pb-1 cursor-pointer hover:bg-foreground/5 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-foreground/50">
              <path d="m6 9 6 6 6-6" />
            </svg>
          </div>
          <div className="flex items-center justify-between px-4 pb-4 border-b border-foreground/20" onClick={handleClose}>
            <h2 className="text-2xl font-bold text-foreground">{stepTitle}</h2>
            <button onClick={handleClose} className="p-2 hover:bg-foreground/10 rounded-md transition-colors" aria-label="Cerrar carrito">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">

          {/* Step 1: Cart items */}
          {step === 1 && (items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-foreground/60 mb-4">
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

          {/* Step 2: Order form */}
          {step === 2 && (
            <div className="space-y-6">
              <h3 className="text-xl font-bold text-foreground mb-4">Información del pedido</h3>
              <div className="flex flex-col gap-8">
                {/* Nombre */}
                <div>
                  <label htmlFor="name" className="block text-md font-medium text-foreground mb-1">Nombre completo *</label>
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
                      <input type="radio" name="paymentMethod" value="efectivo" checked={formData.paymentMethod === 'efectivo'} onChange={handleInputChange} className="text-primary-medium focus:ring-primary-medium" />
                      <span>Efectivo</span>
                    </label>
                    <label className={`flex items-center gap-2 px-4 py-2 ${formData.paymentMethod === 'transferencia' ? 'border-2 text-background bg-success rounded-sm' : ''}`}>
                      <input type="radio" name="paymentMethod" value="transferencia" checked={formData.paymentMethod === 'transferencia'} onChange={handleInputChange} className="text-primary-medium focus:ring-primary-medium" />
                      <span>Transferencia</span>
                    </label>
                  </div>
                  {formData.paymentMethod === 'transferencia' && (
                    <div className="mt-3 p-3 bg-secondary/10 rounded-md text-center">
                      <p className="text-sm text-foreground/80">Alias: <span className="font-semibold select-all">napospizzas</span></p>
                    </div>
                  )}
                </div>

                {/* Fecha de entrega */}
                <div>
                  <label htmlFor="selectedDate" className="block text-md font-medium text-foreground mb-1">Fecha de entrega *</label>
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
                      <input type="radio" name="deliveryType" value="retiro" checked={formData.deliveryType === 'retiro'} onChange={handleInputChange} className="text-primary-medium focus:ring-primary-medium" />
                      <span>Retiro en local</span>
                    </label>
                    <label className={`flex items-center gap-2 px-4 py-2 cursor-pointer ${formData.deliveryType === 'delivery' ? 'border-2 text-background bg-success rounded-sm' : ''}`}>
                      <input type="radio" name="deliveryType" value="delivery" checked={formData.deliveryType === 'delivery'} onChange={handleInputChange} className="text-primary-medium focus:ring-primary-medium" />
                      <div className="flex flex-col items-center">
                        <span>Envío a domicilio</span>
                        {formData.deliveryType === 'delivery' && <span className="text-[10px] font-medium opacity-90">(2500 envio)</span>}
                      </div>
                    </label>
                  </div>

                  {formData.deliveryType === 'retiro' && (
                    <div className="mt-3 p-3 bg-secondary/10 rounded-md text-center">
                      <p className="text-sm text-foreground/80">Retira por: <span className="font-semibold">Juan Elicagaray 880</span></p>
                    </div>
                  )}

                  {formData.deliveryType === 'delivery' && (
                    <div className="mt-4">
                      <label htmlFor="address" className="block text-md font-medium text-foreground mb-1">Dirección de envío *</label>
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
                  <label className="block text-md font-medium text-foreground mb-2">Hora de entrega *</label>
                  {loadingSlots ? (
                    <div className="text-center py-4 text-foreground/60">Cargando horarios disponibles...</div>
                  ) : availableSlots.length === 0 ? (
                    <div className="text-center py-4 px-3 bg-foreground/5 rounded-md">
                      <p className="text-sm text-foreground/60">No hay horarios disponibles para esta fecha.</p>
                      <p className="text-xs text-foreground/60 mt-1">Intenta seleccionar otra fecha.</p>
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
                                <p className="font-semibold text-foreground">Entrega: {slot.deliveryTime}</p>
                                <p className="text-xs text-foreground/60">Preparación inicia: {slot.startTime}</p>
                              </div>
                              {selectedSlot?.deliveryTime === slot.deliveryTime && (
                                <svg className="w-5 h-5 text-primary-medium" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                              )}
                            </div>
                          </button>
                        ))}
                      </div>
                      {availableSlots.length > 3 && (
                        <p className="text-center text-md text-foreground font-semibold mt-5 animate-pulse">Desliza para ver más horarios ↓</p>
                      )}
                    </>
                  )}
                  <p className="text-xs text-foreground/60 mt-2">
                    {items.reduce((sum, item) => sum + item.quantity, 0)} pizza(s) - Tiempo estimado: {items.reduce((sum, item) => sum + item.quantity, 0) * 5} minutos
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Bet selection */}
          {step === 3 && (
            <div className="space-y-5">
              <p className="text-foreground/60 text-sm">
                ¡Con cada compra podés hacer una apuesta al próximo partido! Si acertás, ganás un premio para tu próxima compra.
              </p>

              {loadingMatch ? (
                <div className="text-center py-8 text-foreground/50">Cargando partido próximo...</div>
              ) : !nextMatch ? (
                <div className="p-4 bg-foreground/5 rounded-lg text-center">
                  <p className="text-foreground/60">No hay partidos próximos disponibles en este momento.</p>
                  <p className="text-sm text-foreground/40 mt-1">Podés continuar sin apostar.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Match card */}
                  <div className="p-4 bg-primary-medium/10 border border-primary-medium/20 rounded-xl text-center">
                    <p className="text-xs text-foreground/50 mb-1 uppercase tracking-wide">Próximo partido</p>
                    <p className="text-xl font-bold text-foreground">{nextMatch.homeTeam} vs {nextMatch.awayTeam}</p>
                    <p className="text-sm text-foreground/60 mt-1">{nextMatch.matchDate} · {nextMatch.matchTime}</p>
                  </div>

                  {/* Bet options */}
                  <div className="space-y-3">

                    {/* No bet */}
                    <button
                      type="button"
                      onClick={() => setBetType(null)}
                      className={`w-full p-3 border rounded-lg text-left transition-all ${betType === null
                        ? 'border-foreground/40 bg-foreground/5 ring-1 ring-foreground/20'
                        : 'border-foreground/15 hover:border-foreground/30'
                        }`}
                    >
                      <p className="font-medium text-foreground/70">Sin apuesta</p>
                      <p className="text-xs text-foreground/40 mt-0.5">Finalizar compra sin participar</p>
                    </button>

                    {/* Bet type 1: Exact result */}
                    <div className="space-y-2">
                      <button
                        type="button"
                        onClick={() => setBetType(1)}
                        className={`w-full p-4 border rounded-lg text-left transition-all ${betType === 1
                          ? 'border-blue-400 bg-blue-50 ring-2 ring-blue-300/50'
                          : 'border-foreground/15 hover:border-blue-300/60 hover:bg-blue-50/30'
                          }`}
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-semibold text-foreground">🏆 Apuesta 1 — Resultado exacto</p>
                            <p className="text-sm text-foreground/60 mt-0.5">Acertá el marcador final</p>
                          </div>
                          <span className="text-xs font-semibold text-blue-600 bg-blue-100 px-2 py-1 rounded-full whitespace-nowrap ml-2">
                            1 pizza gratis
                          </span>
                        </div>
                      </button>

                      {betType === 1 && (
                        <div className="px-2 py-3 bg-blue-50/50 rounded-lg border border-blue-100">
                          <p className="text-sm font-medium text-foreground/70 mb-3 text-center">¿Cuál será el resultado?</p>
                          <div className="flex items-center gap-3 justify-center">
                            <div className="flex flex-col items-center gap-1">
                              <label className="text-xs font-medium text-foreground/60">{nextMatch.homeTeam}</label>
                              <input
                                type="number"
                                min="0"
                                max="20"
                                value={predictedHomeScore}
                                onChange={e => setPredictedHomeScore(e.target.value)}
                                placeholder="0"
                                className="w-16 text-center text-xl font-bold px-2 py-2 border-2 border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400/50"
                              />
                            </div>
                            <span className="text-2xl font-bold text-foreground/40 mt-4">—</span>
                            <div className="flex flex-col items-center gap-1">
                              <label className="text-xs font-medium text-foreground/60">{nextMatch.awayTeam}</label>
                              <input
                                type="number"
                                min="0"
                                max="20"
                                value={predictedAwayScore}
                                onChange={e => setPredictedAwayScore(e.target.value)}
                                placeholder="0"
                                className="w-16 text-center text-xl font-bold px-2 py-2 border-2 border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400/50"
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Bet type 2: player scores — only if match has a betPlayer configured */}
                    {nextMatch.betPlayer && (
                      <div className="space-y-2">
                        <button
                          type="button"
                          onClick={() => setBetType(2)}
                          className={`w-full p-4 border rounded-lg text-left transition-all ${betType === 2
                            ? 'border-purple-400 bg-purple-50 ring-2 ring-purple-300/50'
                            : 'border-foreground/15 hover:border-purple-300/60 hover:bg-purple-50/30'
                            }`}
                        >
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="font-semibold text-foreground">⚽ Apuesta 2 — ¿{nextMatch.betPlayer} anota?</p>
                              <p className="text-sm text-foreground/60 mt-0.5">¿Mete un gol en este partido?</p>
                            </div>
                            <span className="text-xs font-semibold text-purple-600 bg-purple-100 px-2 py-1 rounded-full whitespace-nowrap ml-2">
                              {nextMatch.betPlayerDiscount ?? 30}% de descuento
                            </span>
                          </div>
                        </button>

                        {betType === 2 && (
                          <div className="px-2 py-3 bg-purple-50/50 rounded-lg border border-purple-100">
                            <p className="text-sm font-medium text-foreground/70 mb-3 text-center">
                              ¿{nextMatch.betPlayer} anota en este partido?
                            </p>
                            <div className="flex gap-4 justify-center">
                              <button
                                type="button"
                                onClick={() => setPredictedPlayerScores(true)}
                                className={`flex-1 max-w-[140px] py-3 rounded-lg font-semibold border-2 transition-all ${predictedPlayerScores === true
                                  ? 'border-purple-500 bg-purple-500 text-white'
                                  : 'border-purple-200 text-purple-600 hover:bg-purple-50'
                                  }`}
                              >
                                ✅ Sí, anota
                              </button>
                              <button
                                type="button"
                                onClick={() => setPredictedPlayerScores(false)}
                                className={`flex-1 max-w-[140px] py-3 rounded-lg font-semibold border-2 transition-all ${predictedPlayerScores === false
                                  ? 'border-purple-500 bg-purple-500 text-white'
                                  : 'border-purple-200 text-purple-600 hover:bg-purple-50'
                                  }`}
                              >
                                ❌ No anota
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 4: Success */}
          {step === 4 && (
            <div className="flex flex-col items-center justify-center h-full space-y-6 text-center animate-in fade-in slide-in-from-bottom-5 duration-500">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-green-600">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>

              <h3 className="text-2xl font-bold text-foreground">¡Tu pedido está listo!</h3>

              <div className="space-y-2 max-w-xs mx-auto text-foreground/80">
                <p className="text-md">Tu orden ha sido registrada correctamente.</p>
                {betType !== null && nextMatch && (
                  betSaved ? (
                    <p className="text-sm text-primary-medium font-medium mt-2">
                      ⚽ Tu apuesta fue registrada. ¡Mucha suerte!
                    </p>
                  ) : (
                    <p className="text-sm text-red-500 font-medium mt-2">
                      ❌ Tu apuesta no pudo ser registrada, el partido ya había arrancado.
                    </p>
                  )
                )}
                <p className="text-md">Si no se abrió WhatsApp automáticamente, hacé clic en el botón de abajo para enviar los detalles.</p>
              </div>

              {whatsappUrl && (
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full max-w-xs bg-[#25D366] hover:bg-[#128C7E] text-white font-bold py-4 px-6 rounded-lg transition-all transform hover:scale-105 shadow-lg flex items-center justify-center gap-2"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
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
        {items.length > 0 && step < 4 && (
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
                  onClick={handleContinueToBet}
                  className="w-full bg-primary-medium hover:bg-primary-medium/90 text-white font-bold py-3 px-4 rounded-md transition-colors"
                >
                  Continuar
                </button>
                <button
                  onClick={() => setStep(1)}
                  className="w-full mt-2 bg-foreground/5 hover:bg-foreground/10 text-foreground font-semibold py-2 px-4 rounded-md transition-colors"
                >
                  Volver al carrito
                </button>
              </>
            )}

            {step === 3 && (
              <>
                <button
                  onClick={handleFinalizeOrder}
                  disabled={isSubmitting}
                  className={`w-full bg-primary-medium hover:bg-primary-medium/90 text-white font-bold py-3 px-4 rounded-md transition-colors ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {isSubmitting ? 'Procesando...' : 'Realizar compra'}
                </button>
                <button
                  onClick={() => setStep(2)}
                  className="w-full mt-2 bg-foreground/5 hover:bg-foreground/10 text-foreground font-semibold py-2 px-4 rounded-md transition-colors"
                >
                  Volver al formulario
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </>
  )
}
