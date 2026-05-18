# README - Configuración Empresa y Tributario

## Propósito

Este documento resume el trabajo realizado en configuración de empresa, configuración tributaria/fiscal, series, validaciones SUNAT, logs y la decisión actual sobre sedes.

Sirve como handoff para retomar el trabajo en otro chat o sesión sin perder contexto.

## Estado general actual

El ERP queda actualmente definido como una operación de **sede única**.

Aunque el negocio pueda tener varias sedes en el futuro, por ahora no se debe exponer ni implementar multi-sede operativo. La configuración tributaria debe trabajar con una sede principal y código de establecimiento SUNAT por defecto, normalmente `0000`.

## Separación conceptual vigente

| Área | Uso actual | Fuente principal |
| --- | --- | --- |
| Empresa | Branding, datos públicos, contacto, portal público, metadata y PWA | `ConfigEmpresa` |
| Tributario | Emisor fiscal, SUNAT, certificados, series, validaciones y logs | `ConfigEmpresaFiscal` y modelos fiscales |
| Series | Series documentales fiscales para sede principal | `SerieDocumento` |
| Almacenes | Organización logística/stock | `Almacen` |
| Cajas | Operación POS/cobros | `Caja` |
| Multi-sede operativo | Futuro, no activo | documentado en `docs/multisede-futuro.md` |

## Trabajo realizado

### Inicialización y estado base

Se inicializó y verificó el proyecto completo:

- dependencias `pnpm` instaladas
- Prisma Client generado
- migraciones aplicadas
- seed ejecutado
- Docker local verificado
- health checks de `web`, `api` y `ai`
- `lint`, `type-check`, tests y build corregidos hasta quedar en verde

### Limpieza general previa

Se corrigieron problemas iniciales de:

- lint en `apps/web`
- lint en `apps/api`
- tests `apps/ai`
- tests e2e `apps/api`
- diagnósticos del editor
- README desactualizados

### Configuración Empresa

Se revisó que `ConfigEmpresa` sí tiene uso real:

- datos públicos
- branding
- contacto público
- contenido del portal público
- metadata
- PWA

Se mejoró la pestaña de branding en `Empresa`:

- preview de logo claro y logo oscuro
- preview de botones con color primario/secundario
- carga de imagen para PNG/JPG/WebP usando helper existente de uploads
- campos manuales para rutas/URLs como `/logo.svg` o `/favicon.ico`
- color picker nativo
- paletas separadas para color primario y secundario
- advertencia cuando primario y secundario son iguales
- botón para usar contraste recomendado
- explicación de que SVG/ICO deben ir por ruta pública o URL externa si no se suben como imagen

También se actualizó el portal público para que el logo configurado no reemplace completamente al nombre comercial: ahora logo y nombre comercial pueden mostrarse juntos.

### Tema oscuro y campos de formulario

Se ajustó el estilo global para que en modo oscuro/cálido los campos de texto no tomen fondo café/naranja. El acento puede afectar borde/focus, pero el fondo del campo queda neutro.

Esto afecta inputs, textareas y select triggers.

### Tributario / Fiscal

Se revisó la diferencia entre datos de empresa y datos fiscales:

- `Empresa` no debe ser el emisor fiscal definitivo.
- `Tributario > Configuración` debe ser la fuente para emisor fiscal/SUNAT.

Se agregó acción en tributario para copiar datos desde Empresa hacia el formulario fiscal:

- RUC
- razón social
- nombre comercial
- dirección

La copia es manual para evitar cambiar el emisor fiscal por accidente.

También se reforzó la UX de sede única:

- `codigoEstablecimiento` usa `0000` como valor de trabajo por defecto cuando no hay configuración previa
- la ayuda del campo explica que es establecimiento SUNAT de sede principal, no una sede operativa
- el botón de guardado queda deshabilitado si no hay cambios pendientes
- al guardar, el formulario se resetea contra la respuesta persistida

