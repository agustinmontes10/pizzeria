# Guía: Schedule Service (Sistema de Horarios)

## ¿Qué es esto?

`schedule-service.ts` es un servicio que gestiona los **horarios de entrega de pizzas**. Controla qué horarios están disponibles y cuáles están reservados.

---

## Constantes (Configuración)

```typescript
const SCHEDULE_COLLECTION = "schedule"  // Nombre de la colección en Firebase
const SLOT_INTERVAL = 5                 // Cada slot dura 5 minutos
const TIME_START = "20:00"              // Horario de apertura (8 PM)
const TIME_END = "23:00"                // Horario de cierre (11 PM)
```

**Ejemplo:** Si abre a las 20:00 y cierra a las 23:00, con slots de 5 minutos, tendrá: 20:00, 20:05, 20:10, 20:15... hasta 23:00.

---

## Funciones

### 1. `generateDailySlots(start, end)`

**¿Qué hace?**
Crea una lista de todos los horarios disponibles del día.

**Parámetros:**
- `start`: Hora de inicio (ej: "20:00")
- `end`: Hora de fin (ej: "23:00")

**Retorna:**
Un objeto donde cada horario es una clave y `false` significa "disponible":

```typescript
{
  "20:00": false,
  "20:05": false,
  "20:10": false,
  // ... más horarios
  "23:00": false
}
```

**Ejemplo de uso:**
```typescript
const slots = generateDailySlots("20:00", "23:00")
// Resultado: 37 slots de 5 minutos cada uno
```

---

### 2. `initDaySchedule(date)`

**¿Qué hace?**
Prepara un día para recibir pedidos. Si el día no existe en la base de datos, lo crea con todos los horarios disponibles.

**Parámetro:**
- `date`: Fecha en formato "2025-11-13"

**¿Cuándo se usa?**
Cada vez que quieras trabajar con un día específico.

**Ejemplo de uso:**
```typescript
await initDaySchedule("2025-11-15")
// Crea en Firebase: schedule/2025-11-15 con todos los slots disponibles
```

---

### 3. `getDaySlots(date)`

**¿Qué hace?**
Obtiene los horarios de un día desde Firebase (cuáles están libres y cuáles reservados).

**Parámetro:**
- `date`: Fecha en formato "2025-11-13"

**Retorna:**
Un objeto con los slots del día:
```typescript
{
  "20:00": false,  // Disponible
  "20:05": true,   // Reservado
  "20:10": false,  // Disponible
  // ...
}
```

**Ejemplo de uso:**
```typescript
const slots = await getDaySlots("2025-11-15")
console.log(slots["20:00"]) // false = disponible
```

---

### 4. `getAvailableSlots(date, pizzas)`

**¿Qué hace?**
Encuentra todos los horarios donde se puede entregar un pedido de N pizzas.

**Parámetros:**
- `date`: Fecha (ej: "2025-11-13")
- `pizzas`: Cantidad de pizzas del pedido

**¿Por qué importa la cantidad?**
Porque si pides 3 pizzas, cada pizza ocupa 5 minutos. Entonces necesita 3 slots libres **consecutivos** hacia atrás en el tiempo.

**Retorna:**
Lista de horarios donde se puede entregar:
```typescript
["20:15", "20:20", "20:25", "20:30"]
// Significa: puedes entregar a las 20:15, 20:20, etc.
```

**Ejemplo de uso:**
```typescript
const available = await getAvailableSlots("2025-11-15", 3)
// Encuentra todos los horarios donde caben 3 pizzas
```

---

### 5. `reserveSlots(date, hour, pizzas)`

**¿Qué hace?**
**Marca como ocupado** los horarios cuando alguien hace un pedido.

**Parámetros:**
- `date`: Fecha del pedido
- `hour`: Horario elegido (ej: "20:30")
- `pizzas`: Cantidad de pizzas

**¿Cómo funciona?**

Si pides 3 pizzas a las 20:30:
- Ocupa: 20:10, 20:15, 20:20 (3 slots de 5 minutos hacia atrás)
- No ocupa: 20:30 (ese es solo el horario de entrega)

```
Horarios:     20:05  20:10  20:15  20:20  20:25  20:30
Antes:        false  false  false  false  false  false  ✅ Disponible
Después:      false  TRUE   TRUE   TRUE   false  false  ❌ Reservado
                      ↑      ↑      ↑
                      Ocupados por pizza 1, 2, 3
```

**Ejemplo de uso:**
```typescript
await reserveSlots("2025-11-15", "20:30", 3)
// Marca como reservado: 20:10, 20:15, 20:20
```

---

### 6. `resetDaySlots(date)`

**¿Qué hace?**
**Borra todas las reservas** de un día y lo vuelve a dejar con todos los horarios disponibles (limpia el día).

**Parámetro:**
- `date`: Fecha a limpiar

**Retorna:**
Los slots nuevos (todos con `false`).

**Ejemplo de uso:**
```typescript
await resetDaySlots("2025-11-15")
// El día 2025-11-15 vuelve a tener todos los horarios libres
```

---

## Flujo Completo (Ejemplo Real)

```typescript
// 1️⃣ Admin prepara el día
await initDaySchedule("2025-11-20")
// Resultado: Todos los horarios están disponibles

// 2️⃣ Cliente A quiere 2 pizzas a las 20:30
const available = await getAvailableSlots("2025-11-20", 2)
// Resultado: ["20:10", "20:15", "20:20", "20:25", "20:30", ...]

await reserveSlots("2025-11-20", "20:30", 2)
// Ocupa: 20:20 y 20:25

// 3️⃣ Cliente B quiere 3 pizzas
const available2 = await getAvailableSlots("2025-11-20", 3)
// Resultado: ["20:05", "20:10", "20:40", ...] (20:25-20:35 no está)

// 4️⃣ Admin limpia el día al día siguiente
await resetDaySlots("2025-11-20")
// Todos los horarios vuelven a estar libres
```

---

## Resumen Visual

| Función | Entrada | Salida | Para qué |
|---------|---------|--------|----------|
| `generateDailySlots` | Horas de inicio/fin | Lista de horarios | Crear slots de 5 min |
| `initDaySchedule` | Fecha | - | Preparar un día nuevo |
| `getDaySlots` | Fecha | Horarios + estado | Ver horarios del día |
| `getAvailableSlots` | Fecha + cantidad pizzas | Horarios disponibles | Mostrar opciones al cliente |
| `reserveSlots` | Fecha + hora + cantidad | - | Guardar el pedido |
| `resetDaySlots` | Fecha | Slots nuevos | Limpiar el día |
