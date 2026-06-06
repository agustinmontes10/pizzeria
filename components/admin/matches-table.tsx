"use client"

import { Match } from "@/types/match"
import { Button } from "@/components/ui/button"
import { Pencil, Trash2, Plus } from "lucide-react"

interface MatchesTableProps {
  matches: Match[]
  onEdit: (match: Match) => void
  onDelete: (id: string) => void
  onCreate: () => void
}

export function MatchesTable({ matches, onEdit, onDelete, onCreate }: MatchesTableProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Partidos</h2>
        <Button
          onClick={onCreate}
          className="bg-primary-medium hover:bg-primary-dark text-white"
        >
          <Plus className="h-4 w-4 mr-2" />
          Nuevo partido
        </Button>
      </div>

      {matches.length === 0 ? (
        <div className="text-center py-12 text-foreground/50">
          <p>No hay partidos cargados.</p>
          <p className="text-sm mt-1">Creá uno para que los clientes puedan apostar.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-foreground/10">
                <th className="text-left py-3 px-4 font-semibold text-foreground/60">Partido</th>
                <th className="text-left py-3 px-4 font-semibold text-foreground/60">Fecha y hora</th>
                <th className="text-left py-3 px-4 font-semibold text-foreground/60">Estado</th>
                <th className="text-left py-3 px-4 font-semibold text-foreground/60">Resultado</th>
                <th className="text-right py-3 px-4 font-semibold text-foreground/60">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {matches.map(match => (
                <tr key={match.id} className="border-b border-foreground/5 hover:bg-foreground/2">
                  <td className="py-3 px-4 font-medium">
                    {match.homeTeam} vs {match.awayTeam}
                  </td>
                  <td className="py-3 px-4 text-foreground/70">
                    {match.matchDate} {match.matchTime}
                  </td>
                  <td className="py-3 px-4">
                    {match.isCompleted ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-foreground/10 text-foreground/60">
                        Finalizado
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                        Próximo
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    {match.isCompleted && match.result ? (
                      <span className="font-semibold">
                        {match.result.homeScore} - {match.result.awayScore}
                        {match.messiScored !== undefined && (
                          <span className="ml-2 text-xs text-foreground/50">
                            {match.messiScored ? "⚽ Messi anotó" : "Messi no anotó"}
                          </span>
                        )}
                      </span>
                    ) : (
                      <span className="text-foreground/30">-</span>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onEdit(match)}
                        className="h-8 w-8 hover:bg-primary-medium/10"
                      >
                        <Pencil className="h-4 w-4 text-primary-medium" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onDelete(match.id)}
                        className="h-8 w-8 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
