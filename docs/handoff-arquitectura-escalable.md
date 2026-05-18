# Handoff arquitectura escalable ERP

Última actualización: 2026-05-02.

Este archivo existe para que un agente nuevo pueda continuar sin perder contexto ni romper decisiones ya tomadas.

## Lectura obligatoria antes de tocar código

Leer en este orden:

1. `README.md`
2. `AGENTS.md`
3. `docs/README.md`
4. `docs/handoff-arquitectura-escalable.md`
5. `docs/arquitectura-escalable-erp.md`
6. `docs/seguimiento-arquitectura-escalable.md`
7. `docs/configuracion-empresa-branding.md`
8. `docs/auditoria-reventa-hardcoded.md`
9. `docs/facturacion-sunat-roadmap.md`
10. `docs/sunat-beta-checklist.md`
11. `apps/web/README.md`
12. `apps/api/README.md`
13. `packages/shared/README.md`

Si se toca frontend, leer además:

- `apps/web/AGENTS.md`

Si se toca API NestJS, leer además:

- `.github/instructions/api-nestjs.instructions.md`

Si se toca Prisma, leer además:

- `.github/instructions/prisma-schema.instructions.md`

## Decisiones congeladas

No contradecir estas decisiones:

- `Producto` sigue siendo el núcleo común del catálogo.
- `Equipo` sigue siendo la unidad física serializada.
- `DetalleVenta` sigue siendo la línea comercial.
- `ComprobanteDetalle` es la línea fiscal congelable/inmutable.
- No crear tabla ambigua `producto_detalle`.
- Fiscalidad separada del catálogo y de la venta comercial.
- No guardar certificados, claves ni fiscalidad sensible en `ConfigEmpresa`.
- `ConfigEmpresa` queda para branding/datos públicos y configuración heredada no sensible.
- `ConfigEmpresaFiscal` es para datos tributarios no sensibles.
- Certificados, claves privadas y `.p12` requieren diseño seguro antes de implementación.
- No se usará Nubefact ni otro proveedor fiscal externo; la emisión será SUNAT directo desde el SEE del contribuyente.
- La palabra `provider` solo se permite como abstracción interna de código (`SunatDirectProvider`/`SunatDirectGateway`), no como integración con terceros.
- El frontend debe permitir configuración por ADMIN para usuarios no técnicos, pero nunca persistir ni exponer secretos en navegador.
- `ProductoFiscalConfig` existe como contrato shared futuro, pero no tiene persistencia Prisma todavía.
- No mover SNMP/tóner técnico de golpe; es feature existente del rubro actual hasta que exista perfil de industria/feature flags.

## Bloque 1 / Fase 0 - Estado: completado

Objetivo: desacoplar visual y semánticamente el sistema del rubro impresoras/fotocopiadoras sin romper el core.

Implementado:

- `ConfigEmpresa` ampliado con branding público y textos públicos no sensibles.
- `GET /api/v1/config/empresa/publica` expone branding público.
- Capa web de branding público:
  - `apps/web/src/lib/public-branding-types.ts`
  - `apps/web/src/lib/public-branding-defaults.ts`
  - `apps/web/src/lib/public-branding.ts`
  - `apps/web/src/hooks/use-public-branding.ts`
- Metadata, manifest PWA, landing y páginas públicas consumen branding/config/defaults.
- UI `Empresa` en `SettingsDialog` permite editar datos públicos, identidad, contacto y contenido público.
- Fixtures y textos auxiliares visibles se neutralizaron.
- Ruta vacía `apps/web/src/app/dashboard/` fue eliminada para evitar `404`; la ruta real es `apps/web/src/app/(erp)/dashboard/page.tsx`.

Validado:

- `pnpm --filter @erp/web type-check`
- `pnpm --filter @erp/web test`
- `pnpm --filter @erp/web build`

Nota: el build web mantiene el warning conocido de Serwist + Turbopack.

## Bloque 2 - Fiscalidad mínima seria - Estado: backend base completado

Objetivo: separar emisión fiscal de venta comercial y de catálogo vivo.

### Shared implementado

Archivos principales:

