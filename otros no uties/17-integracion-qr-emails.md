# Sprint 17 - QR, PDFs y emails transaccionales

- Estado: PENDIENTE
- Fase: Integracion
- Depende de: 04, 05, 06, 07, 08
- Desbloquea: Ninguno

## Objetivo

Cerrar la capa de comunicacion con el cliente: certificados, comprobantes,
resumenes de servicio y automatizacion de envios.

## Tablas y contratos consumidos por este sprint

- `Garantia`
- `Comprobante`
- `Ticket`
- `ConfigEmpresa`
- `Adjunto`
- `Venta`
- `DetalleVenta`
- `OrdenCompra`
- `DetalleOrdenCompra`

## Reglas AGENTS criticas para este sprint

- [ ] PDFs y evidencias deben seguir reglas de archivos del sistema
- [ ] Los QR deben apuntar a rutas publicas validas
- [ ] Los envios no deben romper el flujo principal si fallan
- [ ] Ownership con Sprint 06: Sprint 06 deja reglas de negocio y trigger base; este sprint implementa render PDF final y envio con adjuntos

## Checklist de implementacion

### Backend - `apps/api`

- [ ] Generar PDF de garantia con QR
- [ ] Generar PDF de cotizacion con `PDFKit` (logo empresa, datos fiscales, detalle items, precios sin IGV, total con IGV, fecha validez 15 dias)
- [ ] Generar PDF de orden de compra para proveedor
- [ ] Generar PDF de reporte de servicio tecnico (resumen de ticket cerrado: diagnostico, solucion, repuestos, montos)
- [ ] Integrar `POST /ventas/:id/enviar` (creado en Sprint 06) para adjuntar PDF final y registrar evidencia
- [ ] Enviar email con comprobante aceptado
- [ ] Enviar email de cierre de ticket
- [ ] Preparar integracion de WhatsApp si aplica
- [ ] Guardar evidencias generadas o enviadas

### Frontend - `apps/web`

- [ ] Exponer acciones para descargar o reenviar PDFs
- [ ] Generar PDF de cotizacion en el cliente con `@react-pdf/renderer` (boton "Descargar PDF")
- [ ] Mostrar estado de envio o evidencia de entrega

### Shared - `packages/shared`

- [ ] Confirmar contratos de documentos generados y estados de envio

### Testing

- [ ] Tests de generacion de QR y PDF
- [ ] Tests de servicios de email con mocks
- [ ] Validacion manual de enlaces QR y adjuntos

## Checklist de cierre

- [ ] Garantia genera certificado con QR usable
- [ ] Cotizacion genera PDF descargable y enviable por email
- [ ] Orden de compra genera PDF para proveedor
- [ ] Reporte de servicio tecnico genera PDF al cerrar ticket
- [ ] Comprobantes aceptados pueden enviarse por correo
- [ ] El cierre de ticket puede notificarse al cliente
- [ ] Los contratos documentales del sprint quedaron cubiertos
