# Facturación SUNAT - roadmap técnico

Documento de planificación y seguimiento. La base fiscal y la integración SUNAT directa inicial ya están implementadas en código: generación UBL, firma XML, certificado digital cifrado, credenciales SOL cifradas, envío `sendBill`, consulta `getStatus/getStatusCdr`, logs y UI administrativa. Lo pendiente crítico es validar con SUNAT beta real y cerrar hardening operativo antes de producción.

## Decisión congelada

- No se usará Nubefact ni otro proveedor fiscal externo.
- La emisión será SUNAT directo desde el SEE del contribuyente.
- Se mantendrá una abstracción interna (`SunatDirectProvider`/`SunatDirectGateway`) solo para limpiar responsabilidades de código, no para conectar terceros.
- El frontend debe permitir que un ADMIN configure sedes, series, certificado y pruebas sin tocar código, pero los secretos nunca deben persistirse ni exponerse en navegador.
- El `.p12`, su contraseña y credenciales SUNAT deben manejarse exclusivamente en backend con cifrado, auditoría y rotación.

## Objetivo

Preparar el sistema para una facturación electrónica escalable sin romper la arquitectura actual de ERP.

Este documento cruza requisitos fiscales/SUNAT con el estado actual verificado en:

- `apps/api/prisma/schema.prisma`
- `apps/api/src/modules/facturacion/`
- `apps/api/src/modules/config/`
- `packages/shared/src/schemas/facturacion.schema.ts`
- `packages/shared/src/types/facturacion.type.ts`
- `packages/shared/src/schemas/config-reportes.schema.ts`
- `packages/shared/src/types/config-reportes.type.ts`

## Estado actual verificado

### Empresa

`ConfigEmpresa` ya guarda:

- `razonSocial`
- `ruc`
- `direccion`
- `telefono`
- `email`
- `logo`
- series de factura, boleta, nota de crédito y nota de débito
- correlativos por tipo
- `porcentajeIGV`

### Clientes

`Cliente` ya guarda:

- `tipo`: `NATURAL` o `EMPRESA`
- `dni`
- `ruc`
- `nombre`, `apellido`, `razonSocial`
- contacto y ubicación básica
- flags como `esGenerico` y `activo`

### Productos

`Producto` ya guarda:

- `sku`
- `nombre`
- `descripcion`
- `tipo`
- categoría, marca, modelo de catálogo y unidad de medida
- precios
- flags de inventario, número de serie y consumible
- códigos internos como `codigoBarras` y `codigoQr`

### Comprobantes

`Comprobante` ya guarda:

- venta asociada
- tipo, serie, correlativo y número
- snapshot básico del cliente
- subtotal, IGV y total
- estado
- XML/CDR/hash SUNAT
- intentos y fechas de envío

Base fiscal incremental ya modelada en Prisma:

- `ComprobanteDetalle`: línea fiscal congelable separada de `DetalleVenta`
- `ComprobanteEnvioLog`: logs de envío/respuesta futuros del proveedor
- `ConfigEmpresaFiscal`: datos tributarios no sensibles de empresa
- `SerieDocumento`: series/correlativos por tipo de documento
- `ClienteValidacionSunat`: resultado normalizado de validación documental de cliente

Runtime mínimo aplicado:

- al emitir factura/boleta se crean filas en `ComprobanteDetalle` dentro de la misma transacción que la cabecera
- el `Comprobante` guarda snapshot básico de emisor desde `ConfigEmpresaFiscal` o fallback de `ConfigEmpresa`
- el envío asíncrono prioriza `ComprobanteDetalle` para construir payloads cuando existe snapshot fiscal
- `ComprobanteEnvioLog` registra inicio, respuestas dev/proveedor y errores de envío
- `SerieDocumentoService` usa `SerieDocumento` cuando existe y cae a correlativos heredados de `ConfigEmpresa` como compatibilidad temporal
- endpoints administrativos permiten gestionar configuración fiscal no sensible, series documentales, validaciones de cliente y logs de envío fiscal

SUNAT directo formal ya tiene una implementación inicial en backend y UI administrativa. La emisión real aún no está certificada contra SUNAT beta con datos del contribuyente; por eso producción sigue bloqueada hasta completar `docs/sunat-beta-checklist.md`.

Hardening reciente aplicado:

- `sendBill` ya no marca aceptación solo por HTTP `200`: interpreta el CDR ZIP/XML y usa `ResponseCode`/`Description` para aceptar o rechazar.
- `SUNAT_ENVIRONMENT=PRODUCCION` bloquea la aceptación local de desarrollo si falta certificado, credenciales o servicios SUNAT.
- el ambiente fiscal usa `SUNAT_ENVIRONMENT` como override y cae a `ConfigEmpresaFiscal.ambienteDefault` cuando no hay variable de entorno.
- las series documentales se seleccionan por ambiente SUNAT cuando existe `SerieDocumento`.
- las boletas sin DNI válido congelan documento de público general (`tipo 0`, `00000000`).
- las facturas validan RUC de cliente con prefijo `10` o `20` antes de emitir.