- `packages/shared/src/enums/tipo-fiscal-producto.enum.ts`
- `packages/shared/src/enums/tipo-afectacion-igv.enum.ts`
- `packages/shared/src/schemas/facturacion.schema.ts`
- `packages/shared/src/types/facturacion.type.ts`
- `packages/shared/src/index.ts`

Contratos agregados:

- `TipoFiscalProducto`: `BIEN`, `SERVICIO`
- `TipoAfectacionIgv`: valores semánticos alineados con Prisma
- `ConfigEmpresaFiscalPayload`
- `SerieDocumentoPayload`
- `ComprobanteDetalle`
- `ProductoFiscalConfigPayload` solo como contrato futuro, sin Prisma todavía
- `ClienteValidacionSunatPayload`
- schemas Zod para configuración fiscal, series, detalle fiscal, producto fiscal futuro y validación documental

Validado:

- `pnpm --filter @erp/shared type-check`
- `pnpm --filter @erp/shared test` — 10 archivos, 45 tests
- `pnpm --filter @erp/shared build`

### Prisma implementado

Schema/migraciones:

- `apps/api/prisma/schema.prisma`
- `apps/api/prisma/migrations/20260501103000_fiscalidad_minima/migration.sql`
- `apps/api/prisma/migrations/20260501120000_comprobante_emisor_snapshot/migration.sql`

Modelos agregados:

- `ComprobanteDetalle`
- `ComprobanteEnvioLog`
- `ConfigEmpresaFiscal`
- `SerieDocumento`
- `ClienteValidacionSunat`

Campos agregados a `Comprobante` para snapshot de emisor:

- `emisorRuc`
- `emisorRazonSocial`
- `emisorNombreComercial`
- `emisorDireccionFiscal`
- `emisorUbigeoFiscal`
- `emisorCodigoEstablecimiento`

No se agregó `CertificadoDigital` todavía por seguridad.

Validado:

- `DATABASE_URL=postgresql://test_user:test_password@localhost:5432/test_db pnpm --filter @erp/api exec prisma validate`
- `DATABASE_URL=postgresql://test_user:test_password@localhost:5432/test_db pnpm --filter @erp/api exec prisma generate`

### API backend implementado

Servicios nuevos:

- `apps/api/src/modules/facturacion/serie-documento.service.ts`
- `apps/api/src/modules/facturacion/series-documento-admin.service.ts`
- `apps/api/src/modules/facturacion/comprobante-snapshot.service.ts`
- `apps/api/src/modules/facturacion/comprobante-detalle.service.ts`
- `apps/api/src/modules/facturacion/comprobante-envio-log.service.ts`
- `apps/api/src/modules/facturacion/configuracion-fiscal.service.ts`
- `apps/api/src/modules/facturacion/cliente-validacion-sunat.service.ts`

DTOs administrativos nuevos:

- `create-config-empresa-fiscal.dto.ts`
- `update-config-empresa-fiscal.dto.ts`
- `create-serie-documento.dto.ts`
- `update-serie-documento.dto.ts`
- `query-serie-documento.dto.ts`
- `create-cliente-validacion-sunat.dto.ts`
- `update-cliente-validacion-sunat.dto.ts`
- `query-cliente-validacion-sunat.dto.ts`
- `query-comprobante-envio-log.dto.ts`

Runtime mínimo:

- `FacturacionService.emitirComprobante()` crea cabecera `Comprobante` y líneas `ComprobanteDetalle` en la misma transacción.
- `ComprobanteSnapshotService` crea snapshots de emisor, cliente y líneas fiscales.
- `SerieDocumentoService` usa `SerieDocumento` si existe y cae a correlativos heredados de `ConfigEmpresa` como fallback temporal.
- `SunatProcessor` usa `ComprobanteDetalle` para payload cuando existe snapshot fiscal.
- `SunatProcessor` registra `ComprobanteEnvioLog` para inicio, respuesta dev/proveedor y errores.

Endpoints administrativos fiscales disponibles:

