import departamentosData from '@/data/ubigeo/departamentos.json'
import provinciasData from '@/data/ubigeo/provincias.json'
import distritosData from '@/data/ubigeo/distritos.json'

type SourceDepartamento = {
  id: number
  departamento: string
  ubigeo: string
}

type SourceProvincia = {
  id: number
  provincia: string
  ubigeo: string
  departamento_id: number
}

type SourceDistrito = {
  id: number
  distrito: string
  ubigeo: string
  provincia_id: number
  departamento_id: number
}

type DepartamentosFile = {
  ubigeo_departamentos: SourceDepartamento[]
}

type ProvinciasFile = {
  ubigeo_provincias: SourceProvincia[]
}

type DistritosFile = {
  ubigeo_distritos: SourceDistrito[]
}

export type UbigeoOption = {
  id: number
  code: string
  name: string
}

type UbigeoProvince = UbigeoOption & {
  departmentId: number
}

type UbigeoDistrict = UbigeoOption & {
  departmentId: number
  provinceId: number
}

type UbigeoSelection = {
  departamento?: string
  provincia?: string
  distrito?: string
}

const LOWERCASE_CONNECTORS = new Set(['de', 'del', 'la', 'las', 'los', 'y', 'e'])

function normalizeLookup(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLocaleLowerCase('es-PE')
}

function capitalizeWord(word: string, index: number) {
  const lower = word.toLocaleLowerCase('es-PE')

  if (index > 0 && LOWERCASE_CONNECTORS.has(lower)) {
    return lower
  }

  return lower.charAt(0).toLocaleUpperCase('es-PE') + lower.slice(1)
}

function formatUbigeoName(rawValue: string) {
  return rawValue
    .trim()
    .split(/\s+/)
    .map((word, index) =>
      word
        .split('-')
        .map((part, partIndex) => capitalizeWord(part, index + partIndex))
        .join('-'),
    )
    .join(' ')
}

const departamentosSource = (departamentosData as DepartamentosFile).ubigeo_departamentos
const provinciasSource = (provinciasData as ProvinciasFile).ubigeo_provincias
const distritosSource = (distritosData as DistritosFile).ubigeo_distritos

const departamentos: UbigeoOption[] = departamentosSource
  .map((departamento) => ({
    id: departamento.id,
    code: departamento.ubigeo,
    name: formatUbigeoName(departamento.departamento),
  }))
  .sort((left, right) => left.name.localeCompare(right.name, 'es-PE'))

const provincias: UbigeoProvince[] = provinciasSource
  .map((provincia) => ({
    id: provincia.id,
    code: provincia.ubigeo,
    departmentId: provincia.departamento_id,
    name: formatUbigeoName(provincia.provincia),
  }))
  .sort((left, right) => left.name.localeCompare(right.name, 'es-PE'))

const distritos: UbigeoDistrict[] = distritosSource
  .map((distrito) => ({
    id: distrito.id,
    code: distrito.ubigeo,
    departmentId: distrito.departamento_id,
    provinceId: distrito.provincia_id,
    name: formatUbigeoName(distrito.distrito),
  }))
  .sort((left, right) => left.name.localeCompare(right.name, 'es-PE'))

const departamentosByLookup = new Map(
  departamentos.map((departamento) => [normalizeLookup(departamento.name), departamento]),
)

const provinciasByDepartmentId = new Map<number, UbigeoProvince[]>()
const provinciasLookupByDepartmentId = new Map<number, Map<string, UbigeoProvince>>()

for (const provincia of provincias) {
  const currentProvincias = provinciasByDepartmentId.get(provincia.departmentId) ?? []
  currentProvincias.push(provincia)
  provinciasByDepartmentId.set(provincia.departmentId, currentProvincias)

  const currentLookup =
    provinciasLookupByDepartmentId.get(provincia.departmentId) ?? new Map<string, UbigeoProvince>()
  currentLookup.set(normalizeLookup(provincia.name), provincia)
  provinciasLookupByDepartmentId.set(provincia.departmentId, currentLookup)
}

const distritosByProvinceId = new Map<number, UbigeoDistrict[]>()
const distritosLookupByProvinceId = new Map<number, Map<string, UbigeoDistrict>>()

for (const distrito of distritos) {
  const currentDistritos = distritosByProvinceId.get(distrito.provinceId) ?? []
  currentDistritos.push(distrito)
  distritosByProvinceId.set(distrito.provinceId, currentDistritos)

  const currentLookup =
    distritosLookupByProvinceId.get(distrito.provinceId) ?? new Map<string, UbigeoDistrict>()
  currentLookup.set(normalizeLookup(distrito.name), distrito)
  distritosLookupByProvinceId.set(distrito.provinceId, currentLookup)
}

export const DEFAULT_UBIGEO_SELECTION = {
  departamento: 'Puno',
  provincia: 'Puno',
  distrito: 'Puno',
} satisfies Required<UbigeoSelection>

export function getDepartamentos() {
  return departamentos
}

export function findDepartamentoByName(name?: string) {
  if (!name?.trim()) {
    return null
  }

  return departamentosByLookup.get(normalizeLookup(name)) ?? null
}

export function getProvinciasByDepartamentoName(departamentoName?: string) {
  const departamento = findDepartamentoByName(departamentoName)

  if (!departamento) {
    return []
  }

  return provinciasByDepartmentId.get(departamento.id) ?? []
}

export function findProvinciaByName(departamentoName?: string, provinciaName?: string) {
  const departamento = findDepartamentoByName(departamentoName)

  if (!departamento || !provinciaName?.trim()) {
    return null
  }

  return (
    provinciasLookupByDepartmentId
      .get(departamento.id)
      ?.get(normalizeLookup(provinciaName)) ?? null
  )
}

export function getDistritosByDepartamentoAndProvinciaName(
  departamentoName?: string,
  provinciaName?: string,
) {
  const provincia = findProvinciaByName(departamentoName, provinciaName)

  if (!provincia) {
    return []
  }

  return distritosByProvinceId.get(provincia.id) ?? []
}

export function findDistritoByName(
  departamentoName?: string,
  provinciaName?: string,
  distritoName?: string,
) {
  const provincia = findProvinciaByName(departamentoName, provinciaName)

  if (!provincia || !distritoName?.trim()) {
    return null
  }

  return (
    distritosLookupByProvinceId
      .get(provincia.id)
      ?.get(normalizeLookup(distritoName)) ?? null
  )
}

export function getCanonicalUbigeoSelection(selection: UbigeoSelection) {
  const departamento = findDepartamentoByName(selection.departamento)?.name
  const provincia = findProvinciaByName(
    departamento ?? selection.departamento,
    selection.provincia,
  )?.name
  const distrito = findDistritoByName(
    departamento ?? selection.departamento,
    provincia ?? selection.provincia,
    selection.distrito,
  )?.name

  return {
    ...(departamento ? { departamento } : {}),
    ...(provincia ? { provincia } : {}),
    ...(distrito ? { distrito } : {}),
  }
}
