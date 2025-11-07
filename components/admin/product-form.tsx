"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import type { Product } from "@/types/product"
import { toast } from "sonner"
import Image from "next/image"

const productSchema = z.object({
  name: z.string().min(1, "El nombre es requerido"),
  description: z.string().min(1, "La descripción es requerida"),
  price: z.number().min(0, "El precio debe ser mayor o igual a 0"),
  category: z.enum(["pizza", "bebida", "postre"]),
  available: z.boolean(),
  imageUrl: z
    .string()
    .min(1, "La URL de la imagen es requerida")
    .refine(
      (url) => {
        // Aceptar URLs completas (http/https) o rutas relativas que empiecen con /
        return (
          url.startsWith("http://") ||
          url.startsWith("https://") ||
          url.startsWith("/")
        )
      },
      {
        message:
          "Debe ser una URL completa (https://...) o una ruta relativa (/imagen.jpg)",
      }
    ),
})

type ProductFormValues = z.infer<typeof productSchema>

interface ProductFormProps {
  product?: Product
  onSubmit: (data: Omit<Product, "id">) => Promise<void>
  onCancel: () => void
}

export function ProductForm({ product, onSubmit, onCancel }: ProductFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(
    product?.imageUrl || null
  )

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: product?.name || "",
      description: product?.description || "",
      price: product?.price || 0,
      category: product?.category || "pizza",
      available: product?.available ?? true,
      imageUrl: product?.imageUrl || "",
    },
  })

  useEffect(() => {
    if (product) {
      form.reset({
        name: product.name,
        description: product.description,
        price: product.price,
        category: product.category,
        available: product.available,
        imageUrl: product.imageUrl,
      })
      setPreviewUrl(product.imageUrl)
    }
  }, [product, form])

  // Actualizar preview cuando cambia la URL
  const imageUrl = form.watch("imageUrl")
  useEffect(() => {
    if (imageUrl) {
      setPreviewUrl(imageUrl)
    } else {
      setPreviewUrl(null)
    }
  }, [imageUrl])

  async function handleSubmit(data: ProductFormValues) {
    setIsLoading(true)
    try {
      await onSubmit(data)
      toast.success(product ? "Producto actualizado" : "Producto creado")
      if (!product) {
        form.reset()
      }
    } catch (error: any) {
      toast.error(error.message || "Error al guardar el producto")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nombre</FormLabel>
              <FormControl>
                <Input placeholder="Ej: Pizza Margherita" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Descripción</FormLabel>
              <FormControl>
                <Input
                  placeholder="Ej: Tomate, mozzarella fresca, albahaca"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="price"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Precio</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    {...field}
                    onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="category"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Categoría</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                  value={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona una categoría" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="pizza">Pizza</SelectItem>
                    <SelectItem value="bebida">Bebida</SelectItem>
                    <SelectItem value="postre">Postre</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="imageUrl"
          render={({ field }) => (
            <FormItem>
              <FormLabel>URL de la imagen</FormLabel>
              <div className="space-y-4">
                {previewUrl && (
                  <div className="relative w-full max-w-xs">
                    <div className="relative aspect-square w-full overflow-hidden rounded-lg border">
                      <Image
                        src={previewUrl}
                        alt="Preview"
                        fill
                        className="object-cover"
                        onError={() => {
                          setPreviewUrl(null)
                          toast.error("No se pudo cargar la imagen. Verifica la URL.")
                        }}
                      />
                    </div>
                  </div>
                )}
                <FormControl>
                  <Input
                    placeholder="https://ejemplo.com/imagen.jpg o /pizza-margherita.jpg"
                    {...field}
                  />
                </FormControl>
                <FormDescription>
                  Ingresa la URL completa de la imagen (https://...) o una ruta
                  relativa desde la carpeta public (/imagen.jpg). Sube la imagen
                  a un servicio externo como Imgur, Cloudinary, etc. y pega la URL aquí.
                </FormDescription>
                <FormMessage />
              </div>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="available"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel>Disponible</FormLabel>
                <FormDescription>
                  Si está desactivado, el producto no se mostrará en la tienda
                </FormDescription>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
            </FormItem>
          )}
        />

        <div className="flex gap-2 justify-end">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading
              ? "Guardando..."
              : product
                ? "Actualizar"
                : "Crear"}
          </Button>
        </div>
      </form>
    </Form>
  )
}