## Brechas para facturación electrónica seria

### Configuración tributaria de empresa

Ya existe base para:

- nombre comercial fiscal
- domicilio fiscal
- ubigeo fiscal
- código SUNAT del establecimiento principal
- correo electrónico asociado al SEE
- régimen tributario
- formato de impresión por defecto: A4, ticket o ambos
- pie de impresión
- certificado digital `.p12/.pfx` propio para SUNAT directo
- clave de certificado y credenciales SOL cifradas/referenciadas
- ambiente SUNAT separado: `BETA` / `PRODUCCION`

Pendiente antes de producción:

- validar beta real con RUC/certificado/usuario SOL del contribuyente
- decidir storage productivo definitivo para `.p12/.pfx` cifrado
- definir política de rotación de llave maestra y certificados
- revisar con contador los datos fiscales, series y casos de notas

Regla de diseño:

- no guardar claves de certificado en texto plano
- preferir almacenamiento cifrado, secret manager o referencia segura
- separar configuración operativa de configuración fiscal sensible

### Series y correlativos

Aún existen series heredadas en `ConfigEmpresa` como fallback temporal, pero la fuente canónica nueva es `SerieDocumento`.

Para escalar se usa tabla propia con:

- tipo de documento
- serie
- correlativo actual
- sede/local asociado
- activo
- ambiente: beta, homologación, producción si aplica

Esto permite crecer a múltiples locales, múltiples cajas o múltiples emisores internos.

### Clientes

El modelo actual sirve como base, pero para emisión electrónica conviene normalizar:

- tipo de documento SUNAT Catálogo 06
- número de documento
- nombre completo o razón social normalizada
- dirección fiscal o dirección declarada
- email de envío
- estado de validación SUNAT
- condición de domicilio SUNAT
- fecha de última validación

Reglas de emisión actuales y futuras:

- factura: exige RUC válido con prefijo `10` o `20`
- factura: exige nombre fiscal disponible desde razón social o datos del cliente
- boleta: permite consumidor final con documento SUNAT `0` y número `00000000` cuando no hay DNI válido
- boleta: pedir documento si el cliente lo solicita o si supera el umbral legal aplicable

### Productos y servicios

El catálogo actual cubre operación comercial, pero para XML/UBL conviene agregar:

- descripción fiscal larga
- unidad de medida SUNAT
- tipo de afectación IGV
- código Producto SUNAT opcional
- código GS1 opcional
- indicador ICBPER si aplica
- tipo fiscal: bien o servicio

El `sku` puede seguir siendo código interno.

### Detalle de comprobante

Actualmente el comprobante se apoya en venta y detalles de venta.

Para auditoría fiscal conviene guardar snapshot inmutable de cada línea emitida:

- código interno
- descripción al momento de emitir
- unidad SUNAT
- cantidad
- valor unitario
- precio unitario
- descuento
- tipo de afectación IGV
- base imponible
- IGV
- total línea

Esto evita que cambios futuros del producto alteren la reconstrucción fiscal del comprobante.

### Snapshot del emisor

El comprobante debería guardar snapshot del emisor usado al emitir:

- RUC
- razón social
- nombre comercial
- dirección fiscal
- ubigeo
- código de local anexo

Esto protege el historial si la empresa cambia su configuración después.

## Recomendación de arquitectura

### Base de datos

Modelos separados ya agregados al schema Prisma para:

- configuración fiscal de empresa no sensible (`ConfigEmpresaFiscal`)
- series/correlativos por documento (`SerieDocumento`)
- validaciones SUNAT de clientes (`ClienteValidacionSunat`)
- detalle fiscal de comprobante (`ComprobanteDetalle`)
- logs de envío/respuesta del proveedor SUNAT (`ComprobanteEnvioLog`)

Implementado para SUNAT directo:

- `EmpresaSedeFiscal` para locales anexos/sedes y código SUNAT de establecimiento
- `CertificadoDigital` para metadata y referencia privada al `.p12` cifrado
- `FiscalSecret` para secretos cifrados/referenciados
- `AmbienteSunat` para separar `BETA` y `PRODUCCION`
- relación de `SerieDocumento` con sede fiscal y ambiente
- almacenamiento local privado del `.p12` cifrado y contraseña cifrada/referenciada

Pendiente para producción:

- extracción completa de metadata del certificado desde `.p12`
- decisión final de almacenamiento productivo: MinIO privado, KMS/Vault/secret manager o filesystem protegido
- rotación formal de llave maestra

### Backend

Separar responsabilidades:

- `FacturacionService`: casos de uso del módulo
- `SerieDocumentoService`: generación transaccional de serie/correlativo con fallback heredado
- `ComprobanteSnapshotService`: snapshot fiscal inicial de cliente y líneas
- `ComprobanteDetalleService`: persistencia de líneas fiscales congelables
- `SunatPayloadBuilder`: construcción de XML/UBL desde snapshots fiscales — implementado para factura/boleta inicial y UBL inicial `CreditNote`/`DebitNote` desde el comprobante origen congelado
- `SunatXmlSigner`: firma XML usando certificado activo del backend — implementado con `xml-crypto` y `.p12` extraído vía `node-forge`; firma `Invoice`, `CreditNote` y `DebitNote`
- `SunatDirectGateway` o `SunatDirectProvider`: cliente interno para servicios SUNAT directo, no proveedor externo — implementado como SOAP `sendBill`, `getStatus` y `getStatusCdr`
- `CertificateService`: validación, metadata parcial, rotación y acceso controlado al certificado — fase inicial implementada
- `FiscalSecretsService`: cifrado/descifrado de secretos con llave maestra externa al código y DB — implementado con AES-256-GCM y `FISCAL_MASTER_KEY_BASE64`
- `SunatCredentialsService`: guardado cifrado de credenciales SOL en `FiscalSecret`, con fallback temporal a variables `SUNAT_SOL_*`; formulario visible implementado en `Tributario > Certificado`
- `PdfService`: impresión A4/ticket

### Frontend

Separar settings de facturación en secciones:

- Empresa: branding y datos públicos no sensibles
- Tributario: datos fiscales, sedes, series, validaciones y logs
- Certificado digital: carga/reemplazo `.p12` solo ADMIN; contraseña transitoria; no mostrar secreto luego de guardar
- Ambiente SUNAT: beta/producción por sede/serie cuando aplique
- Impresión
- Validación SUNAT

No mezclar certificado/clave en formularios genéricos de empresa. El frontend solo debe mostrar estados como `certificado cargado`, `vigente hasta`, `última prueba`, `fingerprint parcial`; nunca el `.p12`, contraseña ni clave privada.

## Plan de implementación recomendado

### Fase 1 - Contratos compartidos

- agregar enums fiscales en `packages/shared`
- agregar schemas Zod para configuración fiscal
- agregar tipos para cliente fiscal, producto fiscal y series

### Fase 2 - Prisma

- crear migraciones para nuevas tablas/campos
- mantener compatibilidad con `ConfigEmpresa` actual
- migrar series existentes a tabla nueva si se decide separar

### Fase 3 - Backend SUNAT directo

- reforzar validaciones por tipo de comprobante
- snapshot fiscal inmutable
- `SunatPayloadBuilder` para XML UBL — implementado para factura/boleta inicial y `CreditNote`/`DebitNote` iniciales
- `SunatXmlSigner` para firma XML — implementado para `Invoice`, `CreditNote` y `DebitNote`
- `SunatDirectGateway` para envío/consulta SUNAT beta y producción — `sendBill`, `getStatus` y `getStatusCdr` implementados con fixtures unitarios
- `CertificateService`, `FiscalSecretsService` y `SunatCredentialsService`
- logs de envío y respuesta en `ComprobanteEnvioLog`; las notas crédito/débito registran eventos sobre el comprobante origen
- pruebas unitarias para reglas fiscales, firma, errores de credenciales, CDR, certificados y logs

### Fase 4 - Frontend

- formularios de configuración tributaria
- validadores de RUC/DNI cuando corresponda
- UI de series y correlativos por documento
- UI de certificado digital sin exponer clave almacenada — fase inicial implementada
- UI de sedes/locales anexos SUNAT — implementada
- UI de prueba de certificado/conexión SUNAT en beta — implementada como prueba de configuración/endpoint; pendiente envío beta real con CPE de prueba
- Acción manual `Consultar SUNAT/CDR` en `Ventas > Facturación` — implementada para comprobantes enviados/aceptados/rechazados; consume endpoint backend y no expone secretos
- Panel lateral `Ver` en `Ventas > Facturación` — implementado para revisar XML/CDR disponible, líneas fiscales congeladas y logs de envío
- Checklist de prueba beta real — documentado en `docs/sunat-beta-checklist.md`
- UI de credenciales SOL cifradas — implementada en `Tributario > Certificado`; usa hooks de `use-facturacion.ts` y no expone contraseña ni usuario completo

### Fase 5 - QA

- tests de emisión factura
- tests de emisión boleta consumidor final
- tests de boleta con identificación obligatoria
- tests de correlativo transaccional
- tests de snapshot inmutable
- tests de error de proveedor SUNAT

## No implementar todavía sin decidir

Decisiones ya tomadas:

- proveedor externo inicial: ninguno
- integración: SUNAT directo
- se manejará certificado propio desde el sistema con upload ADMIN seguro

Antes de habilitar producción aún hay que definir/cerrar:

- si habrá una sola sede inicial o múltiples locales desde el arranque
- política exacta de almacenamiento seguro para `.p12`
- llave maestra: KMS/Vault/secret manager o variable de entorno protegida para MVP
- formato inicial de impresión: A4, ticket o ambos
- si se usará cliente genérico para boletas simples
- checklist tributario con contador antes de emisión real
- validación beta real de los UBL iniciales `Invoice`, `CreditNote` y `DebitNote`, especialmente catálogos de motivo, montos y líneas de ajuste, siguiendo `docs/sunat-beta-checklist.md`
