export interface Match {
  id: string
  homeTeam: string
  awayTeam: string
  matchDate: string   // "yyyy-MM-dd"
  matchTime: string   // "HH:mm"
  isCompleted: boolean
  betPlayer?: string          // jugador para apuesta tipo 2 (opcional)
  betPlayerDiscount?: number  // % de descuento si anota (default 30)
  result?: {
    homeScore: number
    awayScore: number
  }
  playerScored?: boolean  // ¿anotó el betPlayer?
}
