# Checklist de pruebas SUNAT beta directo

Este documento guía la primera prueba real contra SUNAT beta usando la implementación actual de SUNAT directo.

Estado del sistema al crear este checklist:

- No se usa Nubefact ni proveedor fiscal externo.
- La integración fiscal es SUNAT directo desde backend.
- El frontend no firma XML ni maneja secretos persistentes.
- El backend genera UBL inicial para `Invoice`, `CreditNote` y `DebitNote`.
- El backend firma XML con `.p12/.pfx` activo, arma ZIP y llama SOAP `sendBill`.
- El backend consulta estado/CDR con `getStatus` y `getStatusCdr`.
- La UI `Tributario` permite cargar certificado y probar configuración.
- La UI `Ventas > Facturación` permite consultar `SUNAT/CDR` y ver logs/líneas fiscales.

## Objetivo

Validar con SUNAT beta real que el flujo completo funciona o, si SUNAT rechaza, capturar rechazos concretos para ajustar XML UBL, catálogos, firma, totales o datos fiscales.

No se debe habilitar producción hasta completar esta prueba con evidencia.

## Reglas de seguridad

- No subir certificado `.p12/.pfx` real al repositorio.
- No copiar contraseña de certificado en tickets, commits, logs ni documentación.
- No usar variables `NEXT_PUBLIC_*` para secretos.
- No guardar certificado ni contraseña en `ConfigEmpresa`.
- No probar desde frontend con credenciales directas; siempre backend.
- No activar `PRODUCCION` hasta que beta esté validado y revisado.
- No volver a Nubefact ni a otro proveedor externo.

## Prerrequisitos reales

Antes de iniciar la prueba real, conseguir con el contribuyente/contador:

- RUC emisor autorizado para beta.
- Razón social fiscal exacta.
- Dirección fiscal y ubigeo correctos.
- Código de establecimiento SUNAT/local anexo, normalmente `0000` para sede principal si aplica.
- Certificado digital `.p12` o `.pfx` válido.
- Contraseña del certificado.
- Usuario SOL secundario o usuario completo requerido por SUNAT.
- Contraseña SOL correspondiente.
- Cliente de prueba para factura con RUC válido en beta.
- Cliente de prueba para boleta, si se quiere validar boleta identificada.

Para ensayos locales sin datos reales se pueden usar datos ficticios, pero esos ensayos no certifican compatibilidad SUNAT.

## Variables de entorno backend

Configurar en el `.env` de la raíz, nunca en frontend:

| Variable | Uso | Requerido para prueba real |
| --- | --- | --- |
| `FISCAL_MASTER_KEY_BASE64` | Llave maestra para cifrar/descifrar secretos fiscales. Debe decodificar exactamente 32 bytes. | Sí |
| `FISCAL_MASTER_KEY_VERSION` | Versión lógica de llave, por ejemplo `v1`. | No |
| `FISCAL_PRIVATE_STORAGE_DIR` | Carpeta privada para `.p12` cifrados si se usa storage local. | Recomendado |
| `SUNAT_ENVIRONMENT` | `BETA` durante pruebas. | Sí |
| `SUNAT_BETA_URL` | Endpoint beta SUNAT. Hay default en backend. | No |
| `SUNAT_PRODUCCION_URL` | Endpoint producción SUNAT. Hay default en backend. | No para beta |
| `SUNAT_SOL_USERNAME` | Usuario completo si se configura como `RUC + usuario`. | Sí, si no se usa `SUNAT_SOL_USER` |
| `SUNAT_SOL_USER` | Usuario SOL sin RUC; backend arma `RUC + usuario`. | Sí, si no se usa `SUNAT_SOL_USERNAME` |
| `SUNAT_SOL_PASSWORD` | Contraseña SOL. | Sí |
| `SUNAT_DIRECT_DEV_MODE` | Debe ser `false` para no aceptar localmente si falta configuración. | Sí para prueba real |

Recomendación para beta real:

- `SUNAT_ENVIRONMENT=BETA`
- `SUNAT_DIRECT_DEV_MODE=false`

