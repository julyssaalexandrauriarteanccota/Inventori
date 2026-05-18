'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  useFieldArray,
  useForm,
  useWatch,
  type Resolver,
} from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  Building2,
  Loader2,
  Plus,
  ShoppingCart,
  Trash2,
  Warehouse,
} from 'lucide-react'
import {
  ordenCompraFormSchema,
  compraDirectaFormSchema,
  TipoProducto,
  type OrdenCompraFormPayload,
  type CompraDirectaFormPayload,
} from '@erp/shared'

import { useDebounce } from '@/hooks/use-debounce'
import { useProductos } from '@/hooks/use-productos'
import { useProveedores } from '@/hooks/use-proveedores'
import { useAlmacenes } from '@/hooks/use-inventario'
import {
  SearchableSelect,
  type SearchableSelectOption,
} from '@/components/searchable-select'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field'
import { DatePicker } from '@/components/ui/date-picker'

const IGV_RATE = 0.18

type Variant = 'orden' | 'directa'

interface OrdenCompraFormProps {
  variant?: Variant
  defaultValues?: Partial<OrdenCompraFormPayload & CompraDirectaFormPayload>
  onSubmit: (data: OrdenCompraFormPayload | CompraDirectaFormPayload) => void
  isLoading?: boolean
  mode: 'create' | 'edit'
}

function formatCurrency(amount: number) {
  return `S/ ${amount.toFixed(2)}`
}

