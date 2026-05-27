# Documentación: Módulo de Facturación Electrónica SUNAT

> Documentación técnica y normativa del módulo de Ventas, Comprobantes Electrónicos
> y comunicación con SUNAT del sistema ERP. Esta documentación es la **fuente de
> verdad** para cualquier desarrollador o agente que vaya a corregir, extender o
> auditar el módulo.

---

## Cómo leer esta documentación

Los documentos están numerados por **dependencia conceptual**, no por orden de
implementación. Para entender el sistema completo léelos en orden 01 → 12. Para
corregir algo puntual ve directo al que corresponde.

| # | Documento | Cuándo consultarlo |
|---|---|---|
| 01 | [Arquitectura](./01-arquitectura.md) | Antes de tocar el modelo de datos o los estados |
| 02 | [Flujos operativos](./02-flujos-operativos.md) | Al diseñar pantallas, transiciones o casos de uso |
| 03 | [Normativa SUNAT](./03-normativa-sunat.md) | Plazos, modalidades, catálogos, reglas legales |
| 04 | [Comunicación de baja](./04-comunicacion-baja.md) | Para anular un comprobante aceptado |
| 05 | [Notas de crédito y débito](./05-notas-credito-debito.md) | Para emitir NC/ND, casos regular y excepcional |
| 06 | [Cola SUNAT](./06-cola-sunat.md) | Worker BullMQ, idempotencia, reintentos, contingencia |
| 07 | [Almacenamiento documental](./07-almacenamiento-documental.md) | XML, CDR, PDF, MinIO, portal cliente |
| 08 | [Configuración tributaria](./08-configuracion-tributaria.md) | Certificados, series, ambiente, credenciales |
| 09 | [UI de Comprobantes](./09-ui-comprobantes.md) | Diseño del hub `/erp/comprobantes` |
| 10 | [Problemas actuales a corregir](./10-problemas-actuales.md) | Lista priorizada de bugs y deudas |
| 11 | [Roadmap de implementación](./11-ROADMAP-Y-CHECKLIST.md) | Orden recomendado de trabajo |
| 12 | [Referencias y glosario](./12-referencias.md) | Catálogos, librerías, links oficiales SUNAT |

---

## Decisiones arquitectónicas tomadas

Estas decisiones están **cerradas** y son la base de toda la documentación. Si
necesitas cambiar alguna, primero actualiza esta sección y luego revisa en
cascada los documentos afectados.

| # | Decisión | Valor |
|---|---|---|
| D1 | Modalidad de envío de boletas | **Individual** (mismo canal que facturas) |
| D2 | Canal de envío a SUNAT | **SUNAT directo** (SOAP, sin OSE/PSE intermedio) |
| D3 | Almacenamiento documental | **MinIO self-hosted** (S3-compatible, sin cloud por ahora) |
| D4 | Portal de consulta del cliente | **Sí**, obligación legal de 1 año |
| D5 | Patrón de UI | **Patrón B + emisión rápida en POS** |
| D6 | Versión UBL | **UBL 2.1** (XSD 2022-02-28, XSL 2022-09-06) |
| D7 | Estado fiscal en venta | **Campo separado** (`estadoFacturacion`), no colapsado en `estado` |
| D8 | Snapshot fiscal | **Inmutable** desde la emisión, en JSONB o tabla aparte |

### Por qué cada decisión

**D1 — Boletas individuales**: simplifica el código (un solo canal de envío para
todo), feedback inmediato al usuario, sin cron de resumen diario que pueda
fallar silencioso. El plazo legal de 5 días calendario es más que suficiente. Si
el volumen llega a miles de boletas/día se puede activar la modalidad RESUMEN
sin romper el modelo (ver [03-normativa-sunat](./03-normativa-sunat.md)).

**D2 — SUNAT directo**: ya está implementado en código, evita costos y
dependencias de proveedores. Contrapartida: el equipo asume responsabilidad
operativa cuando SUNAT cae o cambia el WSDL/UBL. Mitigación en
[06-cola-sunat](./06-cola-sunat.md) (contingencia, alertas, reintentos).

**D3 — MinIO**: object storage self-hosted, **API 100% compatible con S3**, se
corre en Docker, cero vendor lock-in. Cuando se quiera migrar a S3 / R2 / Azure
Blob es solo cambiar endpoint y credenciales. Detalles en
[07-almacenamiento-documental](./07-almacenamiento-documental.md).

**D4 — Portal cliente**: SUNAT exige poner los comprobantes a disposición del
receptor por al menos un año vía web. Hacerlo desde v1 cuesta menos que
retrofittearlo después.

**D5 — Patrón B + POS rápido**: separa el rol del vendedor (cierra la venta) del
facturador (gestiona SUNAT), pero permite el flujo "vender + emitir + entregar
ticket" en POS para boletas a consumidor final, que son el grueso del volumen.
Para facturas, siempre por la bandeja con validaciones completas.