### Certificado y credenciales SUNAT

Se mejoró la pestaña `Tributario > Certificado`:

- muestra estado de emisor fiscal listo/pendiente junto a ambiente, certificado y series activas
- advierte si falta configurar RUC, razón social o dirección fiscal antes de cargar certificado o guardar SOL
- en modo `Usuario SOL sin RUC`, exige tener RUC fiscal configurado porque el usuario completo se deriva desde ese emisor
- permite usar `Usuario completo RUC + usuario` cuando se quiere evitar depender del RUC fiscal del formulario

### Series

Se decidió que las series válidas son las de `SerieDocumento` bajo Tributario.

La sección legacy `Series` del sidebar ya no queda como una configuración separada visible. Si se entra a la ruta legacy, se dirige a la pestaña canónica de series fiscales.

En modo sede única:

- no se elige sede fiscal en el formulario de series
- se mantiene `codigoEstablecimiento`, normalmente `0000`
- la UI explica que las series son para la sede principal
- la tabla usa `Estab. SUNAT` y evita hablar de `local` como si existiera multi-sede operativo
- el botón de sincronización legacy se muestra como importación de series existentes para no exponer jerga técnica

### Sedes

Se decidió retirar `Sedes` del apartado Tributario por ahora.

Motivo:

- el sistema actual es sede única
- exponer sedes fiscales daba la impresión de que existía multi-sede operativo
- eso aún no está implementado transversalmente

El futuro multi-sede quedó documentado en `docs/multisede-futuro.md`.

### Validaciones SUNAT

Se mejoró la UX de `Tributario > Validaciones`:

- `Tipo documento SUNAT` dejó de ser input libre
- ahora es selector limitado a documentos que el módulo `Clientes` soporta realmente:
  - RUC código `6`
  - DNI código `1`
  - Sin documento / público general código `0`, usando `00000000`
- no se habilitan documentos de clientes extranjeros porque el ERP actual solo gestiona RUC, DNI y público general
- se muestra texto de ayuda según el tipo elegido
- el número de documento valida según el tipo:
  - RUC: 11 dígitos y prefijo `10` o `20`
  - DNI: 8 dígitos y distinto de `00000000`
  - Sin documento: `00000000`
- `Cliente vinculado` dejó de pedir UUID manual
- ahora usa buscador de clientes
- al seleccionar cliente se autocompletan RUC/DNI o público general sin documento, tipo documento, nombre normalizado y dirección si existen
- `Condición de domicilio` ahora es selector y solo aplica a RUC:
  - Habido
  - No habido
  - No aplica / sin consulta
- para DNI y público general la condición de domicilio queda deshabilitada como `Sin consulta / no aplica`
- la tabla muestra tipo legible como `RUC (6)` en vez de solo `Tipo SUNAT 6`; registros antiguos con códigos no soportados se etiquetan como no soportados para clientes

### Logs fiscales

Se mejoró la UX de `Tributario > Logs`:

- ya no se pide escribir UUID manual para filtrar por comprobante
- se usa selector buscable de comprobantes recientes por número
- `Estado` ahora es selector
- `Tipo de evento` ahora es selector
- la tabla muestra nombre legible del evento y conserva el código técnico debajo
- `Vista por comprobante` ahora también usa selector por número de comprobante
- se agregó explicación de que los logs se generan automáticamente desde backend

## Archivos principales modificados

### Frontend

- `apps/web/src/components/settings-dialog.tsx`
- `apps/web/src/components/settings/fiscal-settings-content.tsx`
- `apps/web/src/components/settings/configuration-nav.ts`
- `apps/web/src/components/settings/configuration-page-content.tsx`
- `apps/web/src/components/settings-dialog-provider.tsx`
- `apps/web/src/components/public-brand-link.tsx`
- `apps/web/src/app/(public)/layout.tsx`
- `apps/web/src/app/page.tsx`
- `apps/web/src/app/globals.css`

