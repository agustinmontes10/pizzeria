"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Match } from "@/types/match"

interface MatchFormProps {
  match?: Match
  onSubmit: (data: Omit<Match, "id">) => Promise<void>
  onCancel: () => void
}

export function MatchForm({ match, onSubmit, onCancel }: MatchFormProps) {
  const [homeTeam, setHomeTeam] = useState(match?.homeTeam ?? "")
  const [awayTeam, setAwayTeam] = useState(match?.awayTeam ?? "")
  const [matchDate, setMatchDate] = useState(match?.matchDate ?? "")
  const [matchTime, setMatchTime] = useState(match?.matchTime ?? "")
  const [betPlayer, setBetPlayer] = useState(match?.betPlayer ?? "")
  const [betPlayerDiscount, setBetPlayerDiscount] = useState<string>(
    match?.betPlayerDiscount?.toString() ?? "30"
  )
  const [isCompleted, setIsCompleted] = useState(match?.isCompleted ?? false)
  const [homeScore, setHomeScore] = useState<string>(match?.result?.homeScore?.toString() ?? "")
  const [awayScore, setAwayScore] = useState<string>(match?.result?.awayScore?.toString() ?? "")
  const [playerScored, setPlayerScored] = useState<boolean>(match?.playerScored ?? false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!homeTeam || !awayTeam || !matchDate || !matchTime) return

    setIsSubmitting(true)
    try {
      const data: Omit<Match, "id"> = {
        homeTeam,
        awayTeam,
        matchDate,
        matchTime,
        isCompleted,
        ...(betPlayer.trim() && {
          betPlayer: betPlayer.trim(),
          betPlayerDiscount: Number(betPlayerDiscount) || 30,
        }),
        ...(isCompleted && homeScore !== "" && awayScore !== "" && {
          result: {
            homeScore: Number(homeScore),
            awayScore: Number(awayScore),
          },
          ...(betPlayer.trim() && { playerScored }),
        }),
      }
      await onSubmit(data)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">

      {/* Equipos */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Equipo local *</label>
          <input
            type="text"
            value={homeTeam}
            onChange={e => setHomeTeam(e.target.value)}
            required
            placeholder="ej: Argentina"
            className="w-full px-3 py-2 border border-foreground/20 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-medium/50"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Equipo visitante *</label>
          <input
            type="text"
            value={awayTeam}
            onChange={e => setAwayTeam(e.target.value)}
            required
            placeholder="ej: Brasil"
            className="w-full px-3 py-2 border border-foreground/20 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-medium/50"
          />
        </div>
      </div>

      {/* Fecha y hora */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Fecha *</label>
          <input
            type="date"
            value={matchDate}
            onChange={e => setMatchDate(e.target.value)}
            required
            className="w-full px-3 py-2 border border-foreground/20 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-medium/50"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Hora *</label>
          <input
            type="time"
            value={matchTime}
            onChange={e => setMatchTime(e.target.value)}
            required
            className="w-full px-3 py-2 border border-foreground/20 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-medium/50"
          />
        </div>
      </div>

      {/* Apuesta tipo 2 — jugador configurable */}
      <div className="p-4 bg-purple-50/50 border border-purple-100 rounded-xl space-y-3">
        <div>
          <p className="text-sm font-semibold text-foreground mb-0.5">⚽ Apuesta 2 — Jugador que anota</p>
          <p className="text-xs text-foreground/50">
            Opcional. Si no configurás un jugador, esta apuesta no aparecerá para los clientes.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Jugador</label>
            <input
              type="text"
              value={betPlayer}
              onChange={e => setBetPlayer(e.target.value)}
              placeholder="ej: Messi, Lamine Yamal..."
              className="w-full px-3 py-2 border border-foreground/20 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-400/50"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">% de descuento si acierta</label>
            <div className="relative">
              <input
                type="number"
                min="1"
                max="100"
                value={betPlayerDiscount}
                onChange={e => setBetPlayerDiscount(e.target.value)}
                disabled={!betPlayer.trim()}
                className="w-full px-3 py-2 pr-8 border border-foreground/20 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-400/50 disabled:opacity-40 disabled:cursor-not-allowed"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-foreground/50">%</span>
            </div>
          </div>
        </div>
        {betPlayer.trim() && (
          <p className="text-xs text-purple-600 font-medium">
            Si {betPlayer} anota → el cliente gana {betPlayerDiscount || 30}% de descuento en su próxima compra
          </p>
        )}
      </div>

      {/* Partido jugado */}
      <div className="flex items-center gap-3 p-3 bg-foreground/5 rounded-md">
        <input
          type="checkbox"
          id="isCompleted"
          checked={isCompleted}
          onChange={e => setIsCompleted(e.target.checked)}
          className="w-4 h-4"
        />
        <label htmlFor="isCompleted" className="text-sm font-medium">
          Partido jugado (cargar resultado)
        </label>
      </div>

      {isCompleted && (
        <div className="space-y-4 p-4 bg-foreground/5 rounded-md">
          <p className="text-sm font-semibold">Resultado del partido</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">{homeTeam || "Local"}</label>
              <input
                type="number"
                min="0"
                value={homeScore}
                onChange={e => setHomeScore(e.target.value)}
                placeholder="0"
                className="w-full px-3 py-2 border border-foreground/20 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-medium/50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">{awayTeam || "Visitante"}</label>
              <input
                type="number"
                min="0"
                value={awayScore}
                onChange={e => setAwayScore(e.target.value)}
                placeholder="0"
                className="w-full px-3 py-2 border border-foreground/20 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-medium/50"
              />
            </div>
          </div>

          {betPlayer.trim() && (
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="playerScored"
                checked={playerScored}
                onChange={e => setPlayerScored(e.target.checked)}
                className="w-4 h-4"
              />
              <label htmlFor="playerScored" className="text-sm font-medium">
                {betPlayer} anotó en este partido
              </label>
            </div>
          )}
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
          {isSubmitting ? "Guardando..." : match ? "Actualizar partido" : "Crear partido"}
        </Button>
      </div>
    </form>
  )
}
