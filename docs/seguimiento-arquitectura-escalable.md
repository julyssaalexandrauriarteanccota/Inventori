# Seguimiento de arquitectura escalable

Archivo de control para implementar cambios por bloques, sin rehacer el sistema de golpe.

## Estado general

| Bloque | Estado | Objetivo |
| --- | --- | --- |
| 1. Estabilizar dominio | Completado | Definiciones, vocabulario configurable y limpieza de textos hardcodeados |
| 2. Fiscalidad mínima seria | En curso | `ComprobanteDetalle`, `ConfigEmpresaFiscal`, `SerieDocumento` |
| 3. Catálogo escalable | Pendiente | Specs por tipo: primero equipo y servicio |
| 4. Refactor backend | Pendiente | Servicios pequeños, snapshots, SUNAT directo, firma XML y certificado seguro |
| 5. Validación final | Pendiente | Tests, type-check, build y revisión de arquitectura |

## Bloque 1: estabilizar dominio

### Objetivo

Evitar que el sistema quede acoplado al rubro impresoras/fotocopiadoras.

### Alcance

Este bloque puede tocar frontend, shared, API y una migración pequeña de `ConfigEmpresa` si se requieren campos públicos de branding.

Este bloque no debe implementar todavía:

- `ComprobanteDetalle`
- `ConfigEmpresaFiscal`
- `SerieDocumento`
- `ProductoEquipoSpec`
- `ProductoServicioSpec`
- refactor SUNAT/provider/certificados

### Tareas

- [x] Crear `docs/arquitectura-escalable-erp.md`
- [x] Crear `docs/facturacion-sunat-roadmap.md`
- [x] Crear `docs/auditoria-reventa-hardcoded.md`
- [x] Crear `docs/configuracion-empresa-branding.md`
- [x] Ampliar `ConfigEmpresa` para branding y datos públicos no sensibles
- [x] Definir fuente backend de configuración pública para textos de empresa/rubro mediante `GET /api/v1/config/empresa/publica`
- [x] Crear defaults de contenido por rubro
- [x] Reemplazar textos hardcodeados en metadata y landing
- [x] Reemplazar textos hardcodeados en manifest PWA
- [x] Reemplazar textos hardcodeados en páginas públicas
- [x] Reemplazar textos hardcodeados en páginas ERP internas
- [x] Revisar tests con fixtures demasiado específicas
- [x] Ampliar UI de configuración de Empresa para administrar branding público

### Archivos principales a tocar

- `apps/web/src/app/layout.tsx`
- `apps/web/src/app/page.tsx`
- `apps/web/src/app/(public)/layout.tsx`
- `apps/web/src/app/(public)/page.tsx`
- `apps/web/src/app/(public)/catalogo/page.tsx`
- `apps/web/src/app/(public)/catalogo/[sku]/page.tsx`
- `apps/web/src/app/(public)/contacto/page.tsx`
- `apps/web/src/app/(public)/garantia/page.tsx`
- `apps/web/public/manifest.json`
- `apps/web/src/app/(erp)/equipos/page.tsx`
- `apps/api/prisma/schema.prisma`
- `apps/api/src/modules/config/config.service.ts`
- `apps/api/src/modules/facturacion/dto/update-config-empresa.dto.ts`
- `packages/shared/src/schemas/config-reportes.schema.ts`
- `packages/shared/src/types/config-reportes.type.ts`

### Avance Slice 1 / Fase 0

Implementado en contratos compartidos y backend base:

- `ConfigEmpresaPayload`, `EmpresaPublica` y schemas compartidos admiten branding, contacto público y contenido público.
- `ConfigEmpresa` se amplió solo con campos públicos/no sensibles; país, idioma, zona horaria y moneda operativa quedan fuera por ser valores fijos del despliegue actual.
- `GET /api/v1/config/empresa/publica` expone la configuración pública necesaria para resolver branding en web.
- No se implementaron `ComprobanteDetalle`, `ConfigEmpresaFiscal`, `SerieDocumento`, specs de producto, certificados ni refactor SUNAT.

### Avance Slice 2 / Fase 0

Implementado en frontend base:

