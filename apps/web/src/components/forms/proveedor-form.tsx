'use client'

import { useMemo, useState } from 'react'
import {
  type FieldPath,
  type FieldPathValue,
  useForm,
  useWatch,
} from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  CheckCircle2,
  Loader2,
  Mail,
  MapPin,
  Building2,
  Phone,
  Hash,
  Smartphone,
  Landmark,
  FileText,
  Navigation,
  Search,
  Truck,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  type ConsultaDocumentoClientePayload,
  type LocationPayload,
  proveedorFormSchema,
  type ProveedorFormPayload,
} from '@erp/shared'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import {
  Field,
  FieldDescription,
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
  findUbigeoByCode,
  findUbigeoCodeBySelection,
} from '@/lib/ubigeo'
import { LocationPicker } from '@/components/location/location-picker'
import { SearchableSelect, type SearchableSelectOption } from '@/components/searchable-select'
import { useConsultarDocumentoProveedor } from '@/hooks/use-proveedores'

interface ProveedorFormProps {
  defaultValues?: Partial<ProveedorFormPayload>
  onSubmit: (data: ProveedorFormPayload) => void
  isLoading?: boolean
  mode: 'create' | 'edit'
}

function proveedorLabel(proveedor?: string | null) {
  if (proveedor === 'SUNAT_PADRON_LOCAL') return 'Padrón SUNAT local'
  if (proveedor === 'DECOLECTA') return 'DECOLECTA'
  if (proveedor === 'APISPERU') return 'APISPERU'
  if (proveedor === 'MANUAL') return 'registro manual'
  return 'validación guardada'
}