## Preparación técnica

1. Levantar infraestructura local si aplica:
   - PostgreSQL.
   - Redis.
   - MinIO si se usará en el futuro; hoy el `.p12` cifrado local no depende de MinIO.
2. Verificar que Prisma esté generado y válido.
3. Verificar API y web:
   - `pnpm --filter @erp/api type-check`
   - `pnpm --filter @erp/web type-check`
4. Iniciar API y web.
5. Entrar con usuario `ADMIN`.

## Configuración en UI `Tributario`

### 1. Configuración fiscal

En `Configuración > Tributario` completar:

- RUC.
- Razón social fiscal.
- Nombre comercial si aplica.
- Dirección fiscal.
- Ubigeo fiscal.
- Código de establecimiento.
- Correo SEE si aplica.
- Régimen tributario si aplica.
- Ambiente default: `BETA`.

Guardar y confirmar que no aparezcan errores.

### 2. Establecimiento SUNAT de sede única

La operación actual es de sede única. No habilitar ni simular multi-sede operativo para esta prueba.

Validar que `Configuración fiscal` tenga:

- Código de establecimiento SUNAT de la sede principal, normalmente `0000` si aplica.
- Dirección fiscal y ubigeo fiscal correctos.

Si el backend tiene registros en `EmpresaSedeFiscal`, tratarlos solo como locales fiscales SUNAT de soporte técnico, no como sucursales operativas. La prueba beta puede hacerse con el código de establecimiento de `ConfigEmpresaFiscal` y series documentales del ambiente `BETA`.

### 3. Series documentales beta

Crear o verificar series activas en ambiente `BETA`:

- Factura: serie que empiece con `F`, por ejemplo una serie beta asignada.
- Boleta: serie que empiece con `B`, si se probará boleta.
- Nota de crédito: serie que corresponda, por ejemplo `FC01` si el contribuyente la usa para pruebas.
- Nota de débito: serie que corresponda, por ejemplo `FD01` si el contribuyente la usa para pruebas.

Importante: las series/correlativos deben ser coherentes con SUNAT beta y con lo que ya se haya emitido en pruebas.

### 4. Certificado digital

En la pestaña de certificado:

1. Seleccionar `.p12` o `.pfx`.
2. Escribir contraseña transitoria.
3. Guardar.
4. Confirmar que quede activo.
5. Revisar metadata visible:
   - fingerprint parcial/completo según UI,
   - vigencia si fue extraída,
   - sujeto/emisor si aparece.

La contraseña solo debe viajar en la petición HTTPS y luego quedar cifrada/referenciada en backend.

### 5. Probar SUNAT

Usar botón `Probar SUNAT`.

Resultado esperado:

- Endpoint beta resuelto.
- Usuario configurado.
- Password configurado.
- Certificado activo detectado.
- Sin exponer contraseña ni certificado.

Si falla, revisar:

- `FISCAL_MASTER_KEY_BASE64`.
- Certificado activo.
- Contraseña del certificado.
- Variables `SUNAT_SOL_*`.
- `SUNAT_DIRECT_DEV_MODE=false` para evitar falsos positivos.

## Prueba 1: factura beta

1. Crear o reutilizar una venta entregada/confirmada con cliente RUC válido.
2. Emitir `FACTURA`.
3. Revisar en `Ventas > Facturación`:
   - estado inicial `PENDIENTE` o `ENVIADO`,
   - luego `ACEPTADO` o `RECHAZADO` según respuesta SUNAT.
4. Abrir `Ver`:
   - confirmar XML firmado si existe,
   - confirmar CDR si existe,
   - revisar logs.
5. Si queda `ENVIADO`, usar `Consultar SUNAT/CDR`.

Evidencia a guardar fuera del repo:

- Número de comprobante.
- Estado final.
- Código SUNAT.
- Mensaje SUNAT.
- CDR si existe.
- XML firmado si se requiere para depuración.

## Prueba 2: boleta beta

1. Crear o reutilizar una venta confirmada/entregada para boleta.
2. Emitir `BOLETA`.
3. Repetir validaciones de factura.
4. Si SUNAT exige identificación o regla especial, registrar el rechazo exacto.