- `apps/web/src/lib/public-branding-types.ts` define la estructura de branding público resuelta.
- `apps/web/src/lib/public-branding-defaults.ts` contiene defaults del rubro actual fuera de layouts/páginas.
- `apps/web/src/lib/public-branding.ts` combina datos de `EmpresaPublica` con defaults locales.
- `apps/web/src/hooks/use-public-branding.ts` expone el branding resuelto para componentes cliente.
- `apps/web/src/lib/public-branding.test.ts` cubre defaults, overrides desde API y fallback de strings vacíos.

### Avance Slice 3 / Fase 0

Aplicado en frontend visible:

- Metadata raíz y metadata pública usan `getPublicBrandingFromApi()` con fallback local.
- `src/app/manifest.ts` genera el manifest PWA desde branding público y `public/manifest.json` quedó neutralizado como fallback estático.
- Landing raíz y landing pública consumen `PublicBranding` en vez de strings de rubro en componentes base.
- Páginas públicas de catálogo, contacto, garantía y ticket consumen branding configurable.
- La descripción interna del módulo `Equipos` ya no hardcodea impresoras/fotocopiadoras; usa el rubro resuelto.

### Avance Slice 4 / Fase 0

Limpieza de fixtures y textos auxiliares:

- Fixtures públicas de catálogo, garantía y ticket ahora usan productos/equipos genéricos.
- Fixtures de formulario de producto, formulario de ticket y centro de notificaciones dejaron de usar marcas/modelos/insumos del rubro actual.
- Placeholders internos de producto, equipo, modelos, categorías, marcas y panel de login quedaron genéricos o resueltos desde branding.
- Se mantiene vocabulario de tóner/SNMP solo donde representa la feature técnica existente, no como copy base.

### Avance Slice 5 / Fase 0

Mejora práctica de administración de branding:

- La sección `Empresa` del diálogo de configuración permite editar identidad pública, contacto público/comercial, branding visual y textos públicos respaldados por `ConfigEmpresa`.
- No se agregaron país, idioma, zona horaria, moneda default, certificados, claves, SUNAT ni series nuevas.
- Al guardar configuración privada de empresa, web invalida también la consulta pública `empresa-publica` para refrescar branding cliente.
- Los emails públicos opcionales aceptan valores vacíos en la validación del DTO para permitir guardar el formulario completo sin forzar esos campos.

### Cierre del bloque

- [x] `pnpm --filter @erp/web type-check`
- [x] `pnpm --filter @erp/web test`
- [x] `pnpm --filter @erp/web build`

Bloque 1 cerrado: el branding público queda editable desde configuración, las pantallas públicas y metadata consumen configuración/defaults y no se detectan textos base del rubro actual fuera de defaults o features técnicas existentes. El build web mantiene solo el warning conocido de Serwist + Turbopack.

## Decisión fiscal congelada

- No se usará Nubefact ni proveedor fiscal externo.
- SUNAT directo ya tiene implementación inicial desde el SEE del contribuyente; falta validación beta real antes de producción.
- `SunatProvider`/`SunatDirectGateway` es una abstracción interna para separar responsabilidades, no una integración con terceros.
- El frontend debe permitir configuración por ADMIN para usuarios no técnicos, pero sin guardar ni mostrar secretos en navegador.
- `.p12`, contraseña y credenciales SUNAT deben manejarse en backend con cifrado, auditoría, rotación y almacenamiento privado.

## Backlog posterior a Bloque 1

Este backlog existe para no olvidar lo que viene después de terminar Fase 0/Bloque 1.

Orden macro posterior:

1. Fiscalidad mínima seria
2. Catálogo escalable
3. Refactor backend
4. Frontend modular por tipo/rubro
5. Perfil de industria
6. QA integral

## Bloque 2: fiscalidad mínima seria

### Objetivo

Separar la emisión fiscal de la venta comercial y del catálogo vivo.

### Tareas shared

- [x] Crear enum `TipoAfectacionIgv` si aplica
- [x] Crear enum `TipoFiscalProducto` si aplica (`BIEN`, `SERVICIO`)
- [x] Crear tipos para `ComprobanteDetalle`
- [x] Crear tipos para `ConfigEmpresaFiscal`
- [x] Crear tipos para `SerieDocumento`
- [x] Crear tipos para validación SUNAT de cliente
- [x] Crear schemas Zod para `ComprobanteDetalle`
- [x] Crear schemas Zod para configuración fiscal
- [x] Crear schemas Zod para series/documentos
- [x] Agregar tests de schemas fiscales

