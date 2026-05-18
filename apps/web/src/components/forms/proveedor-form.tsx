'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Building2, Loader2, Phone } from 'lucide-react'
import {
  proveedorFormSchema,
  type ProveedorFormPayload,
} from '@erp/shared'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field'

interface ProveedorFormProps {
  defaultValues?: Partial<ProveedorFormPayload>
  onSubmit: (data: ProveedorFormPayload) => void
  isLoading?: boolean
  mode: 'create' | 'edit'
}

export function ProveedorForm({
  defaultValues,
  onSubmit,
  isLoading = false,
  mode,
}: ProveedorFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ProveedorFormPayload>({
    resolver: zodResolver(proveedorFormSchema),
    defaultValues: {
      activo: true,
      ...defaultValues,
    },
  })

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <FieldGroup className="gap-3 sm:gap-7">

        {/* === SECCIÓN 1: DATOS FISCALES === */}
        <div className="rounded-xl border border-border/50 border-l-[3px] border-l-blue-400 dark:border-l-blue-800 bg-card p-4 sm:p-5">
          <div className="mb-4 flex items-center gap-2.5">
            <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-blue-100 text-[11px] font-bold text-blue-600 dark:bg-blue-900/40 dark:text-blue-400 ring-2 ring-blue-100 dark:ring-blue-900/30">1</span>
            <div className="flex size-6 shrink-0 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/40">
              <Building2 className="size-3.5 text-blue-600 dark:text-blue-400" />
            </div>
            <h3 className="text-sm font-semibold text-foreground">Datos fiscales</h3>
          </div>
          <div className="grid gap-4 sm:gap-6 md:grid-cols-2">
            <Field data-invalid={errors.razonSocial ? true : undefined} className="md:col-span-2">
              <FieldLabel>Razón social *</FieldLabel>
              <Input
                {...register('razonSocial')}
                placeholder="Empresa S.A.C."
                aria-invalid={!!errors.razonSocial}
              />
              <FieldError>{errors.razonSocial?.message}</FieldError>
            </Field>

            <Field data-invalid={errors.ruc ? true : undefined}>
              <FieldLabel>RUC *</FieldLabel>
              <Input
                {...register('ruc')}
                placeholder="20123456789"
                maxLength={11}
                aria-invalid={!!errors.ruc}
              />
              <FieldError>{errors.ruc?.message}</FieldError>
            </Field>

            <Field data-invalid={errors.email ? true : undefined}>
              <FieldLabel>Email</FieldLabel>
              <Input
                {...register('email')}
                type="email"
                placeholder="proveedor@empresa.com"
                aria-invalid={!!errors.email}
              />
              <FieldError>{errors.email?.message}</FieldError>
            </Field>

            <Field data-invalid={errors.telefono ? true : undefined}>
              <FieldLabel>Teléfono</FieldLabel>
              <Input
                {...register('telefono')}
                placeholder="01 234 5678"
                aria-invalid={!!errors.telefono}
              />
              <FieldError>{errors.telefono?.message}</FieldError>
            </Field>

            <Field data-invalid={errors.direccion ? true : undefined}>
              <FieldLabel>Dirección</FieldLabel>
              <Input
                {...register('direccion')}
                placeholder="Av. Principal 123, Lima"
                aria-invalid={!!errors.direccion}
              />
              <FieldError>{errors.direccion?.message}</FieldError>
            </Field>
          </div>
        </div>

        {/* === SECCIÓN 2: CONTACTO === */}
        <div className="rounded-xl border border-border/50 border-l-[3px] border-l-green-400 dark:border-l-green-800 bg-card p-4 sm:p-5">
          <div className="mb-4 flex items-center gap-2.5">
            <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-green-100 text-[11px] font-bold text-green-600 dark:bg-green-900/40 dark:text-green-400 ring-2 ring-green-100 dark:ring-green-900/30">2</span>
            <div className="flex size-6 shrink-0 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900/40">
              <Phone className="size-3.5 text-green-600 dark:text-green-400" />
            </div>
            <h3 className="text-sm font-semibold text-foreground">Contacto</h3>
          </div>
          <div className="grid gap-4 sm:gap-6 md:grid-cols-2">
            <Field data-invalid={errors.contactoNombre ? true : undefined}>
              <FieldLabel>Nombre del contacto</FieldLabel>
              <Input
                {...register('contactoNombre')}
                placeholder="Pedro Quispe"
                aria-invalid={!!errors.contactoNombre}
              />
              <FieldError>{errors.contactoNombre?.message}</FieldError>
            </Field>

            <Field data-invalid={errors.contactoTelefono ? true : undefined}>
              <FieldLabel>Teléfono del contacto</FieldLabel>
              <Input
                {...register('contactoTelefono')}
                placeholder="999 888 777"
                aria-invalid={!!errors.contactoTelefono}
              />
              <FieldError>{errors.contactoTelefono?.message}</FieldError>
            </Field>

            <Field data-invalid={errors.notas ? true : undefined} className="md:col-span-2">
              <FieldLabel>Notas</FieldLabel>
              <Textarea
                {...register('notas')}
                placeholder="Condiciones de pago, plazos de entrega, etc."
                rows={3}
                aria-invalid={!!errors.notas}
              />
              <FieldError>{errors.notas?.message}</FieldError>
            </Field>
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end pt-2">
          <Button type="submit" disabled={isLoading} className="min-w-36 gap-2">
            {isLoading
              ? <><Loader2 className="size-4 animate-spin" />{mode === 'create' ? 'Creando...' : 'Guardando...'}</>
              : mode === 'create' ? 'Crear proveedor' : 'Guardar cambios'
            }
          </Button>
        </div>

      </FieldGroup>
    </form>
  )
}
