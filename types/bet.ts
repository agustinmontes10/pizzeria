export interface Bet {
  id: string
  orderId: string
  clientName: string
  matchId: string
  homeTeam: string
  awayTeam: string
  matchDate: string
  betType: 1 | 2
  predictedHomeScore?: number
  predictedAwayScore?: number
  predictedPlayerScores?: boolean  // ¿predijo que el jugador anotaría?
  betPlayerName?: string           // nombre del jugador al momento de la apuesta
  betPlayerDiscount?: number       // % de descuento al momento de la apuesta
  createdAt: string
  orderTotal: number
}