- `GET /api/v1/facturacion/config-fiscal`
- `PATCH /api/v1/facturacion/config-fiscal`
- `GET /api/v1/facturacion/series-documento`
- `POST /api/v1/facturacion/series-documento`
- `POST /api/v1/facturacion/series-documento/sync-legacy`
- `PATCH /api/v1/facturacion/series-documento/:id`
- `DELETE /api/v1/facturacion/series-documento/:id`
- `GET /api/v1/facturacion/sedes-fiscales`
- `POST /api/v1/facturacion/sedes-fiscales`
- `PATCH /api/v1/facturacion/sedes-fiscales/:id`
- `DELETE /api/v1/facturacion/sedes-fiscales/:id`
- `GET /api/v1/facturacion/sunat-direct/status`
- `GET /api/v1/facturacion/certificados-digitales`
- `POST /api/v1/facturacion/certificados-digitales`
- `POST /api/v1/facturacion/certificados-digitales/:id/activar`
- `DELETE /api/v1/facturacion/certificados-digitales/:id`
- `GET /api/v1/facturacion/clientes-validaciones`
- `POST /api/v1/facturacion/clientes-validaciones`
- `GET /api/v1/facturacion/clientes-validaciones/:id`
- `PATCH /api/v1/facturacion/clientes-validaciones/:id`
- `DELETE /api/v1/facturacion/clientes-validaciones/:id`
- `GET /api/v1/facturacion/envio-logs`
- `GET /api/v1/facturacion/comprobantes/:id/envios`

Tests agregados/actualizados:

- `configuracion-fiscal.service.spec.ts`
- `series-documento-admin.service.spec.ts`
- `cliente-validacion-sunat.service.spec.ts`
- `comprobante-envio-log.service.spec.ts`
- `facturacion.service.spec.ts`
- `sunat.processor.spec.ts`
- `ventas.service.spec.ts` actualizado por mocks desfasados de `CajaService`/`adjunto`

Validado:

- `pnpm --filter @erp/api type-check`
- `pnpm --filter @erp/api build`
- `pnpm --filter @erp/api test` — 33 suites, 370 tests

## Lo que falta por hacer

### Prioridad 1 - UI fiscal frontend segura

Implementar UI administrativa separada de `Empresa` para fiscalidad. No mezclar con branding público.

Ubicación sugerida:

- extender `apps/web/src/components/settings-dialog.tsx` o crear contenido bajo `apps/web/src/components/settings/`
- idealmente una sección nueva `Tributario / Fiscal` visible solo para `ADMIN`

Debe consumir endpoints ya existentes:

- `GET/PATCH /api/v1/facturacion/config-fiscal`
- `GET/POST/PATCH/DELETE /api/v1/facturacion/series-documento`
- `POST /api/v1/facturacion/series-documento/sync-legacy`
- `GET/POST/PATCH/DELETE /api/v1/facturacion/clientes-validaciones`
- `GET /api/v1/facturacion/envio-logs`
- `GET /api/v1/facturacion/comprobantes/:id/envios`

Hooks sugeridos:

- crear/expandir en `apps/web/src/hooks/use-facturacion.ts`
- usar `api.get`, `api.post`, `api.patch`, `api.delete` desde `apps/web/src/lib/api.ts`
- invalidar queries con React Query al guardar cambios

Pantallas/secciones sugeridas:

1. Configuración fiscal no sensible:
   - RUC
   - razón social fiscal
   - nombre comercial fiscal opcional
   - dirección fiscal
   - ubigeo fiscal
   - código de establecimiento
   - correo SEE
   - régimen tributario
   - formato impresión default
   - pie de impresión
2. Series documentales:
   - tipo documento
   - serie
   - correlativo actual
   - establecimiento
   - activo
   - botón `sync-legacy` para migrar desde `ConfigEmpresa`
3. Validaciones SUNAT de cliente:
   - listado y edición manual/cacheada
   - estado `PENDIENTE`, `VALIDO`, `INVALIDO`, `ERROR`
4. Logs de envío fiscal:
   - listado paginado
   - filtros por comprobante/estado/tipoEvento
   - vista por comprobante

Seguridad UI:

- solo `ADMIN`
- no pedir certificados ni claves todavía
- no mostrar campos de secretos
- no guardar tokens ni contraseñas en localStorage
- no exponer datos fiscales sensibles en páginas públicas

### Avance SUNAT directo seguro / Fase inicial

Implementado después de la UI fiscal no sensible:

