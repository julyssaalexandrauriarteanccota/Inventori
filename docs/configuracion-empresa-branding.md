# Configuración de empresa y branding

Plan para usar `ConfigEmpresa` como fuente de datos públicos y evitar textos hardcodeados del rubro actual.

## Objetivo

Centralizar datos de empresa, identidad visual y textos públicos para que el ERP pueda venderse a distintos rubros sin cambiar componentes base.

Este documento pertenece al **Bloque 1 / Fase 0** de la arquitectura escalable.

No cubre:

- facturación electrónica SUNAT
- certificados digitales
- series/correlativos fiscales futuros
- specs técnicas de productos por tipo
- `ComprobanteDetalle`

## Estado actual verificado

### Backend

`ConfigEmpresa` existe en `apps/api/prisma/schema.prisma`.

Campos actuales:

- datos legales visibles: `razonSocial`, `ruc`, `direccion`
- contacto general: `telefono`, `email`
- identidad y branding público: `nombreComercial`, `slogan`, `descripcionCorta`, `descripcionSeo`, `rubro`, `website`, `logo`, `logoDark`, `favicon`, `colorPrimario`, `colorSecundario`
- contacto público/comercial: `telefonoVentas`, `telefonoSoporte`, `whatsapp`, `emailVentas`, `emailSoporte`
- contenido público: `heroTitulo`, `heroSubtitulo`, `catalogoDescripcion`, `contactoDescripcion`, `garantiaDescripcion`, `ticketDescripcion`, `pwaDescripcion`
- series/correlativos actuales heredados: `serieFactura`, `serieBoleta`, `serieNotaCredito`, `serieNotaDebito` y correlativos
- `porcentajeIGV`

Endpoint público actual:

- `GET /api/v1/config/empresa/publica`

El endpoint público devuelve:

- `razonSocial`
- `ruc`
- `direccion`
- `telefono`
- `email`
- `logo`
- `nombreComercial`
- `slogan`
- `descripcionCorta`
- `descripcionSeo`
- `rubro`
- `website`
- `telefonoVentas`
- `telefonoSoporte`
- `whatsapp`
- `emailVentas`
- `emailSoporte`
- `logoDark`
- `favicon`
- `colorPrimario`
- `colorSecundario`
- `heroTitulo`
- `heroSubtitulo`
- `catalogoDescripcion`
- `contactoDescripcion`
- `garantiaDescripcion`
- `ticketDescripcion`
- `pwaDescripcion`

Endpoint privado actual:

- `GET /api/v1/config/empresa`
- `PATCH /api/v1/config/empresa`

### Frontend

`apps/web` ya tiene:

- `useEmpresaPublica()` en `src/hooks/use-public.ts`
- `useConfigEmpresa()` en `src/hooks/use-configuracion.ts`
- sección `Empresa` en `SettingsDialog`

Problema actual:

- landing, metadata, manifest y páginas públicas aún contienen textos fijos del rubro impresoras/fotocopiadoras.

## Decisión de arquitectura

Usar `ConfigEmpresa` para datos generales y públicos.

No usar `ConfigEmpresa` para secretos fiscales sensibles.

Separación futura:

| Área | Dónde debe vivir |
| --- | --- |
| Datos públicos de empresa | `ConfigEmpresa` |
| Branding visual | `ConfigEmpresa` o tabla/config asociada |
| Textos comerciales públicos | `ConfigEmpresa` o perfil de industria |
| Series/correlativos | `SerieDocumento` futura |
| Datos fiscales sensibles | `ConfigEmpresaFiscal` futura |
| Certificado y clave | `CertificadoDigital` futura con almacenamiento seguro |
| Vocabulario por rubro | `IndustryProfile` futuro o config equivalente |

## Campos públicos/no sensibles implementados en `ConfigEmpresa`

### Identidad

- `nombreComercial`
- `slogan`
- `descripcionCorta`
- `descripcionSeo`
- `rubro`
- `website`

### Contacto público

- `telefonoVentas`
- `telefonoSoporte`
- `whatsapp`
- `emailVentas`
- `emailSoporte`

### Branding

- `logo`
- `logoDark`
- `favicon`
- `colorPrimario`
- `colorSecundario`

### Contenido público

- `heroTitulo`
- `heroSubtitulo`
- `catalogoDescripcion`
- `contactoDescripcion`
- `garantiaDescripcion`
- `ticketDescripcion`
- `pwaDescripcion`

### Datos operativos fijos fuera de `ConfigEmpresa`

Para este proyecto, país, idioma, zona horaria y moneda operativa no se parametrizan en `ConfigEmpresa`: el despliegue actual asume Perú, español, zona horaria local de Perú y moneda operativa local.

## Defaults recomendados

Mantener defaults para el rubro actual, pero moverlos fuera de componentes base.

