"use client"

import { useEffect, useState } from "react"
import { Bet } from "@/types/bet"
import { Match } from "@/types/match"
import { listenToBets, deleteBet } from "@/lib/bets-service"
import { getMatches } from "@/lib/matches-service"
import { Button } from "@/components/ui/button"
import { Trash2, Plus } from "lucide-react"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ManualBetForm } from "./manual-bet-form"

function getBetResult(bet: Bet, match: Match | undefined): { status: "pending" | "won" | "lost"; prize?: string } {
  if (!match || !match.isCompleted) return { status: "pending" }

  if (bet.betType === 1) {
    if (!match.result) return { status: "pending" }
    const won =
      bet.predictedHomeScore === match.result.homeScore &&
      bet.predictedAwayScore === match.result.awayScore
    return { status: won ? "won" : "lost", prize: won ? "1 pizza gratis" : undefined }
  }

  if (bet.betType === 2) {
    if (match.playerScored === undefined) return { status: "pending" }
    const won = bet.predictedPlayerScores === match.playerScored
    const discount = bet.betPlayerDiscount ?? 30
    return { status: won ? "won" : "lost", prize: won ? `${discount}% de descuento` : undefined }
  }

  return { status: "pending" }
}

export function BetsTable() {
  const [bets, setBets] = useState<Bet[]>([])
  const [matchesMap, setMatchesMap] = useState<Record<string, Match>>({})
  const [loading, setLoading] = useState(true)
  const [matchFilter, setMatchFilter] = useState<string>("all")
  const [isAddBetOpen, setIsAddBetOpen] = useState(false)

  useEffect(() => {
    getMatches().then(matches => {
      const map: Record<string, Match> = {}
      matches.forEach(m => { map[m.id] = m })
      setMatchesMap(map)
    })

    const unsubscribe = listenToBets(data => {
      setBets(data)
      setLoading(false)
    })
    return () => unsubscribe()
  }, [])

  async function handleDelete(id: string) {
    try {
      await deleteBet(id)
      toast.success("Apuesta eliminada")
    } catch {
      toast.error("Error al eliminar la apuesta")
    }
  }

  const filteredBets = matchFilter === "all"
    ? bets
    : bets.filter(b => b.matchId === matchFilter)

  // Unique matches that have bets
  const matchesWithBets = Object.values(matchesMap).filter(m =>
    bets.some(b => b.matchId === m.id)
  )

  if (loading) {
    return <div className="text-center py-10 text-foreground/50">Cargando apuestas...</div>
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-semibold">Apuestas</h2>
        <div className="flex items-center gap-3">
          <Button
            onClick={() => setIsAddBetOpen(true)}
            className="bg-primary-medium hover:bg-primary-dark text-white"
          >
            <Plus className="h-4 w-4 mr-2" />
            Nueva apuesta
          </Button>
          {matchesWithBets.length > 0 && (
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-foreground/60 whitespace-nowrap">Filtrar por partido:</label>
              <select
                value={matchFilter}
                onChange={e => setMatchFilter(e.target.value)}
                className="px-3 py-2 border border-foreground/20 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-medium/50 bg-background"
              >
                <option value="all">Todos los partidos</option>
                {matchesWithBets.map(m => (
                  <option key={m.id} value={m.id}>
                    {m.homeTeam} vs {m.awayTeam} · {m.matchDate}
                  </option>
                ))}
              </select>
            </div>
          )}
          <span className="text-sm text-foreground/50">
            {filteredBets.length} apuesta{filteredBets.length !== 1 ? "s" : ""}
          </span>
        </div>
      </div>

      {filteredBets.length === 0 ? (
        <div className="text-center py-12 text-foreground/50">
          <p>{bets.length === 0 ? "No hay apuestas registradas todavía." : "No hay apuestas para este partido."}</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-foreground/10">
                <th className="text-left py-3 px-4 font-semibold text-foreground/60">Cliente</th>
                <th className="text-left py-3 px-4 font-semibold text-foreground/60">Partido</th>
                <th className="text-left py-3 px-4 font-semibold text-foreground/60">Tipo</th>
                <th className="text-left py-3 px-4 font-semibold text-foreground/60">Predicción</th>
                <th className="text-left py-3 px-4 font-semibold text-foreground/60">Estado</th>
                <th className="text-left py-3 px-4 font-semibold text-foreground/60">Total pedido</th>
                <th className="text-right py-3 px-4 font-semibold text-foreground/60">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredBets.map(bet => {
                const match = matchesMap[bet.matchId]
                const result = getBetResult(bet, match)
                return (
                  <tr key={bet.id} className="border-b border-foreground/5 hover:bg-foreground/2">
                    <td className="py-3 px-4 font-medium">
                      {bet.clientName}
                      {bet.orderId === "manual" && (
                        <span className="ml-2 text-xs text-foreground/40 font-normal">(WhatsApp)</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-foreground/70">
                      {bet.homeTeam} vs {bet.awayTeam}
                      <span className="block text-xs text-foreground/40">{bet.matchDate}</span>
                    </td>
                    <td className="py-3 px-4">
                      {bet.betType === 1 ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                          Resultado exacto
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
                          {bet.betPlayerName ?? "Jugador"} anota
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-foreground/80">
                      {bet.betType === 1 ? (
                        <span>{bet.homeTeam} {bet.predictedHomeScore} — {bet.predictedAwayScore} {bet.awayTeam}</span>
                      ) : (
                        <span>{bet.predictedPlayerScores ? "✅ Sí anota" : "❌ No anota"}</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {result.status === "pending" && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
                          Pendiente
                        </span>
                      )}
                      {result.status === "won" && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                          🏆 Ganó · {result.prize}
                        </span>
                      )}
                      {result.status === "lost" && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
                          Perdió
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-foreground/70">${bet.orderTotal.toFixed(2)}</td>
                    <td className="py-3 px-4">
                      <div className="flex justify-end">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(bet.id)}
                          className="h-8 w-8 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={isAddBetOpen} onOpenChange={setIsAddBetOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nueva apuesta manual</DialogTitle>
          </DialogHeader>
          <ManualBetForm
            matches={Object.values(matchesMap)}
            onSuccess={() => setIsAddBetOpen(false)}
            onCancel={() => setIsAddBetOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}