- Shared: `AmbienteSunat`, contratos para `EmpresaSedeFiscalPayload`, `CertificadoDigitalPayload` y estado seguro de SUNAT directo.
- Prisma: migración `20260501150000_sunat_directo_seguro` con `EmpresaSedeFiscal`, `CertificadoDigital`, `FiscalSecret`, `AmbienteSunat` y `CertificadoStorageProvider`.
- API: servicios `EmpresaSedeFiscalService`, `FiscalSecretsService` y `CertificadoDigitalService`.
- API: upload ADMIN de `.p12/.pfx` con validación backend mediante `tls.createSecureContext`, cifrado AES-256-GCM y almacenamiento local privado configurable por `FISCAL_PRIVATE_STORAGE_DIR`.
- API: contraseña del certificado se guarda cifrada en `FiscalSecret` usando `FISCAL_MASTER_KEY_BASE64`; no se expone al frontend.
- Web: sección `Tributario` ampliada con `Certificado`, carga transitoria de `.p12/.pfx`, contraseña y estado seguro. La UI visible se mantiene en sede única; no se expone multi-sede operativo.

Implementado adicionalmente en el siguiente slice:

- `SunatPayloadBuilder` genera XML UBL 2.1 inicial para factura/boleta desde `Comprobante` + `ComprobanteDetalle`.
- `SunatXmlSigner` firma XML en backend con `xml-crypto` y certificado activo extraído del `.p12` vía `node-forge`.
- `SunatDirectGateway` arma ZIP, SOAP `sendBill`, resuelve endpoint beta/producción y parsea `applicationResponse`/faults de SUNAT.
- `SunatCredentialsService` permite guardar credenciales SOL SUNAT cifradas en `FiscalSecret`; `SunatDirectGateway` las prioriza y mantiene fallback a variables `SUNAT_SOL_*`.
- `SunatDirectGateway` también implementa consultas SOAP `getStatus` por ticket y `getStatusCdr` por datos del comprobante, con parsing seguro de `statusCode`, `statusMessage` y CDR base64.
- `SunatPayloadBuilder` genera UBL inicial `CreditNote` y `DebitNote` desde la nota y el `Comprobante` origen congelado, con una línea de ajuste proporcional al IGV del comprobante original.
- `SunatXmlSigner` firma `Invoice`, `CreditNote` y `DebitNote` en backend.
- `SunatProcessor` ya no usa ni menciona Nubefact; procesa comprobantes y notas crédito/débito por SUNAT directo, con modo desarrollo solo para falta de configuración local y bloqueado para ambiente efectivo `PRODUCCION`.
- UI `Tributario > Certificado` permite guardar credenciales SOL cifradas (`usuario SOL` o `RUC+usuario` completo + contraseña transitoria) sin exponer secretos después de guardar.
- UI `Tributario > Certificado` tiene botón `Probar SUNAT` para validar certificado activo + credenciales/endpoint backend sin exponer secretos.
- UI `Ventas > Facturación` tiene acción `Consultar SUNAT/CDR` para comprobantes `ENVIADO`, `ACEPTADO` o `RECHAZADO`; consume `POST /api/v1/facturacion/comprobantes/:id/consultar-sunat` y refresca lista/logs sin exponer secretos.
- UI `Ventas > Facturación` tiene panel lateral `Ver` con estado XML/CDR, mensaje SUNAT, líneas fiscales congeladas y logs de envío del comprobante.

Pendiente antes de producción: pruebas con certificado beta real siguiendo `docs/sunat-beta-checklist.md`, hardening de almacenamiento productivo, validación beta real de `Invoice`/`CreditNote`/`DebitNote` y validaciones tributarias más exhaustivas.

### Prioridad 2 - SUNAT directo formal

Decisión congelada: no se usará Nubefact ni otro proveedor fiscal externo. SUNAT directo ya tiene implementación inicial desde el SEE del contribuyente; falta validación beta real antes de producción.

Crear servicios pequeños, no agrandar más `FacturacionService`:

- `SunatPayloadBuilder` — implementado para factura/boleta inicial
- `SunatXmlSigner` — implementado
- `SunatDirectGateway` o `SunatDirectProvider` como adaptador interno hacia SUNAT, no hacia terceros — implementado como `SunatDirectGateway`
- `CertificateService`/`CertificadoDigitalService` — fase inicial implementada
- `FiscalSecretsService` — implementado