Ejemplo de defaults actuales permitidos como configuración:

- rubro: impresoras y fotocopiadoras
- marcas destacadas: Konica Minolta, Canon
- textos SEO del rubro
- copy público del rubro

Regla:

- los defaults pueden mencionar el rubro actual
- los componentes base no deben mencionar el rubro actual directamente

## Fuente de contenido en web

Crear una capa en `apps/web/src/lib/` para resolver contenido público.

Responsabilidades:

- leer `useEmpresaPublica()` cuando aplique
- combinar respuesta API con defaults locales
- exponer textos listos para layouts y páginas públicas
- evitar que páginas repitan strings fijos

Capa implementada:

- `src/lib/public-branding-types.ts`
- `src/lib/public-branding-defaults.ts`
- `src/lib/public-branding.ts`
- `src/hooks/use-public-branding.ts`

Responsabilidades:

- `public-branding-defaults.ts` conserva defaults del rubro actual fuera de componentes base.
- `public-branding.ts` resuelve la configuración final combinando API y defaults.
- `use-public-branding.ts` expone el branding resuelto para componentes cliente.

## Apartado `Empresa` recomendado en la UI

La sección `Empresa` de configuración debe dividirse en grupos claros:

### Datos legales visibles

- razón social
- RUC
- dirección
- teléfono
- email

### Branding

- logo principal
- logo para modo oscuro, opcional
- favicon, opcional
- color principal, opcional
- color secundario, opcional

### Contenido público

- nombre comercial
- slogan
- descripción corta
- descripción SEO
- rubro
- textos para landing y páginas públicas

### Contacto comercial

- WhatsApp
- email de ventas
- email de soporte
- teléfono de ventas
- teléfono de soporte
- sitio web

Esta sección no debe pedir certificado digital ni clave SUNAT.

## Implementación por pasos

### Paso 1: shared

Actualizar `packages/shared`:

- ampliar `ConfigEmpresaPayload`
- ampliar `EmpresaPublica`
- ampliar `configEmpresaSchema`
- agregar schema de branding/contenido público si conviene separarlo
- tests de schema

### Paso 2: Prisma

Agregar campos no sensibles a `ConfigEmpresa` solo si hacen falta para branding/contenido público.

No mover todavía datos fiscales sensibles.

No crear en esta fase:

- `ConfigEmpresaFiscal`
- `SerieDocumento`
- `ComprobanteDetalle`
- specs de producto

### Paso 3: API

Actualizar:

- `UpdateConfigEmpresaDto`
- `ConfigService.getEmpresaPublica()`
- `ConfigService.updateEmpresa()`
- tests de config

### Paso 4: Web admin

Aplicado: la sección `Empresa` en configuración permite editar:

- logo principal
- logo modo oscuro
- favicon
- color primario
- color secundario
- nombre comercial
- slogan
- descripción corta
- descripción SEO
- rubro
- sitio web
- teléfonos y emails públicos/comerciales
- textos para landing, catálogo, contacto, garantía, tickets y PWA

### Paso 5: Web público

Reemplazar textos hardcodeados en:

- metadata raíz
- manifest PWA
- landing
- catálogo
- contacto
- garantía
- ticket

### Paso 6: validación

Ejecutar:

- `pnpm --filter @erp/shared test`
- `pnpm --filter @erp/api test`
- `pnpm --filter @erp/web test`
- `pnpm type-check`

## Lo que no debe hacerse en esta fase

- no guardar certificados `.p12` en `ConfigEmpresa`
- no guardar claves de certificado en texto plano
- no implementar SUNAT completo todavía
- no crear `IndustryProfile` si aún basta con defaults/config pública
- no migrar series/correlativos hasta abordar `SerieDocumento`

## Estado de aplicación en frontend

Slice 3 aplicado:

- metadata raíz y pública usan branding resuelto desde API + defaults
- `src/app/manifest.ts` genera el manifest PWA desde branding público
- `public/manifest.json` queda como fallback estático neutral
- landing raíz y landing pública consumen `PublicBranding`
- páginas públicas de catálogo, contacto, garantía y ticket usan textos resueltos desde configuración/defaults
- el módulo interno `Equipos` ya no hardcodea impresoras/fotocopiadoras en la descripción principal

Mejora de administración aplicada:

- la sección `Empresa` de configuración permite editar todos los campos públicos/no sensibles de branding y contenido público existentes en `ConfigEmpresa`
- al guardar empresa se refresca también la consulta pública de branding en cliente
- los emails públicos opcionales pueden quedar vacíos sin bloquear el guardado

## Resultado esperado

Después de esta fase, el ERP podrá presentarse a otra empresa cambiando configuración, sin que aparezcan textos inesperados de impresoras/fotocopiadoras en pantallas públicas o metadata.