### Avance Slice 1 / Bloque 2

Contratos compartidos iniciales implementados sin tocar base de datos ni runtime API:

- Nuevos enums fiscales: `TipoAfectacionIgv` y `TipoFiscalProducto`.
- Nuevos tipos compartidos para `ComprobanteDetalle`, `ConfigEmpresaFiscalPayload`, `SerieDocumentoPayload`, `ProductoFiscalConfigPayload` y `ClienteValidacionSunatPayload`.
- Nuevos schemas Zod para configuración fiscal no sensible, series documentales, detalle fiscal congelable, configuración fiscal de producto y validación SUNAT de cliente.
- `packages/shared` exporta los nuevos enums y cubre los contratos con tests.
- Validado con `pnpm --filter @erp/shared type-check`, `pnpm --filter @erp/shared test` y `pnpm --filter @erp/shared build`.

Pendiente: Prisma, API runtime, snapshots, series transaccionales, certificado/proveedor SUNAT y frontend fiscal quedan para slices posteriores.

### Tareas Prisma

- [x] Agregar modelo `ComprobanteDetalle`
- [x] Agregar modelo `ConfigEmpresaFiscal`
- [x] Agregar modelo `SerieDocumento`
- [x] Agregar modelo `ComprobanteEnvioLog`
- [x] Agregar modelo `ClienteValidacionSunat`
- [x] Evaluar modelo `CertificadoDigital` según proveedor elegido
- [x] Crear migración
- [x] Ejecutar `prisma generate`

### Avance Slice 2 / Bloque 2

Prisma incremental implementado sin modificar servicios de emisión:

- Nuevos enums Prisma alineados con shared: `TipoFiscalProducto` y `TipoAfectacionIgv`.
- Nuevos modelos: `ComprobanteDetalle`, `ComprobanteEnvioLog`, `ConfigEmpresaFiscal`, `SerieDocumento` y `ClienteValidacionSunat`.
- `ComprobanteDetalle` queda separado de `DetalleVenta` como línea fiscal congelable.
- `ConfigEmpresaFiscal` guarda solo datos tributarios no sensibles; no incluye certificados ni claves.
- `CertificadoDigital` se evaluó y no se implementó todavía hasta definir proveedor y almacenamiento seguro.
- Migración creada en `apps/api/prisma/migrations/20260501103000_fiscalidad_minima/migration.sql`.
- Prisma validado y cliente generado con `DATABASE_URL=postgresql://test_user:test_password@localhost:5432/test_db pnpm --filter @erp/api exec prisma validate` y `prisma generate`.
- `SPRINTS/00-MAPA-TABLAS.md` actualizado por los modelos y enums nuevos.

Pendiente: API runtime, snapshots de emisión, servicios de series/correlativos, logs reales de proveedor y tests unitarios de emisión fiscal.

### Tareas API

- [x] Crear `ComprobanteSnapshotService`
- [x] Crear `ComprobanteDetalleService`
- [x] Crear `SerieDocumentoService`
- [x] Crear servicio para configuración fiscal
- [x] Modificar emisión para crear `ComprobanteDetalle`
- [x] Guardar snapshot de emisor en comprobante o estructura relacionada
- [x] Guardar snapshot de cliente fiscal
- [x] Evitar reconstrucción fiscal desde `Producto` vivo
- [x] Agregar logs de envío/respuesta de proveedor SUNAT
- [x] Agregar tests unitarios de emisión fiscal

### Avance Slice 3 / Bloque 2

Runtime API mínimo implementado sin proveedor SUNAT nuevo:

- `SerieDocumentoService` centraliza generación de serie/correlativo y mantiene fallback a correlativos heredados de `ConfigEmpresa` mientras no existan filas en `SerieDocumento`.
- `ConfiguracionFiscalService` permite consultar y crear/actualizar `ConfigEmpresaFiscal` no sensible desde API.
- `ComprobanteSnapshotService` construye snapshots de emisor, cliente y líneas fiscales desde la venta/configuración al momento de emisión.
- `ComprobanteDetalleService` persiste `ComprobanteDetalle` por cada `DetalleVenta` emitido.
- `FacturacionService.emitirComprobante()` ahora crea cabecera fiscal y detalles fiscales dentro de la misma transacción.
- `SunatProcessor` prioriza `ComprobanteDetalle` para construir payloads, evitando reconstruir líneas desde `Producto` vivo cuando ya existe snapshot fiscal.
- `SunatProcessor` registra `ComprobanteEnvioLog` para inicio, respuesta dev/proveedor y errores de envío.
- Tests enfocados de facturación cubren configuración fiscal, snapshot de emisor, creación de detalle fiscal, uso de `SerieDocumento` y logs de envío.