Reglas:

- construir XML/payload desde `Comprobante` + `ComprobanteDetalle`, no desde `Producto` vivo
- mapear `TipoAfectacionIgv` semántico a códigos SUNAT en el builder
- firmar XML solo en backend usando certificado activo
- registrar request/response en `ComprobanteEnvioLog`
- mantener modo dev/beta controlado si credenciales no existen
- separar ambientes `BETA` y `PRODUCCION`

### Prioridad 3 - Certificados digitales seguros

No implementar `.p12` como campo normal ni en `ConfigEmpresa`.

Decisión: se usará certificado propio para SUNAT directo. El sistema debe permitir que un ADMIN no técnico lo cargue desde frontend, pero el secreto solo puede existir transitoriamente en la petición HTTPS y luego debe quedar bajo control del backend.

Antes de habilitar emisión productiva cerrar:

- almacenamiento privado del archivo: MinIO privado, filesystem protegido, secret manager u otro
- cifrado en reposo del `.p12`
- manejo de contraseña del certificado cifrada o referenciada en secret manager; nunca texto plano en DB
- llave maestra fuera del código y fuera de la DB: KMS, Vault, secret manager o variable de entorno protegida para MVP
- política de rotación, revocación y auditoría

Modelo futuro posible, solo después de decidir seguridad:

- `CertificadoDigital`
  - referencia segura al archivo, no contenido público
  - metadata no sensible
  - estado/fechas
  - nunca clave en texto plano

UI futura:

- carga de certificado con advertencias de seguridad
- no mostrar clave guardada
- permitir reemplazar/rotar
- registrar auditoría

### Prioridad 4 - Configuración frontend para usuario no técnico

La UI `Tributario` debe crecer por etapas para que el ADMIN configure sin tocar código:

1. datos fiscales no sensibles y series — implementado
2. sedes/locales anexos SUNAT — implementado
3. ambiente `BETA`/`PRODUCCION` por configuración/serie — implementado parcialmente
4. carga/reemplazo de certificado `.p12` con contraseña en formulario transitorio — implementado en fase inicial
5. estado de certificado: cargado, activo, fingerprint parcial — implementado; vigencia queda pendiente de extracción real de metadata del `.p12`
6. credenciales SUNAT/usuario secundario si aplica, guardadas por backend como secreto cifrado o referencia segura — pendiente; hoy se leen desde env backend `SUNAT_SOL_USERNAME`/`SUNAT_SOL_USER` + `SUNAT_SOL_PASSWORD`
7. botón de prueba de conexión/firma/envío beta — implementado como prueba de configuración/endpoint; falta prueba de envío beta con CPE real

La UI nunca debe mostrar claves, contraseña, certificado completo ni tokens después de guardar.

### Prioridad 5 - Validación SUNAT automática de clientes

Hoy existe administración manual/cacheada en `ClienteValidacionSunat`.

Falta:

- provider de consulta RUC/DNI
- endpoint que consulte proveedor y actualice `ClienteValidacionSunat`
- reglas de emisión:
  - factura requiere RUC válido cuando esté habilitado
  - boleta mantiene consumidor final según reglas de negocio

### Prioridad 6 - Producto fiscal y catálogo escalable

No hacer antes de cerrar UI/proveedor fiscal mínimo salvo necesidad real.

Pendiente:

- persistencia futura de `ProductoFiscalConfig`
- `ProductoEquipoSpec`
- `ProductoServicioSpec`

No crear `producto_detalle`.

## Comandos recomendados antes y después de continuar

Antes de cambios:

- `pnpm --filter @erp/shared type-check`
- `pnpm --filter @erp/api type-check`
- `pnpm --filter @erp/web type-check`

Después de tocar shared/API:

- `pnpm --filter @erp/shared test`
- `pnpm --filter @erp/shared build`
- `DATABASE_URL=postgresql://test_user:test_password@localhost:5432/test_db pnpm --filter @erp/api exec prisma validate`
- `DATABASE_URL=postgresql://test_user:test_password@localhost:5432/test_db pnpm --filter @erp/api exec prisma generate`
- `pnpm --filter @erp/api test`
- `pnpm --filter @erp/api type-check`
- `pnpm --filter @erp/api build`