export function OrdenCompraForm({
  variant = 'orden',
  defaultValues,
  onSubmit,
  isLoading = false,
  mode,
}: OrdenCompraFormProps) {
  const isDirecta = variant === 'directa'
  const schema = isDirecta ? compraDirectaFormSchema : ordenCompraFormSchema

  const baseDefaults = useMemo(
    () => ({
      proveedorId: '',
      almacenDestinoId: '',
      notas: '',
      detalles: [{ productoId: '', cantidad: 1, precioUnitario: 0 }],
      ...defaultValues,
    }),
    [defaultValues],
  )

  const {
    register,
    handleSubmit,
    setValue,
    control,
    clearErrors,
    formState: { errors },
  } = useForm<OrdenCompraFormPayload & { almacenDestinoId?: string }>({
    resolver: zodResolver(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      schema as any,
    ) as unknown as Resolver<
      OrdenCompraFormPayload & { almacenDestinoId?: string }
    >,
    defaultValues: baseDefaults,
  })

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'detalles',
  })

  const proveedorId = useWatch({ control, name: 'proveedorId' })
  const almacenDestinoId = useWatch({ control, name: 'almacenDestinoId' })
  const fechaEsperadaStr = useWatch({ control, name: 'fechaEsperada' })
  const detalles = useWatch({ control, name: 'detalles' })

  /* ── Proveedores (búsqueda con debounce) ── */
  const [proveedorSearch, setProveedorSearch] = useState('')
  const debouncedProvSearch = useDebounce(proveedorSearch, 250)

  const { data: proveedoresRes, isLoading: isLoadingProveedores } =
    useProveedores({
      page: 1,
      limit: 50,
      search: debouncedProvSearch || undefined,
      activo: true,
    })

  const proveedorOptions = useMemo<SearchableSelectOption[]>(
    () =>
      (proveedoresRes?.data ?? []).map((p) => ({
        value: p.id,
        label: `${p.razonSocial} — RUC ${p.ruc}`,
      })),
    [proveedoresRes],
  )

  /* ── Productos (búsqueda con debounce) ── */
  const [productoSearch, setProductoSearch] = useState('')
  const debouncedProdSearch = useDebounce(productoSearch, 250)

  const { data: productosRes, isLoading: isLoadingProductos } = useProductos({
    page: 1,
    limit: 50,
    search: debouncedProdSearch || undefined,
    activo: true,
    excluirTipos: [TipoProducto.SERVICIO],
  })

  const productoOptions = useMemo<SearchableSelectOption[]>(
    () =>
      (productosRes?.data ?? [])
        .filter((p) => p.manejaInventario && p.tipo !== TipoProducto.SERVICIO)
        .map((p) => ({
          value: p.id,
          label: `${p.sku} — ${p.nombre}`,
        })),
    [productosRes],
  )

  const productosById = useMemo(
    () => new Map((productosRes?.data ?? []).map((p) => [p.id, p])),
    [productosRes],
  )

  const selectedProductIds = useMemo(() => {
    const ids = new Set<string>()
    ;(detalles ?? []).forEach((d) => {
      if (d?.productoId) ids.add(d.productoId)
    })
    return ids
  }, [detalles])

  /* ── Almacenes (modo directa) ── */
  const { data: almacenesRes } = useAlmacenes()
  const almacenOptions = useMemo<SearchableSelectOption[]>(
    () =>
      (almacenesRes?.data ?? [])
        .filter((a) => a.activo)
        .map((a) => ({
          value: a.id,
          label: a.esPrincipal ? `${a.nombre} (principal)` : a.nombre,
        })),
    [almacenesRes],
  )

  // Pre-selección automática de almacén (principal o único)
  useEffect(() => {
    if (!isDirecta) return
    if (almacenDestinoId) return
    const activos = (almacenesRes?.data ?? []).filter((a) => a.activo)
    const preferido =
      activos.find((a) => a.esPrincipal) ??
      (activos.length === 1 ? activos[0] : undefined)
    if (preferido) {
      setValue('almacenDestinoId', preferido.id, {
        shouldDirty: false,
        shouldValidate: false,
      })
    }
  }, [almacenesRes, almacenDestinoId, isDirecta, setValue])

  /* ── Totales en vivo ── */
  const totales = useMemo(() => {
    const subtotal = (detalles ?? []).reduce((acc, d) => {
      const cant = Number(d?.cantidad ?? 0)
      const precio = Number(d?.precioUnitario ?? 0)
      if (!Number.isFinite(cant) || !Number.isFinite(precio)) return acc
      return acc + cant * precio
    }, 0)
    const igv = subtotal * IGV_RATE
    const total = subtotal + igv
    return { subtotal, igv, total }
  }, [detalles])

  /* ── Validación dedup productos ── */
  const productosDuplicados = useMemo(() => {
    const seen = new Map<string, number>()
    const dups = new Set<string>()
    ;(detalles ?? []).forEach((d) => {
      if (!d?.productoId) return
      const count = (seen.get(d.productoId) ?? 0) + 1
      seen.set(d.productoId, count)
      if (count > 1) dups.add(d.productoId)
    })
    return dups
  }, [detalles])

  const submit = handleSubmit((data) => {
    if (productosDuplicados.size > 0) return
    onSubmit(
      data as unknown as OrdenCompraFormPayload | CompraDirectaFormPayload,
    )
  })

  const detallesError = errors.detalles as
    | { message?: string; root?: { message?: string } }
    | undefined

  return (
    <form onSubmit={submit} noValidate>
      <FieldGroup className="gap-3 sm:gap-7">
        {/* === SECCIÓN 1: PROVEEDOR === */}
        <div className="rounded-xl border border-border/50 border-l-[3px] border-l-blue-400 dark:border-l-blue-800 bg-card p-4 sm:p-5">
          <div className="mb-4 flex items-center gap-2.5">
            <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-blue-100 text-[11px] font-bold text-blue-600 dark:bg-blue-900/40 dark:text-blue-400 ring-2 ring-blue-100 dark:ring-blue-900/30">
              1
            </span>
            <div className="flex size-6 shrink-0 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/40">
              <Building2 className="size-3.5 text-blue-600 dark:text-blue-400" />
            </div>
            <h3 className="text-sm font-semibold text-foreground">
              {isDirecta ? 'Proveedor y destino' : 'Proveedor y plazos'}
            </h3>
          </div>
          <div className="grid gap-4 sm:gap-6 md:grid-cols-2">
            <Field data-invalid={errors.proveedorId ? true : undefined}>
              <FieldLabel>Proveedor *</FieldLabel>
              <SearchableSelect
                value={proveedorId ?? ''}
                onChange={(value) => {
                  setValue('proveedorId', value, {
                    shouldDirty: true,
                    shouldValidate: true,
                  })
                  clearErrors('proveedorId')
                }}
                onSearchChange={setProveedorSearch}
                options={proveedorOptions}
                placeholder={
                  isLoadingProveedores
                    ? 'Cargando proveedores...'
                    : 'Seleccionar proveedor'
                }
                searchPlaceholder="Buscar por razón social o RUC"
                emptyLabel="No hay proveedores"
                ariaLabel="Seleccionar proveedor"
                invalid={!!errors.proveedorId}
                disabled={isLoadingProveedores && proveedorOptions.length === 0}
              />
              <FieldError>{errors.proveedorId?.message}</FieldError>
            </Field>

            {isDirecta ? (
              <Field
                data-invalid={errors.almacenDestinoId ? true : undefined}
              >
                <FieldLabel className="flex items-center gap-1.5">
                  <Warehouse className="size-3.5" /> Almacén destino *
                </FieldLabel>
                <SearchableSelect
                  value={almacenDestinoId ?? ''}
                  onChange={(value) => {
                    setValue('almacenDestinoId', value, {
                      shouldDirty: true,
                      shouldValidate: true,
                    })
                    clearErrors('almacenDestinoId')
                  }}
                  options={almacenOptions}
                  placeholder="Seleccionar almacén"
                  searchPlaceholder="Buscar almacén"
                  emptyLabel="No hay almacenes activos"
                  ariaLabel="Seleccionar almacén destino"
                  invalid={!!errors.almacenDestinoId}
                />
                <FieldError>{errors.almacenDestinoId?.message}</FieldError>
              </Field>
            ) : (
              <Field data-invalid={errors.fechaEsperada ? true : undefined}>
                <FieldLabel>Fecha esperada de entrega</FieldLabel>
                <DatePicker
                  value={fechaEsperadaStr}
                  onChange={(v) =>
                    setValue('fechaEsperada', v, {
                      shouldDirty: true,
                      shouldValidate: true,
                    })
                  }
                  placeholder="Seleccionar fecha de entrega"
                  aria-invalid={!!errors.fechaEsperada}
                />
                <FieldError>{errors.fechaEsperada?.message}</FieldError>
              </Field>
            )}

            <Field
              data-invalid={errors.notas ? true : undefined}
              className="md:col-span-2"
            >
              <FieldLabel>Notas</FieldLabel>
              <Textarea
                {...register('notas')}
                placeholder={
                  isDirecta
                    ? 'Observaciones de la compra (opcional)'
                    : 'Instrucciones de entrega, condiciones, etc.'
                }
                rows={3}
                aria-invalid={!!errors.notas}
              />
              <FieldError>{errors.notas?.message}</FieldError>
            </Field>
          </div>
        </div>

        {/* === SECCIÓN 2: PRODUCTOS === */}
        <div className="rounded-xl border border-border/50 border-l-[3px] border-l-green-400 dark:border-l-green-800 bg-card p-4 sm:p-5">
          <div className="mb-4 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-green-100 text-[11px] font-bold text-green-600 dark:bg-green-900/40 dark:text-green-400 ring-2 ring-green-100 dark:ring-green-900/30">
                2
              </span>
              <div className="flex size-6 shrink-0 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900/40">
                <ShoppingCart className="size-3.5 text-green-600 dark:text-green-400" />
              </div>
              <h3 className="text-sm font-semibold text-foreground">
                Productos
              </h3>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 rounded-lg text-xs"
              onClick={() =>
                append({ productoId: '', cantidad: 1, precioUnitario: 0 })
              }
            >
              <Plus className="size-3.5" />
              Agregar
            </Button>
          </div>

          <div className="flex flex-col gap-3">
            {fields.map((field, idx) => {
              const rowErrors = errors.detalles?.[idx]
              const productoIdRow = detalles?.[idx]?.productoId
              const isDup =
                !!productoIdRow && productosDuplicados.has(productoIdRow)
              const rowProductoOptions = productoOptions.filter(
                (option) =>
                  option.value === productoIdRow ||
                  !selectedProductIds.has(option.value),
              )
              return (
                <div
                  key={field.id}
                  className="rounded-lg border border-border/60 bg-background/40 p-3 sm:p-4"
                >
                  <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_8rem_12rem_2.5rem] md:items-start">
                    <Field
                      data-invalid={rowErrors?.productoId ? true : undefined}
                    >
                      <FieldLabel className="text-xs">Producto *</FieldLabel>
                      <SearchableSelect
                        value={productoIdRow ?? ''}
                        onChange={(value) => {
                          setValue(`detalles.${idx}.productoId`, value, {
                            shouldDirty: true,
                            shouldValidate: true,
                          })
                          clearErrors(`detalles.${idx}.productoId`)

                          const prod = productosById.get(value)
                          if (prod) {
                            const sugerido =
                              Number(prod.precioCompra ?? prod.precioVenta) ||
                              0
                            setValue(`detalles.${idx}.precioUnitario`, sugerido, {
                              shouldDirty: true,
                              shouldValidate: true,
                            })
                            clearErrors(`detalles.${idx}.precioUnitario`)
                          }
                        }}
                        onSearchChange={setProductoSearch}
                        options={rowProductoOptions}
                        placeholder={
                          isLoadingProductos
                            ? 'Cargando...'
                            : 'Seleccionar producto'
                        }
                        searchPlaceholder="Buscar por SKU o nombre"
                        emptyLabel="No hay productos disponibles"
                        ariaLabel={`Producto fila ${idx + 1}`}
                        invalid={!!rowErrors?.productoId || isDup}
                      />
                      <FieldError>
                        {rowErrors?.productoId?.message ||
                          (isDup ? 'Producto duplicado' : '')}
                      </FieldError>
                    </Field>

                    <Field
                      data-invalid={rowErrors?.cantidad ? true : undefined}
                    >
                      <FieldLabel className="text-xs">Cantidad *</FieldLabel>
                      <Input
                        {...register(`detalles.${idx}.cantidad`, {
                          valueAsNumber: true,
                        })}
                        type="number"
                        min={1}
                        placeholder="1"
                        aria-invalid={!!rowErrors?.cantidad}
                      />
                      <FieldError>{rowErrors?.cantidad?.message}</FieldError>
                    </Field>

                    <Field
                      data-invalid={
                        rowErrors?.precioUnitario ? true : undefined
                      }
                    >
                      <FieldLabel className="text-xs">P. unitario *</FieldLabel>
                      <Input
                        {...register(`detalles.${idx}.precioUnitario`, {
                          valueAsNumber: true,
                        })}
                        type="number"
                        min={0}
                        step="0.01"
                        placeholder="0.00"
                        aria-invalid={!!rowErrors?.precioUnitario}
                      />
                      <FieldError>
                        {rowErrors?.precioUnitario?.message}
                      </FieldError>
                    </Field>

                    <div className="flex md:justify-end md:pt-6">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-9 text-muted-foreground hover:text-destructive"
                        onClick={() => remove(idx)}
                        disabled={fields.length === 1}
                        aria-label="Eliminar fila"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="mt-2 flex justify-end">
                    <span className="text-[11px] tabular-nums text-muted-foreground">
                      Subtotal fila:{' '}
                      <span className="font-medium text-foreground">
                        {formatCurrency(
                          Number(detalles?.[idx]?.cantidad ?? 0) *
                            Number(detalles?.[idx]?.precioUnitario ?? 0),
                        )}
                      </span>
                    </span>
                  </div>
                </div>
              )
            })}
            {detallesError?.message ? (
              <p className="text-xs text-destructive">
                {detallesError.message}
              </p>
            ) : null}
          </div>
        </div>

        {/* === SECCIÓN 3: TOTALES === */}
        <div className="rounded-xl border border-border/50 bg-muted/30 p-4 sm:p-5">
          <div className="grid gap-1.5 text-sm sm:grid-cols-3">
            <div className="flex flex-col">
              <span className="text-xs text-muted-foreground">Subtotal</span>
              <span className="font-medium tabular-nums">
                {formatCurrency(totales.subtotal)}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-xs text-muted-foreground">IGV (18%)</span>
              <span className="font-medium tabular-nums">
                {formatCurrency(totales.igv)}
              </span>
            </div>
            <div className="flex flex-col sm:items-end">
              <span className="text-xs text-muted-foreground">Total</span>
              <span className="text-base font-semibold tabular-nums text-foreground">
                {formatCurrency(totales.total)}
              </span>
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end pt-2">
          <Button
            type="submit"
            disabled={isLoading || productosDuplicados.size > 0}
            className="min-w-36 gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                {mode === 'create' ? 'Procesando...' : 'Guardando...'}
              </>
            ) : isDirecta ? (
              'Registrar compra'
            ) : mode === 'create' ? (
              'Crear orden'
            ) : (
              'Guardar cambios'
            )}
          </Button>
        </div>
      </FieldGroup>
    </form>
  )
}