**D7 — Estado fiscal separado**: la venta tiene un ciclo *comercial* (cotizada,
confirmada, entregada, cancelada) y un ciclo *fiscal* (sin comprobante, en
emisión, emitida, rechazada, anulada). Mezclarlos en un solo enum (como
`FACTURADA`) hace imposible distinguir, por ejemplo, "entregada y rechazada por
SUNAT" de "entregada sin comprobante todavía". Detalle en
[01-arquitectura](./01-arquitectura.md).

---

## Resumen ejecutivo del sistema

El módulo se compone de **tres capas con responsabilidades distintas** que se
comunican por eventos:

```
┌──────────────────┐    evento     ┌──────────────────┐    job    ┌──────────────────┐
│     VENTAS       │ ───────────▶ │  COMPROBANTES    │ ────────▶│     SUNAT        │
│  (comercial)     │               │    (fiscal)      │           │  (canal SOAP)    │
│                  │ ◀───────────  │                  │ ◀────────│                  │
│  stock, caja,    │   evento      │  XML, firma,     │   CDR     │  cola BullMQ     │
│  equipos, etc.   │               │  CDR, baja, NC   │           │  reintentos      │
└──────────────────┘               └──────────────────┘           └──────────────────┘
       │                                   │                              │
       │                                   ▼                              ▼
       │                          ┌──────────────────────────────────────────┐
       │                          │  ALMACENAMIENTO DOCUMENTAL (MinIO)       │
       │                          │  XML firmado · CDR · PDF · 5+ años       │
       │                          └──────────────────────────────────────────┘
       │
       ▼
┌──────────────────┐
│  CONFIGURACIÓN   │
│   TRIBUTARIA     │
│  cert, series,   │
│  ambiente, val.  │
└──────────────────┘
```

**Regla mental clave**: la venta es comercial, el comprobante es fiscal, son
dos máquinas de estado distintas que se sincronizan por eventos. Si esto queda
claro en el código, todo lo demás se ordena solo.

---

## Problemas conocidos resumidos (ver [10-problemas-actuales](./10-problemas-actuales.md))

> Estado tras Sprints 1-11: todos los problemas P0/P1/P2 listados están
> resueltos. Detalle del cierre por sprint en
> [11-ROADMAP-Y-CHECKLIST.md](./11-ROADMAP-Y-CHECKLIST.md).

| Prio | Problema | Estado |
|------|----------|--------|
| P0 | Venta marca `FACTURADA` antes de CDR aceptado | ✅ Resuelto (Sprint 1, `EstadoFacturacionVenta`) |
| P0 | Anulación local sin comunicación de baja real a SUNAT | ✅ Resuelto (Sprint 4-7, `ComunicacionBaja` + RA) |
| P0 | XML/CDR guardados en BD como contenido | ✅ Resuelto (Sprint 9, MinIO + `*StorageKey`) |
| P0 | Modalidad de boletas no parametrizada | ✅ Resuelto (Sprint 6, `modalidadEnvioBoletas`) |
| P1 | `ClienteValidacionSunat` no integrado profundamente en emisión | ✅ Resuelto (Sprint 10, `ValidacionFiscalService`) |
| P1 | Sin idempotencia ni consulta de ticket | ✅ Resuelto (Sprint 6, `operationId` + `cola-consulta-ticket`) |
| P2 | Sin portal de consulta para cliente receptor | ✅ Resuelto (Sprint 9, `/portal-cliente` + Modo C) |
| P2 | Docs internos hablaban de proveedor fiscal externo; código usa SUNAT directo | ✅ Resuelto (Sprint 11 Fase 0, env vars muertos eliminados) |

---

## Convenciones usadas en esta documentación

- **Bloques de código en TypeScript / Prisma** son sugerencias de estructura, no
  necesariamente el código final. Ajustar nombres a la convención del proyecto.
- **Diagramas en ASCII** son los oficiales; si se reescriben en Mermaid o
  similar, mantener el ASCII como respaldo.
- **Catálogos SUNAT** se referencian por número (Cat 09, Cat 13, etc.); las
  tablas completas están en [12-referencias](./12-referencias.md) o en el sitio
  oficial.
- **Plazos legales** se expresan en días calendario salvo que diga "hábiles".

---

## Mantenimiento de esta documentación

Cuando se haga un cambio arquitectónico o normativo:

1. Actualizar el documento específico afectado.
2. Si afecta una decisión de la tabla de arriba, actualizar este README.
3. Si afecta varios documentos, dejar nota en [11-ROADMAP-Y-CHECKLIST](./11-ROADMAP-Y-CHECKLIST.md).
4. Versión vigente de UBL y plazos: revisar 1× por trimestre contra
   [cpe.sunat.gob.pe](https://cpe.sunat.gob.pe/guias-y-manuales).
