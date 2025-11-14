export interface Order {
    id: string
    order: string
    hour: string
    clientName: string
    paymentMethod: string
    shippingType: string
    total: number
    sent: boolean
    date: string
    pizzas: number
}
