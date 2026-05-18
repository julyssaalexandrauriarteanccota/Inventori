# Auditoría de textos específicos de rubro

Objetivo: detectar textos y conceptos hardcodeados que impiden vender el mismo ERP a otra empresa de otro rubro.

## Estado

En corrección por slices. Los Slices 1 a 4 del Bloque 1 ya dejaron contratos/API de branding público, defaults del rubro actual fuera de componentes base, pantallas públicas principales consumiendo branding configurable y fixtures frontend directas neutralizadas. Quedan referencias de tóner/SNMP solo donde representan la feature técnica existente y defaults del rubro actual dentro de `public-branding-defaults.ts`.

## Regla

El core del sistema debe usar lenguaje genérico.

Evitar en código base visible al cliente:

- impresoras
- fotocopiadoras
- tóner
- Konica Minolta
- Canon
- Bizhub

Estos textos solo deben vivir en configuración, datos semilla, perfil de industria o contenido editable por empresa.

## Hallazgos frontend

### Landing y sitio público

Archivos con textos específicos del rubro actual:

- `apps/web/src/app/layout.tsx`
- `apps/web/src/app/page.tsx`
- `apps/web/src/app/(public)/layout.tsx`
- `apps/web/src/app/(public)/page.tsx`
- `apps/web/src/app/(public)/catalogo/page.tsx`
- `apps/web/src/app/(public)/catalogo/[sku]/page.tsx`
- `apps/web/src/app/(public)/contacto/page.tsx`
- `apps/web/src/app/(public)/garantia/page.tsx`
- `apps/web/public/manifest.json`

Tipo de texto detectado:

- títulos SEO con impresoras/fotocopiadoras
- descripciones públicas con Konica Minolta, Bizhub y Canon
- copy de landing específico del rubro
- descripción PWA específica de impresoras/fotocopiadoras

### ERP interno

Archivo detectado:

- `apps/web/src/app/(erp)/equipos/page.tsx`

Texto actual específico:

- descripción del módulo Equipos como parque de fotocopiadoras e impresoras

### Tests frontend

Archivos con fixtures específicas del rubro:

- `apps/web/src/app/(public)/catalogo/catalogo-content.test.tsx`
- `apps/web/src/app/(public)/garantia/garantia-content.test.tsx`
- `apps/web/src/app/(public)/ticket/ticket-content.test.tsx`

Estos fixtures no son críticos para reventa, pero conviene hacerlos genéricos si se busca limpieza total.

## Hallazgos backend

### Código funcional

La funcionalidad `LecturaSNMP` y los campos de tóner existen en:

- `apps/api/src/modules/equipos/dto/create-lectura-snmp.dto.ts`
- `apps/api/src/modules/equipos/equipos.controller.ts`
- `apps/api/src/modules/equipos/equipos.service.ts`

Esto no debe eliminarse ahora. Debe quedar como feature opcional del rubro actual.

### Tests backend

Fixtures específicas detectadas en tests:

- categorías como `Impresoras`
- marcas como `Canon` y `Konica Minolta`
- modelos como `Bizhub 368`
- productos como `Toner Negro`

Archivos afectados incluyen specs de categorías, marcas, modelos, productos, equipos y facturación.

No son bloqueo funcional, pero son candidatos a neutralización gradual.

## Hallazgos shared

`packages/shared` contiene conceptos de SNMP/tóner en schemas y tipos:

- `packages/shared/src/schemas/equipos-garantias.schema.ts`
- `packages/shared/src/types/equipos-garantias.type.ts`

Decisión:

- mantener por ahora
- tratar como feature de industria, no como core obligatorio
- no eliminar hasta tener `IndustryProfile` o feature flags

## Clasificación de limpieza

### Prioridad 1

Textos visibles al cliente final:

- metadata del sitio
- landing pública
- catálogo público
- contacto
- garantía
- manifest PWA

### Prioridad 2

Textos visibles en ERP interno:

- descripciones de páginas
- títulos secundarios
- textos de ayuda

### Prioridad 3

Fixtures y tests:

- nombres de productos de ejemplo
- marcas de ejemplo
- títulos de tickets de ejemplo

### Prioridad 4

Nombres técnicos de feature:

- SNMP
- toner levels

Estos se migran solo cuando exista una capa de features por industria.

## Estrategia de cambio

### Paso A: configuración pública

Crear o reutilizar configuración pública de empresa para:

- nombre comercial
- tagline
- descripción SEO
- descripción PWA
- rubro
- marcas destacadas opcionales
- textos de landing

### Paso B: defaults actuales

Mantener defaults para el cliente actual de impresoras.

La diferencia debe ser que los textos ya no queden hardcodeados en componentes base.

### Paso C: helpers de contenido

Crear una capa web para leer contenido público:

- desde API si existe configuración
- desde defaults locales si la API no está disponible

### Paso D: limpieza por pantalla

Orden recomendado:

1. `src/app/layout.tsx`
2. `public/manifest.json`
3. `src/app/page.tsx`
4. `src/app/(public)/layout.tsx`
5. `src/app/(public)/page.tsx`
6. páginas públicas de catálogo/contacto/garantía/ticket
7. páginas ERP internas
8. tests

## Checklist

- [x] Definir fuente backend de configuración pública (`GET /api/v1/config/empresa/publica`)
- [x] Crear defaults del rubro actual fuera de componentes base (`public-branding-defaults.ts`)
- [x] Quitar texto hardcodeado de metadata raíz
- [x] Quitar texto hardcodeado de manifest
- [x] Quitar texto hardcodeado de landing
- [x] Quitar texto hardcodeado de páginas públicas
- [x] Quitar texto hardcodeado de páginas ERP internas
- [x] Neutralizar fixtures de tests donde aplique
- [ ] Ejecutar `pnpm --filter @erp/web type-check`
- [ ] Ejecutar `pnpm --filter @erp/web test`
