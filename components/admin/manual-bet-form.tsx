"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Match } from "@/types/match"
import { createBet } from "@/lib/bets-service"
import { toast } from "sonner"

interface ManualBetFormProps {
  matches: Match[]
  onSuccess: () => void
  onCancel: () => void
}

export function ManualBetForm({ matches, onSuccess, onCancel }: ManualBetFormProps) {
  const upcomingMatches = matches.filter(m => !m.isCompleted)

  const [clientName, setClientName] = useState("")
  const [orderTotal, setOrderTotal] = useState("")
  const [selectedMatchId, setSelectedMatchId] = useState(upcomingMatches[0]?.id ?? matches[0]?.id ?? "")
  const [betType, setBetType] = useState<1 | 2>(1)
  const [predictedHomeScore, setPredictedHomeScore] = useState("")
  const [predictedAwayScore, setPredictedAwayScore] = useState("")
  const [predictedPlayerScores, setPredictedPlayerScores] = useState<boolean | undefined>(undefined)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const selectedMatch = matches.find(m => m.id === selectedMatchId)
  const hasPlayer = !!selectedMatch?.betPlayer

  // Reset bet type if switching to a match without a player and type 2 was selected
  function handleMatchChange(id: string) {
    setSelectedMatchId(id)
    const match = matches.find(m => m.id === id)
    if (!match?.betPlayer && betType === 2) setBetType(1)
    setPredictedPlayerScores(undefined)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!clientName.trim() || !selectedMatchId || !selectedMatch) return

    if (betType === 1 && (predictedHomeScore === "" || predictedAwayScore === "")) {
      toast.error("Ingresá el resultado predicho")
      return
    }
    if (betType === 2 && predictedPlayerScores === undefined) {
      toast.error(`Elegí si ${selectedMatch.betPlayer} anota o no`)
      return
    }

    setIsSubmitting(true)
    try {
      await createBet({
        orderId: "manual",
        clientName: clientName.trim(),
        matchId: selectedMatchId,
        homeTeam: selectedMatch.homeTeam,
        awayTeam: selectedMatch.awayTeam,
        matchDate: selectedMatch.matchDate,
        betType,
        ...(betType === 1 && {
          predictedHomeScore: Number(predictedHomeScore),
          predictedAwayScore: Number(predictedAwayScore),
        }),
        ...(betType === 2 && {
          predictedPlayerScores,
          betPlayerName: selectedMatch.betPlayer,
          betPlayerDiscount: selectedMatch.betPlayerDiscount ?? 30,
        }),
        createdAt: new Date().toISOString(),
        orderTotal: Number(orderTotal) || 0,
      })
      toast.success("Apuesta registrada correctamente")
      onSuccess()
    } catch {
      toast.error("Error al registrar la apuesta")
    } finally {
      setIsSubmitting(false)
    }
  }

  if (matches.length === 0) {
    return (
      <div className="py-6 text-center text-foreground/50">
        <p>No hay partidos cargados.</p>
        <p className="text-sm mt-1">Creá un partido primero desde la sección Partidos.</p>
        <div className="flex justify-end mt-6">
          <Button variant="outline" onClick={onCancel}>Cerrar</Button>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">

      {/* Cliente y total */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Nombre del cliente *</label>
          <input
            type="text"
            value={clientName}
            onChange={e => setClientName(e.target.value)}
            required
            placeholder="ej: Juan Pérez"
            className="w-full px-3 py-2 border border-foreground/20 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-medium/50"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Total del pedido</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-foreground/50">$</span>
            <input
              type="number"
              min="0"
              value={orderTotal}
              onChange={e => setOrderTotal(e.target.value)}
              placeholder="0"
              className="w-full pl-7 pr-3 py-2 border border-foreground/20 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-medium/50"
            />
          </div>
        </div>
      </div>

      {/* Partido */}
      <div>
        <label className="block text-sm font-medium mb-1">Partido *</label>
        <select
          value={selectedMatchId}
          onChange={e => handleMatchChange(e.target.value)}
          className="w-full px-3 py-2 border border-foreground/20 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-medium/50 bg-background"
        >
          {upcomingMatches.length > 0 && (
            <optgroup label="Próximos">
              {upcomingMatches.map(m => (
                <option key={m.id} value={m.id}>
                  {m.homeTeam} vs {m.awayTeam} · {m.matchDate}
                </option>
              ))}
            </optgroup>
          )}
          {matches.filter(m => m.isCompleted).length > 0 && (
            <optgroup label="Finalizados">
              {matches.filter(m => m.isCompleted).map(m => (
                <option key={m.id} value={m.id}>
                  {m.homeTeam} vs {m.awayTeam} · {m.matchDate}
                </option>
              ))}
            </optgroup>
          )}
        </select>
      </div>

      {/* Tipo de apuesta */}
      <div>
        <p className="text-sm font-medium mb-2">Tipo de apuesta *</p>
        <div className="space-y-2">

          {/* Tipo 1 */}
          <label className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-all ${betType === 1 ? 'border-blue-400 bg-blue-50' : 'border-foreground/20 hover:border-blue-300/60'}`}>
            <input
              type="radio"
              name="betType"
              checked={betType === 1}
              onChange={() => setBetType(1)}
              className="accent-blue-500"
            />
            <div className="flex-1 flex items-center justify-between">
              <span className="font-medium text-sm">🏆 Resultado exacto</span>
              <span className="text-xs font-semibold text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full">1 pizza gratis</span>
            </div>
          </label>

          {/* Tipo 2 — solo si el partido tiene jugador */}
          {hasPlayer && (
            <label className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-all ${betType === 2 ? 'border-purple-400 bg-purple-50' : 'border-foreground/20 hover:border-purple-300/60'}`}>
              <input
                type="radio"
                name="betType"
                checked={betType === 2}
                onChange={() => setBetType(2)}
                className="accent-purple-500"
              />
              <div className="flex-1 flex items-center justify-between">
                <span className="font-medium text-sm">⚽ ¿{selectedMatch?.betPlayer} anota?</span>
                <span className="text-xs font-semibold text-purple-600 bg-purple-100 px-2 py-0.5 rounded-full">
                  {selectedMatch?.betPlayerDiscount ?? 30}% de descuento
                </span>
              </div>
            </label>
          )}
        </div>
      </div>

      {/* Predicción según tipo */}
      {betType === 1 && selectedMatch && (
        <div className="p-4 bg-blue-50/50 border border-blue-100 rounded-lg">
          <p className="text-sm font-medium text-foreground/70 mb-3 text-center">Resultado predicho</p>
          <div className="flex items-center gap-3 justify-center">
            <div className="flex flex-col items-center gap-1">
              <label className="text-xs font-medium text-foreground/60">{selectedMatch.homeTeam}</label>
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
            <span className="text-2xl font-bold text-foreground/30 mt-4">—</span>
            <div className="flex flex-col items-center gap-1">
              <label className="text-xs font-medium text-foreground/60">{selectedMatch.awayTeam}</label>
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

      {betType === 2 && selectedMatch?.betPlayer && (
        <div className="p-4 bg-purple-50/50 border border-purple-100 rounded-lg">
          <p className="text-sm font-medium text-foreground/70 mb-3 text-center">
            ¿{selectedMatch.betPlayer} anota?
          </p>
          <div className="flex gap-3 justify-center">
            <button
              type="button"
              onClick={() => setPredictedPlayerScores(true)}
              className={`flex-1 max-w-[140px] py-2.5 rounded-lg font-semibold border-2 transition-all text-sm ${predictedPlayerScores === true
                ? 'border-purple-500 bg-purple-500 text-white'
                : 'border-purple-200 text-purple-600 hover:bg-purple-50'}`}
            >
              ✅ Sí, anota
            </button>
            <button
              type="button"
              onClick={() => setPredictedPlayerScores(false)}
              className={`flex-1 max-w-[140px] py-2.5 rounded-lg font-semibold border-2 transition-all text-sm ${predictedPlayerScores === false
                ? 'border-purple-500 bg-purple-500 text-white'
                : 'border-purple-200 text-purple-600 hover:bg-purple-50'}`}
            >
              ❌ No anota
            </button>
          </div>
        </div>
      )}

      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
          Cancelar
        </Button>
        <Button
          type="submit"
          disabled={isSubmitting}
          className="bg-primary-medium hover:bg-primary-dark text-white"
        >
          {isSubmitting ? "Guardando..." : "Registrar apuesta"}
        </Button>
      </div>
    </form>
  )
}
