'use client'

import { useMemo, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { CheckCircle2, Loader2, Mail, MapPin, User } from 'lucide-react'
import {
  type LocationPayload,
  clienteFormSchema,
  TipoCliente,
  type ClienteFormPayload,
} from '@erp/shared'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field'
import {
  DEFAULT_UBIGEO_SELECTION,
  getCanonicalUbigeoSelection,
  getDepartamentos,
  getDistritosByDepartamentoAndProvinciaName,
  getProvinciasByDepartamentoName,
} from '@/lib/ubigeo'
import { LocationPicker } from '@/components/location/location-picker'
import { SearchableSelect, type SearchableSelectOption } from '@/components/searchable-select'

interface ClienteFormProps {
  defaultValues?: Partial<ClienteFormPayload>
  onSubmit: (data: ClienteFormPayload) => void
  isLoading?: boolean
  mode: 'create' | 'edit'
}

export function ClienteForm({
  defaultValues,
  onSubmit,
  isLoading = false,
  mode,
}: ClienteFormProps) {
  const canonicalUbigeoDefaults = getCanonicalUbigeoSelection({
    departamento: defaultValues?.departamento,
    provincia: defaultValues?.provincia,
    distrito: defaultValues?.distrito,
  })

  const {
    register,
    handleSubmit,
    setValue,
    control,
    formState: { errors },
  } = useForm<ClienteFormPayload>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(clienteFormSchema) as any,
    defaultValues: {
      tipo: TipoCliente.NATURAL,
      activo: true,
      ...(mode === 'create' ? DEFAULT_UBIGEO_SELECTION : {}),
      ...defaultValues,
      ...canonicalUbigeoDefaults,
    },
  })

  const tipo = useWatch({ control, name: 'tipo' })
  const departamento = useWatch({ control, name: 'departamento' })
  const provincia = useWatch({ control, name: 'provincia' })
  const distrito = useWatch({ control, name: 'distrito' })
  const activo = useWatch({ control, name: 'activo' })
  const direccion = useWatch({ control, name: 'direccion' })
  const referencia = useWatch({ control, name: 'referencia' })
  const latitud = useWatch({ control, name: 'latitud' })
  const longitud = useWatch({ control, name: 'longitud' })
  const [showLocationTools, setShowLocationTools] = useState(
    () => defaultValues?.latitud != null && defaultValues?.longitud != null,
  )

  const departamentoOptions = useMemo<SearchableSelectOption[]>(
    () =>
      getDepartamentos().map((departamentoOption) => ({
        value: departamentoOption.name,
        label: departamentoOption.name,
      })),
    [],
  )

  const provinciaOptions = useMemo<SearchableSelectOption[]>(
    () =>
      getProvinciasByDepartamentoName(departamento).map((provinciaOption) => ({
        value: provinciaOption.name,
        label: provinciaOption.name,
      })),
    [departamento],
  )

  const distritoOptions = useMemo<SearchableSelectOption[]>(
    () =>
      getDistritosByDepartamentoAndProvinciaName(departamento, provincia).map((distritoOption) => ({
        value: distritoOption.name,
        label: distritoOption.name,
      })),
    [departamento, provincia],
  )

  function handleDepartamentoChange(nextDepartamento: string) {
    if (nextDepartamento === departamento) {
      return
    }

    setValue('departamento', nextDepartamento, { shouldDirty: true, shouldValidate: true })
    setValue('provincia', '', { shouldDirty: true, shouldValidate: true })
    setValue('distrito', '', { shouldDirty: true, shouldValidate: true })
  }

  function handleProvinciaChange(nextProvincia: string) {
    if (nextProvincia === provincia) {
      return
    }

    setValue('provincia', nextProvincia, { shouldDirty: true, shouldValidate: true })
    setValue('distrito', '', { shouldDirty: true, shouldValidate: true })
  }

  function handleDistritoChange(nextDistrito: string) {
    setValue('distrito', nextDistrito, { shouldDirty: true, shouldValidate: true })
  }

  function handleLocationChange(nextLocation: Partial<LocationPayload>) {
    if (nextLocation.direccion !== undefined) {
      setValue('direccion', nextLocation.direccion ?? '', {
        shouldDirty: true,
        shouldValidate: true,
      })
    }

    if (nextLocation.referencia !== undefined) {
      setValue('referencia', nextLocation.referencia ?? '', {
        shouldDirty: true,
        shouldValidate: true,
      })
    }

    if (nextLocation.latitud !== undefined) {
      setValue('latitud', nextLocation.latitud ?? null, {
        shouldDirty: true,
        shouldValidate: true,
      })
    }

    if (nextLocation.longitud !== undefined) {
      setValue('longitud', nextLocation.longitud ?? null, {
        shouldDirty: true,
        shouldValidate: true,
      })
    }

    const canonicalUbigeo = getCanonicalUbigeoSelection({
      departamento: nextLocation.departamento ?? departamento,
      provincia: nextLocation.provincia ?? provincia,
      distrito: nextLocation.distrito ?? distrito,
    })

    if (nextLocation.departamento !== undefined) {
      setValue(
        'departamento',
        canonicalUbigeo.departamento ?? nextLocation.departamento ?? '',
        {
          shouldDirty: true,
          shouldValidate: true,
        },
      )
    }

    if (nextLocation.provincia !== undefined) {
      setValue(
        'provincia',
        canonicalUbigeo.provincia ?? nextLocation.provincia ?? '',
        {
          shouldDirty: true,
          shouldValidate: true,
        },
      )
    }

    if (nextLocation.distrito !== undefined) {
      setValue(
        'distrito',
        canonicalUbigeo.distrito ?? nextLocation.distrito ?? '',
        {
          shouldDirty: true,
          shouldValidate: true,
        },
      )
    }
  }

  const locationValue = useMemo(
    () => ({
      direccion,
      referencia,
      departamento,
      provincia,
      distrito,
      latitud,
      longitud,
    }),
    [departamento, direccion, distrito, latitud, longitud, provincia, referencia],
  )

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <FieldGroup className="gap-3 sm:gap-7">
        {/* === SECCIÓN 1: IDENTIDAD === */}
        <div className="rounded-xl border border-border/50 border-l-[3px] border-l-blue-400 dark:border-l-blue-800 bg-card p-4 sm:p-5">
          <div className="mb-4 flex items-center gap-2.5">
            <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-blue-100 text-[11px] font-bold text-blue-600 dark:bg-blue-900/40 dark:text-blue-400 ring-2 ring-blue-100 dark:ring-blue-900/30">1</span>
            <div className="flex size-6 shrink-0 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/40">
              <User className="size-3.5 text-blue-600 dark:text-blue-400" />
            </div>
            <h3 className="text-sm font-semibold text-foreground">Identidad del cliente</h3>
          </div>
          <div className="grid gap-4 sm:gap-6 md:grid-cols-2">
            {mode === 'create' && (
              <Field data-invalid={errors.tipo ? true : undefined} className="md:col-span-2">
                <FieldLabel>Tipo de cliente</FieldLabel>
                <Select
                  value={tipo}
                  onValueChange={(v) =>
                    setValue('tipo', v as TipoCliente, { shouldValidate: true })
                  }
                >
                  <SelectTrigger aria-invalid={!!errors.tipo}>
                    <SelectValue placeholder="Seleccionar tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={TipoCliente.NATURAL}>Persona Natural</SelectItem>
                    <SelectItem value={TipoCliente.EMPRESA}>Empresa</SelectItem>
                  </SelectContent>
                </Select>
                <FieldError>{errors.tipo?.message}</FieldError>
              </Field>
            )}

            {tipo === TipoCliente.NATURAL ? (
              <>
                <Field data-invalid={errors.nombre ? true : undefined}>
                  <FieldLabel>Nombre *</FieldLabel>
                  <Input
                    {...register('nombre')}
                    placeholder="Nombres"
                    aria-invalid={!!errors.nombre}
                  />
                  <FieldError>{errors.nombre?.message}</FieldError>
                </Field>

                <Field data-invalid={errors.apellido ? true : undefined}>
                  <FieldLabel>Apellido *</FieldLabel>
                  <Input
                    {...register('apellido')}
                    placeholder="Apellidos completos"
                    aria-invalid={!!errors.apellido}
                  />
                  <FieldError>{errors.apellido?.message}</FieldError>
                </Field>

                <Field data-invalid={errors.dni ? true : undefined}>
                  <FieldLabel>DNI *</FieldLabel>
                  <Input
                    {...register('dni')}
                    placeholder="12345678"
                    maxLength={8}
                    aria-invalid={!!errors.dni}
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Se usa para boletas identificadas. El DNI 00000000 está reservado para Público en General.
                  </p>
                  <FieldError>{errors.dni?.message}</FieldError>
                </Field>
              </>
            ) : (
              <>
                <Field data-invalid={errors.razonSocial ? true : undefined} className="md:col-span-2">
                  <FieldLabel>Razón Social *</FieldLabel>
                  <Input
                    {...register('razonSocial')}
                    placeholder="Nombre legal de la empresa"
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
                  <p className="text-[11px] text-muted-foreground">
                    Necesario para factura electrónica. Se aceptan RUC que inician con 10 o 20.
                  </p>
                  <FieldError>{errors.ruc?.message}</FieldError>
                </Field>
              </>
            )}
          </div>
        </div>

        {/* === SECCIÓN 2: CONTACTO === */}
        <div className="rounded-xl border border-border/50 border-l-[3px] border-l-green-400 dark:border-l-green-800 bg-card p-4 sm:p-5">
          <div className="mb-4 flex items-center gap-2.5">
            <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-green-100 text-[11px] font-bold text-green-600 dark:bg-green-900/40 dark:text-green-400 ring-2 ring-green-100 dark:ring-green-900/30">2</span>
            <div className="flex size-6 shrink-0 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900/40">
              <Mail className="size-3.5 text-green-600 dark:text-green-400" />
            </div>
            <h3 className="text-sm font-semibold text-foreground">Datos de contacto</h3>
          </div>
          <div className="grid gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-3">
            <Field data-invalid={errors.email ? true : undefined}>
              <FieldLabel>Email</FieldLabel>
              <Input
                type="email"
                {...register('email')}
                placeholder="correo@ejemplo.com"
                aria-invalid={!!errors.email}
              />
              <FieldError>{errors.email?.message}</FieldError>
            </Field>

            <Field data-invalid={errors.celular ? true : undefined}>
              <FieldLabel>Celular principal</FieldLabel>
              <Input
                {...register('celular')}
                placeholder="987 654 321"
                aria-invalid={!!errors.celular}
              />
              <FieldError>{errors.celular?.message}</FieldError>
            </Field>

            <Field data-invalid={errors.telefono ? true : undefined}>
              <FieldLabel>Teléfono fijo (Opcional)</FieldLabel>
              <Input
                {...register('telefono')}
                placeholder="(01) 234-5678"
                aria-invalid={!!errors.telefono}
              />
              <FieldError>{errors.telefono?.message}</FieldError>
            </Field>
          </div>
        </div>

        {/* === SECCIÓN 3: UBICACIÓN === */}
        <div className="rounded-xl border border-border/50 border-l-[3px] border-l-orange-400 dark:border-l-orange-800 bg-card p-4 sm:p-5">
          <div className="mb-4 flex items-center gap-2.5">
            <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-orange-100 text-[11px] font-bold text-orange-600 dark:bg-orange-900/40 dark:text-orange-400 ring-2 ring-orange-100 dark:ring-orange-900/30">3</span>
            <div className="flex size-6 shrink-0 items-center justify-center rounded-lg bg-orange-100 dark:bg-orange-900/40">
              <MapPin className="size-3.5 text-orange-600 dark:text-orange-400" />
            </div>
            <h3 className="text-sm font-semibold text-foreground">Ubicación y notas</h3>
          </div>
          <div className="grid gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-3">
            <Field data-invalid={errors.direccion ? true : undefined} className="md:col-span-2 lg:col-span-3">
              <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <FieldLabel>Dirección exacta</FieldLabel>
                <div className="flex flex-wrap items-center gap-2">
                  {latitud != null && longitud != null ? (
                    <span className="rounded-full border border-orange-200 bg-orange-50 px-2.5 py-1 text-[11px] font-medium text-orange-700 dark:border-orange-900/50 dark:bg-orange-950/20 dark:text-orange-300">
                      {latitud.toFixed(5)}, {longitud.toFixed(5)}
                    </span>
                  ) : null}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 gap-2 text-xs"
                    onClick={() => setShowLocationTools((current) => !current)}
                  >
                    <MapPin className="size-3.5" />
                    {showLocationTools ? 'Ocultar mapa' : 'Mapa y coordenadas'}
                  </Button>
                </div>
              </div>
              <Input
                {...register('direccion')}
                placeholder="Av. Principal 123, Of. 401"
                aria-invalid={!!errors.direccion}
              />
              <FieldError>{errors.direccion?.message}</FieldError>
            </Field>

            {showLocationTools ? (
              <div className="md:col-span-2 lg:col-span-3">
                <LocationPicker
                  value={locationValue}
                  onChange={handleLocationChange}
                  disabled={isLoading}
                />
              </div>
            ) : null}

            <Field data-invalid={errors.departamento ? true : undefined}>
              <FieldLabel>Departamento</FieldLabel>
              <SearchableSelect
                value={departamento}
                onChange={handleDepartamentoChange}
                options={departamentoOptions}
                placeholder="Seleccionar departamento"
                searchPlaceholder="Buscar departamento..."
                emptyLabel="No se encontraron departamentos."
                ariaLabel="Departamento"
                invalid={!!errors.departamento}
                clearable
                clearLabel="Limpiar departamento"
              />
              <FieldError>{errors.departamento?.message}</FieldError>
            </Field>

            <Field data-invalid={errors.provincia ? true : undefined}>
              <FieldLabel>Provincia</FieldLabel>
              <SearchableSelect
                value={provincia}
                onChange={handleProvinciaChange}
                options={provinciaOptions}
                placeholder="Seleccionar provincia"
                searchPlaceholder="Buscar provincia..."
                emptyLabel="No se encontraron provincias."
                ariaLabel="Provincia"
                disabled={!departamento}
                invalid={!!errors.provincia}
                clearable
                clearLabel="Limpiar provincia"
              />
              <FieldError>{errors.provincia?.message}</FieldError>
            </Field>

            <Field data-invalid={errors.distrito ? true : undefined}>
              <FieldLabel>Distrito</FieldLabel>
              <SearchableSelect
                value={distrito}
                onChange={handleDistritoChange}
                options={distritoOptions}
                placeholder="Seleccionar distrito"
                searchPlaceholder="Buscar distrito..."
                emptyLabel="No se encontraron distritos."
                ariaLabel="Distrito"
                disabled={!provincia}
                invalid={!!errors.distrito}
                clearable
                clearLabel="Limpiar distrito"
              />
              <FieldError>{errors.distrito?.message}</FieldError>
            </Field>

            <Field data-invalid={errors.referencia ? true : undefined} className="md:col-span-2 lg:col-span-3">
              <FieldLabel>Referencia de llegada (Opcional)</FieldLabel>
              <Input
                {...register('referencia')}
                placeholder="Cerca de..."
                aria-invalid={!!errors.referencia}
              />
              <FieldError>{errors.referencia?.message}</FieldError>
            </Field>

            <Field data-invalid={errors.notas ? true : undefined} className="md:col-span-2 lg:col-span-3">
              <FieldLabel>Notas internas</FieldLabel>
              <Textarea
                {...register('notas')}
                placeholder="Observaciones adicionales sobre el cliente"
                rows={2}
                aria-invalid={!!errors.notas}
                className="resize-none"
              />
              <FieldError>{errors.notas?.message}</FieldError>
            </Field>
          </div>
        </div>

        {/* === SECCIÓN 4: ESTADO === */}
        <div className="rounded-xl border border-border/50 border-l-[3px] border-l-emerald-400 dark:border-l-emerald-800 bg-card p-4 sm:p-5">
          <div className="mb-4 flex items-center gap-2.5">
            <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-[11px] font-bold text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400 ring-2 ring-emerald-100 dark:ring-emerald-900/30">4</span>
            <div className="flex size-6 shrink-0 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900/40">
              <CheckCircle2 className="size-3.5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <h3 className="text-sm font-semibold text-foreground">Estado comercial</h3>
          </div>
          <div className="flex flex-col gap-3 rounded-xl border border-border/50 bg-background/50 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium">Cliente activo</p>
              <p className="text-xs text-muted-foreground">
                Los clientes inactivos se conservan para historial, pero no deberían usarse en nuevas ventas.
              </p>
            </div>
            <Switch
              checked={activo ?? true}
              onCheckedChange={(checked) =>
                setValue('activo', checked, {
                  shouldDirty: true,
                  shouldValidate: true,
                })
              }
              aria-label="Cliente activo"
              disabled={isLoading}
            />
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <Button type="submit" disabled={isLoading} className="min-w-36 gap-2">
            {isLoading
              ? <><Loader2 className="size-4 animate-spin" />{mode === 'create' ? 'Creando...' : 'Guardando...'}</>
              : mode === 'create' ? 'Crear cliente' : 'Guardar cambios'
            }
          </Button>
        </div>
      </FieldGroup>
    </form>
  )
}