Pendiente: migración runtime completa de series heredadas a `SerieDocumento`, provider/builder SUNAT formal y UI fiscal.

### Cierre del bloque

- [x] `pnpm --filter @erp/shared test`
- [x] `pnpm --filter @erp/api test`
- [x] `pnpm --filter @erp/api type-check`
- [x] `pnpm --filter @erp/api build`

### Backlog SUNAT directo posterior al backend base

- [x] Agregar enum `AmbienteSunat` (`BETA`, `PRODUCCION`)
- [x] Agregar `EmpresaSedeFiscal` para locales anexos/códigos SUNAT de establecimiento
- [x] Relacionar `SerieDocumento` con sede fiscal y ambiente
- [x] Agregar `CertificadoDigital` con metadata y referencia segura al `.p12` cifrado
- [x] Crear `FiscalSecretsService` para cifrado/descifrado de secretos con llave maestra externa al código/DB
- [x] Crear `SunatCredentialsService` para guardar credenciales SOL cifradas en `FiscalSecret` con fallback temporal a variables `SUNAT_SOL_*`
- [x] Crear `CertificateService` para carga, validación, rotación y revocación de certificado
- [x] Crear `SunatPayloadBuilder` para XML UBL desde snapshots fiscales
- [x] Crear UBL inicial `CreditNote`/`DebitNote` desde notas y comprobante origen congelado
- [x] Crear `SunatXmlSigner` para firma XML backend
- [x] Crear `SunatDirectGateway`/`SunatDirectProvider` como cliente interno SUNAT directo
- [x] Ampliar UI `Tributario` con sedes, ambiente, certificado y estado seguro
- [x] Agregar prueba de conexión/firma/envío beta desde UI para validar configuración/endpoint
- [ ] Agregar envío beta real de CPE de prueba y validar consulta de estado/ticket SUNAT contra beta real
  - Checklist operativo creado en `docs/sunat-beta-checklist.md` para ejecutar beta real sin exponer secretos.
  - Implementado sin credenciales reales: `SunatDirectGateway.getStatus`, `SunatDirectGateway.getStatusCdr` y endpoint `POST /api/v1/facturacion/comprobantes/:id/consultar-sunat` con fixtures unitarios.
  - Implementado backend/UI: endpoints `GET/PATCH /api/v1/facturacion/sunat-direct/credentials` y formulario `Credenciales SOL SUNAT` en `Tributario > Certificado`; no expone contraseña ni usuario completo después de guardar.
  - Implementado en frontend: acción `Consultar SUNAT/CDR` en `Ventas > Facturación` para comprobantes enviados/aceptados/rechazados; consume solo el backend y no expone secretos.
  - Implementado en frontend: panel lateral `Ver` en `Ventas > Facturación` con estado XML/CDR, líneas fiscales congeladas y logs de envío.
  - Implementado sin credenciales reales: jobs `enviar-nota-credito` y `enviar-nota-debito` construyen/firman/envían UBL inicial `CreditNote`/`DebitNote` y registran logs sobre el comprobante origen.

## Bloque 3: catálogo escalable

### Objetivo

Separar datos comunes de producto de datos específicos por tipo.

Este bloque empieza después de tener fiscalidad mínima o cuando el formulario/producto empiece a necesitar campos específicos reales.

### Tareas shared

- [ ] Crear schema/tipo `ProductoEquipoSpec`
- [ ] Crear schema/tipo `ProductoServicioSpec`
- [ ] Crear schema/tipo `ProductoFiscalConfig`
- [ ] Definir qué campos siguen en `Producto` y qué campos pasan a specs
- [ ] Agregar tests

### Tareas Prisma

