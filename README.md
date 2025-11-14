# Pizzería - Sistema de Pedidos

Aplicación web moderna para la gestión de pedidos de una pizzería, construida con Next.js, Firebase y Tailwind CSS.

## 🚀 Características Principales

- 🍕 Catálogo de productos con categorías
- 🛒 Carrito de compras interactivo
- 🔐 Autenticación de administradores
- 📊 Panel de administración para gestionar productos
- ⏱️ Sistema de gestión de horarios para pedidos
- 📱 Diseño responsive
- 🌓 Modo claro/oscuro

## 🛠️ Estructura del Proyecto

```
.
├── app/                  # Rutas de la aplicación (Next.js 13+ App Router)
├── components/           # Componentes reutilizables
│   ├── ui/              # Componentes de UI personalizados
│   └── admin/           # Componentes del panel de administración
├── context/             # Contextos de React
├── lib/                 # Servicios y utilidades
│   ├── auth-service.ts  # Servicio de autenticación
│   ├── firebase.ts      # Configuración de Firebase
│   ├── orders-service.ts # Gestión de pedidos
│   ├── products-service.ts # Gestión de productos
│   ├── schedule-service.ts # Gestión de horarios
│   └── utils.ts         # Utilidades varias
├── public/              # Archivos estáticos
├── styles/              # Estilos globales
├── types/               # Tipos de TypeScript
└── utils/               # Funciones utilitarias
```

## 🎨 Estilos con Tailwind CSS

El proyecto utiliza Tailwind CSS para los estilos, con una paleta de colores personalizada en `app/globals.css`:

### Paleta de Colores

```css
:root {
  /* Colores primarios (tonos de rojo/terracota para pizzería) */
  --primary-light: oklch(0.85 0.12 25);
  --primary-medium: oklch(0.65 0.18 25);
  --primary-dark: oklch(0.45 0.2 25);

  /* Colores secundarios (tonos de verde/aceituna) */
  --secondary-light: oklch(0.88 0.1 145);
  --secondary-medium: oklch(0.68 0.14 145);
  --secondary-dark: oklch(0.48 0.16 145);

  /* Estados */
  --error: oklch(0.577 0.245 27.325);
  --success: oklch(0.65 0.2 145);
  --warning: oklch(0.75 0.18 75);

  /* Base */
  --background: oklch(0.98 0.01 25);
  --foreground: oklch(0.2 0 0);
  --card: oklch(1 0 0);
  --card-foreground: oklch(0.2 0 0);
  --border: oklch(0.9 0 0);
  --radius: 0.75rem;
  --popover: oklch(1 0 0);
  --popover-foreground: oklch(0.145 0 0);
}
```

### Componentes Personalizados

Se han creado componentes personalizados utilizando `class-variance-authority` y `tailwind-merge` para variantes de estilos.

## 🔔 Notificaciones con Sonner

El proyecto utiliza `sonner` para mostrar notificaciones toast. Ejemplo de uso:

```tsx
import { toast } from "sonner";

// Notificación de éxito
toast.success("Pedido realizado con éxito");

// Notificación de error
toast.error("Error al procesar el pedido");

// Notificación de carga
const toastId = toast.loading("Procesando...");
// Luego, actualizar a éxito o error
toast.success("¡Listo!", { id: toastId });
```

## 🔥 Servicios Principales

### `auth-service.ts`

Maneja la autenticación de usuarios y administradores con Firebase Authentication.

```typescript
// Ejemplo de uso
import { signInWithEmailAndPassword, signOutUser } from "@/lib/auth-service";

// Iniciar sesión
const user = await signInWithEmailAndPassword(email, password);

// Cerrar sesión
await signOutUser();
```

### `products-service.ts`

Gestión de productos en Firestore.

```typescript
import { getProducts, createProduct, updateProduct, deleteProduct } from "@/lib/products-service";

// Obtener todos los productos
const products = await getProducts();

// Crear un nuevo producto
const newProduct = await createProduct({
  name: "Pizza Margherita",
  price: 1200,
  description: "Tomate, mozzarella y albahaca",
  category: "pizzas"
});
```

### `orders-service.ts`

Manejo de pedidos en Firestore.

```typescript
import { createOrder, getOrders, updateOrderStatus } from "@/lib/orders-service";

// Crear un nuevo pedido
const orderId = await createOrder({
  items: [
    { id: "1", name: "Pizza Margherita", price: 1200, quantity: 2 }
  ],
  total: 2400,
  status: "pending",
  customer: {
    name: "Juan Pérez",
    phone: "+541112345678"
  }
});

// Obtener pedidos
const orders = await getOrders();
```

### `schedule-service.ts`

Gestión de horarios para la toma de pedidos.

```typescript
import { getAvailableSlots, reserveSlots } from "@/lib/schedule-service";

// Obtener horarios disponibles para una fecha
const availableSlots = await getAvailableSlots("2023-11-11", 2); // 2 pizzas

// Reservar un horario
await reserveSlots("2023-11-11", "20:00", 2);
```

## 🚀 Instalación

1. Clonar el repositorio
2. Instalar dependencias:
   ```bash
   npm install
   # o
   yarn
   # o
   pnpm install
   ```
3. Configurar variables de entorno (ver `.env.example`)
4. Iniciar el servidor de desarrollo:
   ```bash
   npm run dev
   # o
   yarn dev
   # o
   pnpm dev
   ```

## 📦 Dependencias Principales

- Next.js 13+
- React 18
- TypeScript
- Tailwind CSS
- Firebase (Firestore, Authentication)
- Radix UI (Componentes accesibles)
- Sonner (Notificaciones toast)
- date-fns (Manejo de fechas)

## 📄 Licencia

Este proyecto está bajo la licencia MIT.