Después de tocar web:

- `pnpm --filter @erp/web type-check`
- `pnpm --filter @erp/web test`
- `pnpm --filter @erp/web build`

## Handoff operativo para nuevo chat / siguiente agente

### Punto exacto donde queda el trabajo

El trabajo actual queda en **SUNAT directo implementado en fase funcional inicial**, no en proveedor externo:

- La UI fiscal `Tributario` ya existe y está separada de `Empresa`.
- El ADMIN puede configurar datos fiscales no sensibles, series por ambiente, validaciones manuales y logs. La operación visible sigue siendo de sede única; cualquier `EmpresaSedeFiscal` se trata como soporte fiscal SUNAT, no como multi-sede operativo.
- El ADMIN puede cargar un `.p12/.pfx` desde frontend; la contraseña solo viaja transitoriamente al API.
- El API valida el certificado, extrae metadata parcial, cifra el `.p12`, guarda la contraseña cifrada en `FiscalSecret` y no expone secretos al frontend.
- El backend ya tiene `SunatPayloadBuilder`, `SunatXmlSigner` y `SunatDirectGateway`.
- `SunatProcessor` ya no usa Nubefact; arma XML UBL factura/boleta inicial, firma y llama `sendBill` SUNAT directo.
- `sendBill` interpreta el CDR ZIP/XML y usa `ResponseCode` para decidir aceptación/rechazo, no solo HTTP `200`.
- El modo dev solo acepta localmente si falta configuración sensible y `SUNAT_DIRECT_DEV_MODE` no está en `false`; además queda bloqueado si el ambiente efectivo es `PRODUCCION`.

### Archivos principales del último trabajo

Shared:

- `packages/shared/src/enums/ambiente-sunat.enum.ts`
- `packages/shared/src/enums/certificado-storage-provider.enum.ts`
- `packages/shared/src/types/facturacion.type.ts`
- `packages/shared/src/schemas/facturacion.schema.ts`
- `packages/shared/src/schemas/facturacion.schema.test.ts`

Prisma:

- `apps/api/prisma/schema.prisma`
- `apps/api/prisma/migrations/20260501150000_sunat_directo_seguro/migration.sql`

API:

- `apps/api/src/modules/facturacion/certificado-digital.service.ts`
- `apps/api/src/modules/facturacion/certificado-digital.service.spec.ts`
- `apps/api/src/modules/facturacion/fiscal-secrets.service.ts`
- `apps/api/src/modules/facturacion/empresa-sede-fiscal.service.ts`
- `apps/api/src/modules/facturacion/sunat-payload.builder.ts`
- `apps/api/src/modules/facturacion/sunat-payload.builder.spec.ts`
- `apps/api/src/modules/facturacion/sunat-xml.signer.ts`
- `apps/api/src/modules/facturacion/sunat-xml.signer.spec.ts`
- `apps/api/src/modules/facturacion/sunat-credentials.service.ts`
- `apps/api/src/modules/facturacion/sunat-credentials.service.spec.ts`
- `apps/api/src/modules/facturacion/sunat-direct.gateway.ts`
- `apps/api/src/modules/facturacion/sunat-direct.gateway.spec.ts`
- `apps/api/src/modules/facturacion/sunat.processor.ts`
- `apps/api/src/modules/facturacion/facturacion.service.ts`
- `apps/api/src/modules/facturacion/facturacion.controller.ts`
- `apps/api/src/modules/facturacion/facturacion.module.ts`
- DTOs nuevos en `apps/api/src/modules/facturacion/dto/`

Web:

- `apps/web/src/hooks/use-facturacion.ts`
- `apps/web/src/app/(erp)/ventas/facturacion/page.tsx`
- `apps/web/src/components/settings/fiscal-settings-content.tsx`
- `apps/web/src/components/settings/settings-sections.ts`
- `apps/web/src/components/settings/configuration-nav.ts`
- `apps/web/src/components/settings-dialog.tsx`

Docs:

- `docs/handoff-arquitectura-escalable.md`
- `docs/facturacion-sunat-roadmap.md`
- `docs/sunat-beta-checklist.md`
- `docs/seguimiento-arquitectura-escalable.md`
- `docs/arquitectura-escalable-erp.md`
- `SPRINTS/00-MAPA-TABLAS.md`

### Variables de entorno necesarias para pruebas reales

Para usar certificado y SUNAT directo fuera de modo dev:

- `FISCAL_MASTER_KEY_BASE64`: obligatorio para cifrar/descifrar secretos; debe decodificar exactamente 32 bytes.
- `FISCAL_MASTER_KEY_VERSION`: opcional, default `v1`.
- `FISCAL_PRIVATE_STORAGE_DIR`: opcional; ruta privada donde se guardan `.p12` cifrados.
- `SUNAT_ENVIRONMENT`: `BETA` o `PRODUCCION`.
- `SUNAT_BETA_URL`: opcional, tiene default.
- `SUNAT_PRODUCCION_URL`: opcional, tiene default.
- `SUNAT_SOL_USERNAME` y `SUNAT_SOL_PASSWORD`, o `SUNAT_SOL_USER` y `SUNAT_SOL_PASSWORD` para construir `RUC + usuario`.
- `SUNAT_DIRECT_DEV_MODE=false` para no aceptar comprobantes localmente cuando falte configuración.

No usar `NEXT_PUBLIC_*` para secretos.

### Qué debe hacer primero el siguiente agente

1. Leer la documentación obligatoria del inicio de este archivo.
2. Verificar estado real con:
   - `pnpm --filter @erp/shared type-check`
   - `pnpm --filter @erp/api type-check`
   - `pnpm --filter @erp/web type-check`
3. Si toca Prisma/API, ejecutar:
   - `DATABASE_URL=postgresql://test_user:test_password@localhost:5432/test_db pnpm --filter @erp/api exec prisma validate`
   - `DATABASE_URL=postgresql://test_user:test_password@localhost:5432/test_db pnpm --filter @erp/api exec prisma generate`
4. Revisar `apps/api/src/modules/facturacion/sunat.processor.ts` para continuar desde SUNAT directo, no desde Nubefact.
5. Revisar `apps/web/src/components/settings/fiscal-settings-content.tsx` para continuar UI `Tributario` sin mezclar con `Empresa`.

### Próximo trabajo recomendado

Orden recomendado, sin desviarse a catálogo todavía:

1. Probar con certificado y credenciales reales de beta SUNAT siguiendo `docs/sunat-beta-checklist.md`.
2. Ajustar el XML UBL generado por `SunatPayloadBuilder` contra validaciones beta reales.
3. Probar `getStatus`/`getStatusCdr` con SUNAT beta real y ajustar códigos/mensajes si SUNAT devuelve variantes no cubiertas por fixtures.
4. Validar UBL inicial de `CreditNote` y `DebitNote` contra SUNAT beta real; ajustar catálogos, montos y líneas si SUNAT rechaza los fixtures iniciales.
5. Endurecer almacenamiento productivo del `.p12`: MinIO privado, Vault/KMS/secret manager o filesystem protegido con backups y permisos mínimos.
6. Definir política de rotación/auditoría de credenciales SOL y certificado para producción.
7. Recién después continuar con catálogo escalable (`ProductoEquipoSpec`, `ProductoServicioSpec`, `ProductoFiscalConfig`).

Ya se agregaron tests unitarios enfocados con datos/certificado de ejemplo para `SunatPayloadBuilder`, `SunatXmlSigner`, `SunatDirectGateway` y `CertificadoDigitalService`. También existe endpoint `POST /api/v1/facturacion/comprobantes/:id/consultar-sunat` para consultar estado/CDR por datos del comprobante y registrar `ComprobanteEnvioLog` con evento `CONSULTA_CDR_SUNAT`. Los jobs `enviar-nota-credito` y `enviar-nota-debito` ahora construyen, firman y envían UBL `CreditNote`/`DebitNote` por `SunatDirectGateway.sendBill`; registran logs sobre el comprobante origen. En web, `useConsultarSunatComprobante()` y `Ventas > Facturación` exponen la acción manual `Consultar SUNAT/CDR` para estados enviados/aceptados/rechazados; el botón `Ver` abre un panel lateral con XML/CDR, líneas fiscales y logs.