## Prueba 3: nota de crédito beta

1. Partir de una factura o boleta `ACEPTADA`.
2. Crear nota de crédito desde API/UI disponible.
3. Motivo recomendado para primera prueba: anulación o descuento simple, según datos permitidos por el contador.
4. Revisar job `enviar-nota-credito`.
5. Revisar logs sobre el comprobante origen.
6. Consultar SUNAT/CDR si queda pendiente.

Advertencia técnica actual:

- El UBL `CreditNote` inicial genera una línea de ajuste basada en `monto` y prorrateo de IGV del comprobante origen.
- Si SUNAT rechaza por detalle de línea, se debe ampliar el modelo de nota para congelar líneas específicas de nota.

## Prueba 4: nota de débito beta

1. Partir de un comprobante `ACEPTADO`.
2. Crear nota de débito con motivo simple permitido por SUNAT/contador.
3. Revisar job `enviar-nota-debito`.
4. Revisar logs sobre el comprobante origen.
5. Consultar SUNAT/CDR si queda pendiente.

Advertencia técnica actual:

- El UBL `DebitNote` inicial también genera una línea de ajuste basada en `monto` y prorrateo de IGV.
- Puede requerir ajustes de catálogo/motivo o modelo de detalle.

## Interpretación inicial de respuestas

| Caso | Acción |
| --- | --- |
| `accepted=true` y código `0` | Registrar como aceptado y guardar CDR. |
| Código `98` | Documento en proceso; usar `Consultar SUNAT/CDR` más tarde. |
| Código `99` | Rechazo; revisar mensaje y ajustar XML/datos. |
| SOAP fault | Revisar credenciales, endpoint, ZIP, nombre de archivo o XML. |
| Error de certificado | Revisar `.p12`, contraseña, vigencia y llave maestra. |
| Error de credenciales | Revisar `SUNAT_SOL_USERNAME`/`SUNAT_SOL_USER` y contraseña. |

La tabla es operativa, no reemplaza documentación oficial SUNAT.

## Datos a capturar por rechazo

Cuando SUNAT rechace, registrar:

- Tipo de documento.
- Número completo.
- Ambiente.
- Código respuesta.
- Mensaje exacto.
- Evento en `ComprobanteEnvioLog`.
- Request payload seguro del log.
- Response payload seguro del log.
- XML firmado, solo en canal seguro y fuera del repo.
- CDR si existe.

Nunca registrar:

- contraseña SOL,
- contraseña del certificado,
- `.p12/.pfx`,
- llave `FISCAL_MASTER_KEY_BASE64`.

## Criterios mínimos para cerrar beta

Se puede considerar beta funcional cuando estén cumplidos:

- Factura beta aceptada.
- Boleta beta aceptada o rechazo entendido por regla de negocio.
- Consulta `getStatusCdr` devuelve CDR o estado coherente.
- Nota de crédito aceptada o rechazo documentado con plan de ajuste.
- Nota de débito aceptada o rechazo documentado con plan de ajuste.
- Logs fiscales guardan evidencia suficiente sin secretos.
- UI muestra estado y logs correctamente.
- `SUNAT_DIRECT_DEV_MODE=false` fue usado durante la prueba real.

## Ajustes probables después de beta

Según los rechazos reales, puede tocar ajustar:

- códigos de motivo para notas.
- cálculo de impuestos y redondeos.
- estructura de líneas de nota crédito/débito.
- datos obligatorios del emisor.
- datos obligatorios del cliente.
- unidad SUNAT.
- tipo de operación.
- namespaces o nodos UBL adicionales.
- política de almacenamiento de XML/CDR.

## Punto de no retorno a producción

No pasar a `SUNAT_ENVIRONMENT=PRODUCCION` hasta tener:

- aceptación beta documentada,
- revisión con contador,
- backup/rotación de certificado decididos,
- política de llave maestra decidida,
- checklist de emisión y contingencia,
- pruebas de anulación/resumen si aplican al alcance legal.
