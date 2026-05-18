# Sprint 04 - Contratos de equipos y garantias

## Alcance

Contratos compartidos para equipos serializados, historial de cliente,
telemetria SNMP y consulta de garantias.

## Contratos shared

- Tipos TypeScript: `packages/shared/src/types/equipos-garantias.type.ts`
- Schemas Zod: `packages/shared/src/schemas/equipos-garantias.schema.ts`
- Enums: `EstadoEquipo`, `EstadoGarantia`

## Payloads clave

### Equipo serializado

- `numeroSerie`, `productoId`
- opcionales: `estado`, `ubicacion`, `firmware`, `notas`

### Asignacion equipo-cliente

- `clienteId`
- opcionales: `ventaId`, `notas`

### Lectura SNMP

- niveles de toner, `paginasTotales`, `erroresActivos`, `estadoFusor`, `rawData`

### Garantia

- `equipoId`, `fechaInicio`, `fechaFin`, `cobertura`
- opcionales: `ventaId`, snapshot del cliente original, `exclusiones`, `estado`

### Caso de garantia

- crear: `descripcion`, opcional `ticketId`
- actualizar: `resolucion`, `aceptada`, `motivo`

## Consulta publica

- `GET /api/v1/garantias/verificar/:codigoQR`
- sin autenticacion
- respuesta publica congelada en `garantiaPublicResponseSchema`

## Endpoints backend cubiertos

- `POST /api/v1/equipos`
- `GET /api/v1/equipos`
- `GET /api/v1/equipos/:serie`
- `PATCH /api/v1/equipos/:serie`
- `POST /api/v1/equipos/:serie/asignar-cliente`
- `GET /api/v1/equipos/:serie/historial`
- `POST /api/v1/equipos/:serie/lecturas-snmp`
- `GET /api/v1/equipos/:serie/lecturas-snmp`
- `POST /api/v1/garantias`
- `GET /api/v1/garantias`
- `GET /api/v1/garantias/:id`
- `GET /api/v1/garantias/verificar/:codigoQR`
- `POST /api/v1/garantias/:id/casos`
- `PATCH /api/v1/garantias/:id/casos/:casoId`