### Validaciones recientes

Últimas validaciones pasadas después del trabajo SUNAT directo:

- `pnpm --filter @erp/shared type-check`
- `pnpm --filter @erp/shared test` — 10 archivos, 49 tests
- `pnpm --filter @erp/shared build`
- `DATABASE_URL=postgresql://test_user:test_password@localhost:5432/test_db pnpm --filter @erp/api exec prisma validate`
- `pnpm --filter @erp/api type-check`
- `pnpm --filter @erp/api build`
- `pnpm --filter @erp/api exec jest --runInBand` — 38 suites, 403 tests
- `pnpm --filter @erp/web type-check`
- `pnpm --filter @erp/web build` — OK con warning conocido de Serwist + Turbopack

Nota: el último `pnpm --filter @erp/web exec vitest run --reporter=dot --silent` terminó con timeouts de workers de Vitest después de 20 archivos y 93 tests OK. No fue una falla de aserción; en corridas previas web tests completos pasaron. Reintentar con menos concurrencia o por subconjuntos si hace falta.

### Notas técnicas y advertencias específicas

- `SunatPayloadBuilder` es UBL inicial para factura/boleta y notas crédito/débito; no asumir que ya está certificado para producción SUNAT sin beta real. El nombre del XML/ZIP usa correlativo SUNAT de 8 dígitos.
- Las notas crédito/débito se generan como una línea de ajuste basada en `monto` y prorrateo del IGV del comprobante origen; si se requieren notas por línea exacta, habrá que ampliar los modelos de nota o congelar detalles específicos.
- `SunatDirectGateway` implementa `sendBill`, `getStatus` y `getStatusCdr`; falta validarlo contra respuestas beta reales y decidir si se necesita endpoint consult service separado para producción.
- `SunatXmlSigner` firma en backend para `Invoice`, `CreditNote` y `DebitNote`; nunca mover firma al frontend.
- La acción web `Consultar SUNAT/CDR` y el panel lateral de detalle solo consumen endpoints backend y muestran estados/logs; no manejan credenciales ni certificado en navegador.
- `CertificadoDigitalService` guarda `.p12` cifrado localmente por ahora; producción debe decidir almacenamiento seguro final.
- `FiscalSecretsService` usa AES-256-GCM con llave maestra externa; la llave no debe guardarse en DB ni código.
- Credenciales SOL SUNAT cifradas: endpoints backend `GET /api/v1/facturacion/sunat-direct/credentials/status` y `PATCH /api/v1/facturacion/sunat-direct/credentials`; UI disponible en `Tributario > Certificado`; nunca devuelven contraseña ni usuario completo sin máscara.
- `packages/shared/src/enums/certificado-storage-provider.enum.ts` existe, pero si un futuro agente necesita consumirlo desde `@erp/shared`, revisar/exportar desde `packages/shared/src/index.ts`. La herramienta llegó a marcar ese archivo con buffer no guardado durante la sesión; no restaurar ni guardar sin revisar.
- Algunos diagnósticos del editor pueden aparecer stale para Prisma generado (`certificadoDigital`, `empresaSedeFiscal`, etc.); `pnpm --filter @erp/api type-check` y `build` pasan después de `prisma generate`.

## Advertencias para el siguiente agente

- No iniciar Bloque 3 si el usuario quiere primero cerrar SUNAT directo/beta.
- No iniciar Bloque 3 si el usuario quiere primero la UI fiscal frontend.
- No usar Nubefact ni proveedor fiscal externo; implementar SUNAT directo.
- No interpretar `SunatProvider` como tercero externo: debe ser una abstracción interna.
- No agregar certificados ni claves sin diseño seguro.
- No reconstruir comprobantes antiguos desde `Producto`; usar `ComprobanteDetalle`.
- No guardar fiscalidad sensible en `ConfigEmpresa`.
- No eliminar defaults del rubro actual en `public-branding-defaults.ts`; están permitidos ahí.
- No eliminar SNMP/tóner técnico sin feature flags/perfil de industria.
- Si un archivo muestra cambios sin guardar en la herramienta, pedir confirmación antes de guardar/restaurar.