- [ ] Crear modelo `ProductoEquipoSpec`
- [ ] Crear modelo `ProductoServicioSpec`
- [ ] Crear modelo `ProductoFiscalConfig`
- [ ] Relacionar specs 1:1 con `Producto`
- [ ] Crear migración incremental
- [ ] Crear `ProductoRepuestoSpec`, `ProductoInsumoSpec`, `ProductoAccesorioSpec` y `ProductoAtributo`  necesidad real

### Tareas API

- [ ] Crear `ProductoSpecsService`
- [ ] Mantener `ProductosService` como CRUD base
- [ ] Validar specs según `TipoProducto`
- [ ] Evitar duplicar datos de `Equipo` en `ProductoEquipoSpec`

### Tareas Web

- [ ] Separar sección base de producto
- [ ] Agregar sección spec para `EQUIPO`
- [ ] Agregar sección spec para `SERVICIO`
- [ ] Agregar sección fiscal si está habilitada
- [ ] Mantener formulario adaptable por tipo sin mezclar datos de unidad física (`Equipo`) con ficha de catálogo (`ProductoEquipoSpec`)

### Cierre del bloque

- [ ] `pnpm --filter @erp/shared test`
- [ ] `pnpm --filter @erp/api test`
- [ ] `pnpm --filter @erp/web test`
- [ ] `pnpm type-check`

## Bloque 4: refactor backend

### Objetivo

Evitar servicios grandes y separar responsabilidades.

Este bloque se ejecuta después de introducir las piezas fiscales/catálogo suficientes para justificar la separación.

### Servicios candidatos

- [ ] `ProductoSpecsService`
- [ ] `ProductoFiscalService`
- [ ] `ComprobanteDetalleService`
- [ ] `SerieDocumentoService`
- [ ] `ComprobanteSnapshotService`
- [ ] `SunatPayloadBuilder`
- [ ] `SunatXmlSigner`
- [ ] `SunatDirectGateway` o `SunatDirectProvider` como abstracción interna, no proveedor externo
- [ ] `FiscalSecretsService`
- [ ] `CertificateService`

### Reglas

- [ ] `ProductosService` no debe absorber lógica específica de cada tipo indefinidamente
- [ ] `FacturacionService` no debe construir todo el payload fiscal directamente
- [ ] no usar Nubefact ni proveedor fiscal externo
- [ ] no guardar claves/certificados en texto plano
- [ ] no firmar ni manejar secretos en frontend
- [ ] no depender de datos vivos para documentos emitidos

## Bloque 5: frontend modular por rubro

### Objetivo

Hacer que la UI pueda adaptarse a distintos rubros sin condicionales hardcodeados dispersos.

### Tareas

- [ ] Definir vocabulario por rubro para nombres visibles de módulos
- [ ] Definir módulos/features activables por rubro
- [ ] Definir defaults por rubro para categorías/unidades
- [ ] Evaluar `IndustryProfile` cuando la configuración pública ya no sea suficiente
- [ ] Mantener compatibilidad con el rubro actual de impresoras/fotocopiadoras como default configurable

## Bloque 6: validación final

### Checklist técnico

- [ ] `pnpm lint`
- [ ] `pnpm type-check`
- [ ] `pnpm --filter @erp/shared test`
- [ ] `pnpm --filter @erp/api test`
- [ ] `pnpm --filter @erp/web test`
- [ ] `pnpm build`

### Checklist arquitectónico

- [ ] `Producto` mantiene solo datos comunes
- [ ] `Equipo` representa unidad física serializada
- [ ] `DetalleVenta` representa línea comercial
- [ ] `ComprobanteDetalle` representa línea fiscal congelada
- [ ] textos de rubro salen de configuración o perfil
- [ ] facturación no lee datos vivos para reconstruir documentos viejos
- [ ] no existe tabla ambigua `producto_detalle`

## Decisiones congeladas

- `Producto` sigue siendo núcleo común del catálogo
- `Equipo` sigue separado como unidad física
- `DetalleVenta` sigue siendo comercial
- `ComprobanteDetalle` será fiscal e inmutable
- specs por tipo se crean solo donde aporten valor real
- primero specs de `EQUIPO` y `SERVICIO`
- no crear specs de repuesto/insumo/accesorio hasta tener necesidad clara
- textos de impresoras/fotocopiadoras no deben vivir hardcodeados en componentes base
