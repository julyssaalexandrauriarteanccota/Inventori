# SPRINTS - Roadmap de ejecucion del ERP

Esta carpeta es la guia operativa para construir el proyecto sin perdernos.
Cada sprint tiene su propio archivo, su alcance, sus dependencias y su checklist
de cierre. La regla es simple: no abrir un sprint nuevo hasta cerrar el actual.

La fuente tecnica que manda sigue siendo `AGENTS.md`. Esta carpeta traduce esas
reglas a una ejecucion por sprints y las cruza con el `schema.prisma` real.

## Como usar esta carpeta

1. Leer primero `00-CHECKLIST-GLOBAL.md`.
2. Leer `00-REGLAS-AGENTS.md`.
3. Leer `00-MAPA-TABLAS.md`.
4. Abrir el sprint actual y trabajar solo contra ese archivo.
5. Marcar tareas conforme se implementen y validen.
6. No pasar al siguiente sprint hasta cumplir el checklist de cierre.
7. Si algo cambia de alcance, actualizar el sprint correspondiente y no improvisar.

## Estados sugeridos

- `PENDIENTE`
- `EN PROGRESO`
- `BLOQUEADO`
- `COMPLETADO`

## Estructura

- `00-CHECKLIST-GLOBAL.md` -> reglas de entrada, salida y handoff entre sprints
- `00-REGLAS-AGENTS.md` -> reglas obligatorias resumidas desde `AGENTS.md`
- `00-MAPA-TABLAS.md` -> mapa exacto de tablas/modelos del schema y su sprint dueno
- `_handoff-template.md` -> plantilla estandar para contratos entre sprints
- `01-...md` a `19-...md` -> un archivo por sprint
- `archive/` -> documentos viejos que ya no deben usarse como fuente activa

## Cobertura de base de datos

El `schema.prisma` activo contiene **52 modelos/tablas**.
Esta carpeta ya no se guia por una lista estimada: usa el schema real como
fuente de cobertura y reparte esas tablas por sprint en `00-MAPA-TABLAS.md`.

## Secuencia oficial

| Sprint | Archivo | Foco principal | Depende de |
|--------|---------|----------------|------------|
| 01 | `01-backend-auth-usuarios.md` | Auth + usuarios + base comun | Ninguno |
| 02 | `02-backend-clientes-proveedores-productos.md` | Datos maestros | 01 |
| 03 | `03-backend-inventario.md` | Stock y movimientos | 02 |
| 04 | `04-backend-equipos-garantias.md` | Equipos serializados y garantias | 02, 03 |
| 05 | `05-backend-compras.md` | Ordenes de compra y recepciones | 02, 03 |
| 06 | `06-backend-ventas-cotizaciones.md` | Cotizaciones y ventas | 02, 03, 04 |
| 07 | `07-backend-facturacion-sunat.md` | SUNAT y Nubefact | 06 |
| 08 | `08-backend-soporte-tecnico.md` | Tickets y taller | 02, 03, 04 |
| 09 | `09-backend-config-reportes.md` | Configuracion y reportes | 01-08 |
| 10 | `10-frontend-shell-auth.md` | Shell ERP y login | 01 |
| 11 | `11-frontend-modulos-core.md` | Clientes, productos, inventario, soporte | 10, 02-08 |
| 12 | `12-frontend-modulos-secundarios.md` | Ventas, compras, garantias, proveedores | 10, 11 |
| 13 | `13-frontend-sitio-publico.md` | Sitio publico SEO | 02, 04, 08 |
| 14 | `14-tiempo-real-websockets.md` | Eventos en tiempo real | 07, 08, 10 |
| 15 | `15-ai-ocr-clasificacion.md` | OCR y clasificacion | 04, 05, 08 |
| 16 | `16-pwa-offline-tecnicos.md` | Offline para tecnicos | 08, 11 |
| 17 | `17-integracion-qr-emails.md` | PDFs, QR y correos | 04, 05, 06, 07, 08 |
| 18 | `18-qa-testing-hardening.md` | QA integral y endurecimiento | 01-17 |
| 19 | `19-deploy-produccion.md` | Produccion y operacion | 18 |

## Reglas de trabajo

- Cada sprint debe cubrir backend, frontend, shared, testing y cierre cuando aplique.
- Si un area no aplica, se deja explicitamente indicado en el sprint.
- Toda tarea cerrada debe tener verificacion real, no solo codigo escrito.
- Si un sprint desbloquea contratos para otro, eso debe quedar documentado.
- Si un agente entra nuevo al repo, debe empezar por este `README.md`.
- Si hay conflicto entre esta carpeta y `AGENTS.md`, gana `AGENTS.md`.

## Nota de mantenimiento

El archivo viejo fue movido a `archive/SPRINTS-legacy.md`.
La fuente activa ahora es esta estructura por sprint.
