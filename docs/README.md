# docs

Documentación auxiliar del repositorio.

## Estructura

| Ruta | Función actual | Necesidad actual |
| --- | --- | --- |
| `contracts/` | Contratos por sprint para payloads, filtros y campos consumidos por backend/frontend | Necesario |
| [`../design/`](../design/README.md) | Guías de diseño visual: tipografías, colores, espaciado, layouts, UX, iconografía (carpeta separada en la raíz del repo) | Necesario para diseño/UI |
| `arquitectura-escalable-erp.md` | Plan final para separar ERP base, operación por rubro, catálogo específico y fiscalidad | Necesario para planificación |
| `handoff-arquitectura-escalable.md` | Resumen operativo actualizado para retomar el trabajo de arquitectura escalable en otro chat/agente | Necesario para continuidad |
| `configuracion-empresa-branding.md` | Plan para usar `ConfigEmpresa` como fuente de branding, datos públicos y textos configurables | Necesario para Bloque 1 |
| `seguimiento-arquitectura-escalable.md` | Checklist de implementación por bloques | Necesario para seguimiento |
| `auditoria-reventa-hardcoded.md` | Auditoría de textos/conceptos hardcodeados del rubro actual | Necesario para limpieza previa |
| `facturacion-sunat-roadmap.md` | Roadmap técnico futuro para facturación electrónica SUNAT | Necesario para planificación |
| `sunat-beta-checklist.md` | Checklist operativo para probar SUNAT directo contra beta real sin exponer secretos | Necesario antes de producción |
| `multisede-futuro.md` | Decisión actual de sede única y diseño futuro para multi-sede operativo | Necesario para no mezclar sedes fiscales con sedes operativas |
| `README-configuracion-empresa-tributario.md` | Handoff del trabajo realizado en Empresa, Tributario, branding, series, validaciones y logs | Necesario para continuidad entre chats |
| `superpowers/` | Specs de diseño usados en flujos de brainstorming y diseño | Auxiliar |

## `docs/contracts/`

Archivos detectados:

- `sprint-01-openapi.json`
- `sprint-02-master-data.md`
- `sprint-03-inventario.md`
- `sprint-04-equipos-garantias.md`
- `sprint-05-compras.md`
- `sprint-06-ventas.md`
- `sprint-07-facturacion.md`
- `sprint-08-soporte.md`
- `sprint-09-config-reportes.md`

### Estado

Esta carpeta debe conservarse.

Motivos verificados:

- `AGENTS.md` la declara como documentación clave del repo
- varios archivos de `SPRINTS/` apuntan directamente a estos contratos
- `apps/api` exporta `sprint-01-openapi.json` mediante `src/scripts/export-sprint-01-openapi.ts`
- `Sprint 10` referencia explícitamente `docs/contracts/sprint-01-openapi.json`

### Tipo de contenido

- `sprint-01-openapi.json`: contrato OpenAPI exportado desde `apps/api`
- `sprint-02` a `sprint-09`: contratos Markdown por dominio, alineados con `packages/shared` y endpoints backend

## `docs/superpowers/`

Contenido detectado:

- `specs/2026-04-11-erp-frontend-modules-and-modal-crud-design.md`
- `specs/2026-04-26-erp-page-header-toolbar-refactor-design.md`
- `specs/2026-04-26-erp-sidebar-shell-refactor-design.md`

### Estado

Esta carpeta no es necesaria para runtime, build ni tests.

Motivos verificados:

- no forma parte del arranque de `api`, `web`, `ai` ni `shared`
- no aparece como dependencia de build o test del proyecto
- sí aparece referenciada en las `skills` de brainstorming como ubicación por defecto para specs de diseño

### Conclusión práctica

- `docs/contracts/`: conservar
- `docs/superpowers/`: opcional

Si el objetivo es dejar el repo más limpio sin perder material operativo, `docs/superpowers/` es candidata a archivarse antes que `docs/contracts/`.
