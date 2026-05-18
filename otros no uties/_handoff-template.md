# Plantilla de handoff entre sprints

Usa esta plantilla cuando un sprint desbloquea otro y hay contrato tecnico
entre servicios o equipos. Copia este archivo dentro del sprint origen y
renombralo, por ejemplo: `01-handoff-a-10-auth.md`.

## 1) Resumen

- Sprint origen:
- Sprint destino:
- Fecha:
- Responsable:
- Estado del handoff: BORRADOR | REVISADO | ACEPTADO

## 2) Alcance entregado

- Objetivo del handoff:
- Que queda implementado y usable hoy:
- Que no esta incluido (fuera de alcance):

## 3) Contratos entregados

### API REST

| Endpoint | Metodo | Auth | Request | Response | Notas |
|----------|--------|------|---------|----------|-------|
| `/api/v1/...` | GET/POST/PATCH | Public/JWT + Roles | schema/tipo | schema/tipo | |

### Eventos WebSocket (si aplica)

| Evento | Room/Canal | Payload | Trigger de negocio | Notas |
|--------|------------|---------|--------------------|-------|
| `modulo.evento` | `user:{id}` / `rol:{rol}` | schema/tipo | accion que dispara | |

### Shared (`packages/shared`) (si aplica)

| Item | Ruta | Tipo de cambio | Compatible hacia atras |
|------|------|----------------|------------------------|
| `SchemaX` | `packages/shared/src/...` | nuevo/actualizado | si/no |

## 4) Ejemplos reales de consumo

Incluye al menos un ejemplo feliz y uno de error por endpoint critico.

```json
{
  "request": {},
  "response": {
    "data": {},
    "meta": {
      "timestamp": "2026-01-01T00:00:00.000Z"
    }
  }
}
```

## 5) Errores y codigos esperados

| HTTP | `error.code` | Cuando ocurre | Mensaje esperado |
|------|--------------|---------------|------------------|
| 401  | `UNAUTHORIZED` | token invalido o ausente | ... |
| 403  | `FORBIDDEN` | rol sin permiso | ... |
| 429  | `TOO_MANY_REQUESTS` | rate limit | ... |

## 6) Permisos por rol

| Recurso / accion | ADMIN | ENCARGADO | TECNICO |
|------------------|-------|-----------|---------|
| `modulo.accion`  | si/no | si/no     | si/no   |

## 7) Base de datos y migraciones

- Migraciones aplicadas:
- Tablas afectadas:
- Enums afectados:
- Cambios incompatibles (si hay):
- Plan de rollback:

## 8) Testing y validacion

- Unit tests relevantes:
- Integration/E2E relevantes:
- Pruebas manuales clave:
- Evidencia (comandos, reportes, screenshots, logs):

## 9) Riesgos, deudas y pendientes

- Riesgos conocidos:
- Decision tecnica tomada:
- Follow-ups no bloqueantes:

## 10) Aceptacion del sprint destino

- [ ] El sprint destino reviso este handoff
- [ ] El sprint destino pudo consumir el contrato sin cambios manuales ocultos
- [ ] Las dudas abiertas quedaron resueltas o registradas
- [ ] El handoff queda marcado como ACEPTADO