### Backend/API

- `apps/api/src/common/types/express.d.ts`
- `apps/api/src/main.ts`
- DTOs fiscales en `apps/api/src/modules/facturacion/dto/`

### Shared

- `packages/shared/src/schemas/facturacion.schema.ts`
- `packages/shared/src/schemas/facturacion.schema.test.ts`

### Documentación

- `README.md`
- `docs/README.md`
- `docs/multisede-futuro.md`
- `docs/README-configuracion-empresa-tributario.md`

## Hardening reciente de facturación electrónica

Se reforzó el flujo SUNAT directo antes de continuar con nuevas funcionalidades:

- `sendBill` interpreta el CDR ZIP/XML devuelto por SUNAT y usa `ResponseCode`/`Description`; ya no acepta solo por HTTP `200`.
- el modo desarrollo local no puede marcar comprobantes como aceptados si el ambiente efectivo es `PRODUCCION`.
- el ambiente efectivo usa `SUNAT_ENVIRONMENT` como override y, si no existe, toma `ConfigEmpresaFiscal.ambienteDefault`.
- `SerieDocumento` se filtra por ambiente fiscal al generar correlativos.
- las facturas validan RUC de cliente con prefijo `10` o `20`.
- las boletas sin DNI válido se congelan como público general (`tipo documento 0`, `00000000`).
- se agregaron pruebas unitarias para CDR aceptado/rechazado, bloqueo de aceptación local en producción y snapshots de boleta.

Producción sigue bloqueada hasta ejecutar `docs/sunat-beta-checklist.md` con certificado y credenciales reales.

## Pendiente recomendado

### Corto plazo

1. Revisar visualmente `Empresa > Branding` con datos reales:
   - logo PNG/JPG/WebP subido
   - ruta SVG manual
   - favicon manual
   - colores diferentes
2. Confirmar si el backend de uploads debe aceptar SVG/ICO para branding o si esos archivos quedarán solo en `public/`.
3. Revisar que emisión fiscal use `SerieDocumento` como fuente canónica y que legacy solo sea fallback temporal.
4. Agregar pruebas específicas para el nuevo comportamiento de validaciones/logs/certificado si se quiere cubrir UI de settings fiscal.

### Mediano plazo

1. Separar `EmpresaContent` fuera de `settings-dialog.tsx` hacia un archivo propio, por ejemplo:
   - `apps/web/src/components/settings/empresa-settings-content.tsx`
2. Reducir el acoplamiento entre la página `/configuracion` y el archivo `settings-dialog.tsx`.
3. Retirar endpoints legacy de series de la UI pública interna cuando `SerieDocumento` quede totalmente consolidado.
4. Revisar si `ConfigEmpresa.porcentajeIGV` debe seguir en Empresa o pasar completamente a configuración tributaria.

### Futuro multi-sede

No implementar ahora.

Cuando se decida hacerlo, seguir `docs/multisede-futuro.md` y crear un diseño formal antes de tocar tablas. El enfoque recomendado es crear `SedeOperativa` separada de `EmpresaSedeFiscal`.

## Validaciones ejecutadas recientemente

Se ejecutaron y quedaron correctas:

- `pnpm lint`
- `pnpm type-check`
- `pnpm --filter @erp/web exec vitest run --reporter=dot`
- `pnpm --filter @erp/shared test`
- `apps/ai/.venv/Scripts/python.exe -m pytest apps/ai/tests --tb=short`
- tests API unitarios y e2e en rondas previas

## Nota para siguiente sesión

Si se retoma este tema, iniciar revisando:

1. `docs/README-configuracion-empresa-tributario.md`
2. `docs/multisede-futuro.md`
3. `apps/web/src/components/settings/fiscal-settings-content.tsx`
4. `apps/web/src/components/settings-dialog.tsx`
5. `apps/web/src/app/globals.css`