function formatValidationDate(value?: string | null) {
  if (!value) return null
  return new Intl.DateTimeFormat('es-PE', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

export function ProveedorForm({
  defaultValues,
  onSubmit,
  isLoading = false,
  mode,
}: ProveedorFormProps) {
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
  } = useForm<ProveedorFormPayload>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(proveedorFormSchema) as any,
    defaultValues: {
      activo: true,
      ...(mode === 'create' ? DEFAULT_UBIGEO_SELECTION : {}),
      ...defaultValues,
      ...canonicalUbigeoDefaults,
    },
  })

  const departamento = useWatch({ control, name: 'departamento' })
  const provincia = useWatch({ control, name: 'provincia' })
  const distrito = useWatch({ control, name: 'distrito' })
  const ruc = useWatch({ control, name: 'ruc' })
  const telefono = useWatch({ control, name: 'telefono' })
  const activo = useWatch({ control, name: 'activo' })
  const direccion = useWatch({ control, name: 'direccion' })
  const referencia = useWatch({ control, name: 'referencia' })
  const latitud = useWatch({ control, name: 'latitud' })
  const longitud = useWatch({ control, name: 'longitud' })
  const [showLocationTools, setShowLocationTools] = useState(
    () => defaultValues?.latitud != null && defaultValues?.longitud != null,
  )
  const [documentoLookupMeta, setDocumentoLookupMeta] = useState<{
    proveedor: string
    direccionFiscal?: string
    departamentoFiscal?: string
    provinciaFiscal?: string
    distritoFiscal?: string
    ubigeo?: string
    estado?: string
    condicion?: string
    nombreComercial?: string
    telefonos?: string[]
    capital?: string
    codVerifica?: string
    ultimaValidacionAt?: string | null
  } | null>(null)
  const [externalLookupRuc, setExternalLookupRuc] = useState<string | null>(null)
  const consultarDocumento = useConsultarDocumentoProveedor()

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
    if (nextDepartamento === departamento) return
    setValue('departamento', nextDepartamento, { shouldDirty: true, shouldValidate: true })
    setValue('provincia', '', { shouldDirty: true, shouldValidate: true })
    setValue('distrito', '', { shouldDirty: true, shouldValidate: true })
  }

  function handleProvinciaChange(nextProvincia: string) {
    if (nextProvincia === provincia) return
    setValue('provincia', nextProvincia, { shouldDirty: true, shouldValidate: true })
    setValue('distrito', '', { shouldDirty: true, shouldValidate: true })
  }

  function handleDistritoChange(nextDistrito: string) {
    setValue('distrito', nextDistrito, { shouldDirty: true, shouldValidate: true })
  }

  function handleLocationChange(nextLocation: Partial<LocationPayload>) {
    if (nextLocation.direccion !== undefined) {
      setValue('direccion', nextLocation.direccion ?? '', { shouldDirty: true, shouldValidate: true })
    }
    if (nextLocation.referencia !== undefined) {
      setValue('referencia', nextLocation.referencia ?? '', { shouldDirty: true, shouldValidate: true })
    }
    if (nextLocation.latitud !== undefined) {
      setValue('latitud', nextLocation.latitud ?? null, { shouldDirty: true, shouldValidate: true })
    }
    if (nextLocation.longitud !== undefined) {
      setValue('longitud', nextLocation.longitud ?? null, { shouldDirty: true, shouldValidate: true })
    }

    const canonicalUbigeo = getCanonicalUbigeoSelection({
      departamento: nextLocation.departamento ?? departamento,
      provincia: nextLocation.provincia ?? provincia,
      distrito: nextLocation.distrito ?? distrito,
    })

    if (nextLocation.departamento !== undefined) {
      setValue('departamento', canonicalUbigeo.departamento ?? nextLocation.departamento ?? '', { shouldDirty: true, shouldValidate: true })
    }
    if (nextLocation.provincia !== undefined) {
      setValue('provincia', canonicalUbigeo.provincia ?? nextLocation.provincia ?? '', { shouldDirty: true, shouldValidate: true })
    }
    if (nextLocation.distrito !== undefined) {
      setValue('distrito', canonicalUbigeo.distrito ?? nextLocation.distrito ?? '', { shouldDirty: true, shouldValidate: true })
    }
  }

  function setFormValue<K extends FieldPath<ProveedorFormPayload>>(
    field: K,
    value: FieldPathValue<ProveedorFormPayload, K>,
  ) {
    setValue(field, value, { shouldDirty: true, shouldValidate: true })
  }

  function handleConsultarDocumento(
    modo: ConsultaDocumentoClientePayload['modo'] = 'AUTO',
  ) {
    const numeroDocumento = String(ruc ?? '').replace(/\D/g, '')
    const tipoDocumento = 'RUC'

    consultarDocumento.mutate(
      { tipoDocumento, numeroDocumento, modo },
      {
        onSuccess: (response) => {
          const data = response.data
          setExternalLookupRuc(null)

          if (data.razonSocial) {
            setFormValue('razonSocial', data.razonSocial)
          }
          const telefonoPrincipal = data.telefonos?.find(Boolean)
          if (telefonoPrincipal && !telefono) {
            setFormValue('telefono', telefonoPrincipal)
          }

          if (data.direccion && !direccion?.trim()) {
            setFormValue('direccion', data.direccion)
          }

          const ubigeoFromCode = findUbigeoByCode(data.ubigeo)
          const canonicalUbigeo = getCanonicalUbigeoSelection({
            departamento: data.departamento,
            provincia: data.provincia,
            distrito: data.distrito,
          })
          const resolvedUbigeo = {
            departamento: canonicalUbigeo.departamento ?? ubigeoFromCode?.departamento ?? data.departamento,
            provincia: canonicalUbigeo.provincia ?? ubigeoFromCode?.provincia ?? data.provincia,
            distrito: canonicalUbigeo.distrito ?? ubigeoFromCode?.distrito ?? data.distrito,
          }

          if (resolvedUbigeo.departamento) {
            setFormValue('departamento', resolvedUbigeo.departamento)
          }
          if (resolvedUbigeo.provincia) {
            setFormValue('provincia', resolvedUbigeo.provincia)
          }
          if (resolvedUbigeo.distrito) {
            setFormValue('distrito', resolvedUbigeo.distrito)
          }
          setFormValue('ruc', data.numeroDocumento)

          setDocumentoLookupMeta({
            proveedor: proveedorLabel(data.proveedor),
            direccionFiscal: data.direccion,
            departamentoFiscal: data.departamento,
            provinciaFiscal: data.provincia,
            distritoFiscal: data.distrito,
            ubigeo: data.ubigeo,
            estado: data.estado,
            condicion: data.condicionDomicilio,
            nombreComercial: data.nombreComercial,
            telefonos: data.telefonos,
            capital: data.capital,
            codVerifica: data.codVerifica,
            ultimaValidacionAt: data.consultadoAt,
          })

          toast.success(
            mode === 'edit'
              ? `Datos de ${proveedorLabel(data.proveedor)} aplicados. Guarda el proveedor para confirmar cambios.`
              : `Datos de ${proveedorLabel(data.proveedor)} aplicados al formulario.`,
          )
        },
        onError: (err: Error) => {
          if (modo === 'LOCAL_ONLY') {
            setExternalLookupRuc(numeroDocumento)
            toast.error(
              err.message ||
                'RUC no encontrado en el padrón local. Puedes consultar una API externa.',
            )
            return
          }
          toast.error(err.message || 'No se pudo consultar el documento.')
        },
      },
    )
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
  const operationalUbigeoCode = useMemo(
    () =>
      findUbigeoCodeBySelection({
        departamento,
        provincia,
        distrito,
      }) ?? documentoLookupMeta?.ubigeo ?? '',
    [departamento, distrito, documentoLookupMeta?.ubigeo, provincia],
  )

  const rucConsultaReady = /^(10|20)\d{9}$/.test(String(ruc ?? ''))
  const canConsultarApiExterna =
    rucConsultaReady &&
    externalLookupRuc === String(ruc ?? '').replace(/\D/g, '')

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <FieldGroup className="gap-5 sm:gap-7">
        <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50/70 dark:border-rose-500/30 dark:bg-rose-500/10 px-4 py-2.5">
          <FileText className="size-4 text-rose-600 dark:text-rose-400" />
          <p className="text-xs text-foreground/80">
            Los campos marcados con <span className="font-semibold text-rose-600 dark:text-rose-400">*</span> son obligatorios.
          </p>
        </div>

        {/* === SECCIÓN 1: IDENTIDAD FISCAL === */}
        <div className="rounded-2xl border border-border/60 border-l-4 border-l-sky-500 bg-card/85 backdrop-blur-sm p-4 sm:p-6 shadow-sm transition-shadow duration-200 hover:shadow-md">
          <div className="mb-5 flex items-center gap-3">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-sky-500 text-xs font-bold text-white shadow-sm shadow-sky-500/30">1</span>
            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-sky-500 text-white shadow-sm shadow-sky-500/30">
              <Building2 className="size-4" />
            </div>
            <div>
              <h3 className="text-sm font-sans font-semibold text-foreground">Identidad fiscal</h3>
              <p className="text-[11px] text-muted-foreground">RUC y razón social del proveedor</p>
            </div>
          </div>
          <div className="grid gap-5 sm:gap-6 md:grid-cols-2">
            <Field data-invalid={errors.ruc ? true : undefined} className="md:col-span-2">
              <FieldLabel>RUC <span className="text-[var(--semantic-danger)]">*</span></FieldLabel>
              <div className="flex gap-2">
                <Input
                  {...register('ruc', {
                    onChange: (e) => {
                      e.target.value = e.target.value.replace(/\D/g, '')
                      setExternalLookupRuc(null)
                    }
                  })}
                  placeholder="20123456789"
                  maxLength={11}
                  aria-invalid={!!errors.ruc}
                  startIcon={Hash}
                />
                <Button
                  type="button"
                  variant="outline"
                  className="shrink-0 gap-2"
                  disabled={!rucConsultaReady || consultarDocumento.isPending}
                  onClick={() => handleConsultarDocumento('LOCAL_ONLY')}
                  aria-label="Buscar RUC en padrón SUNAT local"
                >
                  {consultarDocumento.isPending ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Search className="size-4" />
                  )}
                  <span className="hidden sm:inline">Padrón</span>
                </Button>
                {canConsultarApiExterna ? (
                  <Button
                    type="button"
                    variant="secondary"
                    className="shrink-0 gap-2"
                    disabled={consultarDocumento.isPending}
                    onClick={() => handleConsultarDocumento('EXTERNAL_ONLY')}
                    aria-label="Consultar RUC en API externa"
                  >
                    {consultarDocumento.isPending ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Search className="size-4" />
                    )}
                    <span className="hidden sm:inline">API externa</span>
                  </Button>
                ) : null}
              </div>
              <FieldDescription>
                <Landmark className="inline size-3 -mt-0.5" /> Se aceptan RUC que inician con 10 o 20.
                Primero busca en el padrón local SUNAT; si no existe, se habilita la consulta por API externa.
              </FieldDescription>
              <FieldError>{errors.ruc?.message}</FieldError>
            </Field>

            <Field data-invalid={errors.razonSocial ? true : undefined} className="md:col-span-2">
              <FieldLabel>Razón Social <span className="text-[var(--semantic-danger)]">*</span></FieldLabel>
              <Input
                {...register('razonSocial')}
                placeholder="Ej: Distribuciones Generales S.A.C."
                aria-invalid={!!errors.razonSocial}
                startIcon={Building2}
              />
              <FieldError>{errors.razonSocial?.message}</FieldError>
            </Field>

            {documentoLookupMeta && (
              <div className="md:col-span-2 rounded-xl border border-[var(--accent)]/20 bg-[var(--accent-soft)]/45 px-3.5 py-3 text-xs text-muted-foreground">
                <div className="flex flex-col gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <CheckCircle2 className="size-4 text-[var(--accent)]" />
                    <span className="font-medium text-foreground">
                      Datos fiscales consultados con {documentoLookupMeta.proveedor}
                    </span>
                    {documentoLookupMeta.estado && (
                      <span>Estado: {documentoLookupMeta.estado}</span>
                    )}
                    {documentoLookupMeta.condicion && (
                      <span>Condición: {documentoLookupMeta.condicion}</span>
                    )}
                    {documentoLookupMeta.ultimaValidacionAt && (
                      <span>
                        Validado: {formatValidationDate(documentoLookupMeta.ultimaValidacionAt)}
                      </span>
                    )}
                  </div>
                  {documentoLookupMeta.direccionFiscal && (
                    <div className="rounded-lg border border-border/50 bg-background/55 px-3 py-2">
                      <p className="font-medium text-foreground">Dirección fiscal SUNAT</p>
                      <p>{documentoLookupMeta.direccionFiscal}</p>
                      <p className="mt-1">
                        {[
                          documentoLookupMeta.distritoFiscal,
                          documentoLookupMeta.provinciaFiscal,
                          documentoLookupMeta.departamentoFiscal,
                        ]
                          .filter(Boolean)
                          .join(' / ') || 'Ubigeo no informado'}
                        {documentoLookupMeta.ubigeo
                          ? ` · Ubigeo ${documentoLookupMeta.ubigeo}`
                          : ''}
                      </p>
                    </div>
                  )}
                  <p>
                    La dirección fiscal queda registrada para referencia.
                    La ubicación operativa de abajo es independiente y sirve para
                    despachos y coordenadas.
                  </p>
                </div>
                {(documentoLookupMeta.nombreComercial ||
                  documentoLookupMeta.telefonos?.length ||
                  documentoLookupMeta.capital ||
                  documentoLookupMeta.codVerifica) && (
                  <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1">
                    {documentoLookupMeta.nombreComercial && (
                      <span>
                        Nombre comercial: {documentoLookupMeta.nombreComercial}
                      </span>
                    )}
                    {documentoLookupMeta.telefonos?.length ? (
                      <span>
                        Teléfonos: {documentoLookupMeta.telefonos.join(', ')}
                      </span>
                    ) : null}
                    {documentoLookupMeta.capital && (
                      <span>Capital: {documentoLookupMeta.capital}</span>
                    )}
                    {documentoLookupMeta.codVerifica && (
                      <span>Código verificador: {documentoLookupMeta.codVerifica}</span>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* === SECCIÓN 2: CONTACTO === */}
        <div className="rounded-2xl border border-border/60 border-l-4 border-l-emerald-500 bg-card/85 backdrop-blur-sm p-4 sm:p-6 shadow-sm transition-shadow duration-200 hover:shadow-md">
          <div className="mb-5 flex items-center gap-3">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-xs font-bold text-white shadow-sm shadow-emerald-500/30">2</span>
            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500 text-white shadow-sm shadow-emerald-500/30">
              <Mail className="size-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold font-sans text-foreground">Datos de contacto</h3>
              <p className="text-[11px] text-muted-foreground">Todos los campos de contacto son opcionales</p>
            </div>
          </div>
          <div className="grid gap-5 sm:gap-6 md:grid-cols-2 lg:grid-cols-3">
            <Field data-invalid={errors.email ? true : undefined}>
              <FieldLabel>
                <Mail className="inline size-3.5 -mt-0.5 text-muted-foreground/60" /> Email
              </FieldLabel>
              <Input
                type="email"
                {...register('email', {
                  setValueAs: (value) => {
                    if (typeof value !== 'string') return value
                    const trimmed = value.trim()
                    return trimmed.length > 0 ? trimmed : undefined
                  },
                })}
                placeholder="proveedor@empresa.com"
                aria-invalid={!!errors.email}
                startIcon={Mail}
              />
              <FieldDescription>Para envío de órdenes de compra y coordinación.</FieldDescription>
              <FieldError>{errors.email?.message}</FieldError>
            </Field>

            <Field data-invalid={errors.celular ? true : undefined}>
              <FieldLabel>
                <Smartphone className="inline size-3.5 -mt-0.5 text-muted-foreground/60" /> Celular principal
              </FieldLabel>
              <Input
                {...register('celular')}
                placeholder="987 654 321"
                aria-invalid={!!errors.celular}
                startIcon={Phone}
              />
              <FieldDescription>Número de WhatsApp o contacto directo.</FieldDescription>
              <FieldError>{errors.celular?.message}</FieldError>
            </Field>

            <Field data-invalid={errors.telefono ? true : undefined}>
              <FieldLabel>
                <Phone className="inline size-3.5 -mt-0.5 text-muted-foreground/60" /> Teléfono fijo
                <span className="ml-1.5 rounded-full border border-border/60 bg-muted/50 px-1.5 py-0.5 text-[10px] font-normal text-muted-foreground">Opcional</span>
              </FieldLabel>
              <Input
                {...register('telefono')}
                placeholder="(01) 234-5678"
                aria-invalid={!!errors.telefono}
                startIcon={Phone}
              />
              <FieldError>{errors.telefono?.message}</FieldError>
            </Field>

            <Field data-invalid={errors.contactoNombre ? true : undefined}>
              <FieldLabel>Nombre del contacto</FieldLabel>
              <Input
                {...register('contactoNombre')}
                placeholder="Pedro Quispe"
                aria-invalid={!!errors.contactoNombre}
              />
              <FieldDescription>Persona de referencia dentro del proveedor.</FieldDescription>
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
          </div>
        </div>

        {/* === SECCIÓN 3: UBICACIÓN === */}
        <div className="rounded-2xl border border-border/60 border-l-4 border-l-amber-500 bg-card/85 backdrop-blur-sm p-4 sm:p-6 shadow-sm transition-shadow duration-200 hover:shadow-md">
          <div className="mb-5 flex items-center gap-3">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-amber-500 text-xs font-bold text-white shadow-sm shadow-amber-500/30">3</span>
            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-amber-500 text-white shadow-sm shadow-amber-500/30">
              <MapPin className="size-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold font-sans text-foreground">Ubicación operativa</h3>
              <p className="text-[11px] text-muted-foreground">Dirección para despachos, visitas y coordenadas</p>
            </div>
          </div>
          <div className="grid gap-5 sm:gap-6 md:grid-cols-2 lg:grid-cols-3">
            <Field data-invalid={errors.direccion ? true : undefined} className="md:col-span-2 lg:col-span-3">
              <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <FieldLabel>
                  <Navigation className="inline size-3.5 -mt-0.5 text-muted-foreground/60" /> Dirección operativa
                </FieldLabel>
                <div className="flex flex-wrap items-center gap-2">
                  {latitud != null && longitud != null ? (
                    <span className="rounded-full border border-emerald-500/20 bg-emerald-50 px-2.5 py-1 text-[11px] font-medium text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400">
                      📍 {latitud.toFixed(5)}, {longitud.toFixed(5)}
                    </span>
                  ) : null}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 gap-1.5 text-xs rounded-lg transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:scale-[1.02] active:scale-95 active:duration-150"
                    onClick={() => setShowLocationTools((current) => !current)}
                  >
                    <MapPin className="size-3.5" />
                    {showLocationTools ? 'Ocultar mapa' : 'Mapa y coordenadas'}
                  </Button>
                </div>
              </div>
              <Input
                {...register('direccion')}
                placeholder="Av. Industrial 456, Zona Industrial"
                aria-invalid={!!errors.direccion}
                startIcon={MapPin}
              />
              <FieldDescription>
                Usa esta dirección para despachos o visitas. La dirección fiscal
                validada puede usarse como punto de partida.
              </FieldDescription>
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

            <Field className="md:col-span-2 lg:col-span-3">
              <FieldLabel>Ubigeo</FieldLabel>
              <Input
                value={operationalUbigeoCode}
                readOnly
                aria-label="Ubigeo operativo"
                placeholder="Se completa al seleccionar distrito o consultar RUC"
                startIcon={Hash}
              />
              <FieldDescription>
                Código de ubicación operativo derivado de los desplegables.
              </FieldDescription>
            </Field>

            <Field data-invalid={errors.referencia ? true : undefined} className="md:col-span-2 lg:col-span-3">
              <FieldLabel>
                Referencia de llegada
                <span className="ml-1.5 rounded-full border border-border/60 bg-muted/50 px-1.5 py-0.5 text-[10px] font-normal text-muted-foreground">Opcional</span>
              </FieldLabel>
              <Input
                {...register('referencia')}
                placeholder="Ej: A dos cuadras del parque central, frente a la farmacia"
                aria-invalid={!!errors.referencia}
                startIcon={Navigation}
              />
              <FieldError>{errors.referencia?.message}</FieldError>
            </Field>

            <Field data-invalid={errors.notas ? true : undefined} className="md:col-span-2 lg:col-span-3">
              <FieldLabel>
                <FileText className="inline size-3.5 -mt-0.5 text-muted-foreground/60" /> Notas internas
                <span className="ml-1.5 rounded-full border border-border/60 bg-muted/50 px-1.5 py-0.5 text-[10px] font-normal text-muted-foreground">Opcional</span>
              </FieldLabel>
              <Textarea
                {...register('notas')}
                placeholder="Condiciones de pago, plazos de entrega, etc."
                rows={3}
                aria-invalid={!!errors.notas}
                className="resize-none rounded-xl"
              />
              <FieldDescription>Solo visible internamente. No aparece en documentos del proveedor.</FieldDescription>
              <FieldError>{errors.notas?.message}</FieldError>
            </Field>
          </div>
        </div>

        {/* === SECCIÓN 4: ESTADO === */}
        <div className="rounded-2xl border border-border/60 border-l-4 border-l-violet-500 bg-card/85 backdrop-blur-sm p-4 sm:p-6 shadow-sm transition-shadow duration-200 hover:shadow-md">
          <div className="mb-5 flex items-center gap-3">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-violet-500 text-xs font-bold text-white shadow-sm shadow-violet-500/30">4</span>
            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-violet-500 text-white shadow-sm shadow-violet-500/30">
              <CheckCircle2 className="size-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold font-sans text-foreground">Estado comercial</h3>
              <p className="text-[11px] text-muted-foreground">Controla la visibilidad del proveedor en el sistema</p>
            </div>
          </div>
          <div className="flex flex-col gap-3 rounded-xl border border-border/50 bg-background/50 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <p className="flex items-center gap-2 text-sm font-medium">
                <CheckCircle2 className={`size-4 ${activo ? 'text-emerald-500' : 'text-muted-foreground/40'} transition-colors`} />
                Proveedor activo
              </p>
              <p className="text-xs text-muted-foreground pl-6">
                Los proveedores inactivos se conservan para historial, pero no aparecerán en nuevas compras.
              </p>
            </div>
            <Switch
              checked={activo ?? true}
              onCheckedChange={(checked) =>
                setValue('activo', checked, { shouldDirty: true, shouldValidate: true })
              }
              aria-label="Proveedor activo"
              disabled={isLoading}
              className="transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:scale-105 active:scale-95 active:duration-150"
            />
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <Button type="submit" disabled={isLoading} className="min-w-40 h-11 px-6 gap-2 rounded-xl text-sm font-medium shadow-md transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:scale-[1.02] hover:shadow-lg active:scale-95 active:duration-150">
            {isLoading
              ? <><Loader2 className="size-4 animate-spin" />{mode === 'create' ? 'Creando...' : 'Guardando...'}</>
              : <>{mode === 'create' ? <><Truck className="size-4" /> Crear proveedor</> : <><CheckCircle2 className="size-4" /> Guardar cambios</>}</>
            }
          </Button>
        </div>
      </FieldGroup>
    </form>
  )
}
