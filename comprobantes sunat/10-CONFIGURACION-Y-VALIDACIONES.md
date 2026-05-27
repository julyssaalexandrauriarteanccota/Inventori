# 10 — Configuración tributaria y validaciones

> **Pre-requisito de lectura**: `02-PROBLEMAS-DETECTADOS.md` (P5), `03-NORMATIVA-SUNAT.md` (§10), `04-MODELO-DATOS.md` (entidades de configuración).

Define la pantalla de configuración tributaria, las reglas de validación (bloqueantes vs advertencias) y cómo se ejecutan antes de tomar correlativo.

---

## 1. Pantalla `/erp/configuracion/tributario`

Estructura por tabs:

```
/erp/configuracion/tributario
  ├── /datos-fiscales       → datos generales SUNAT
  ├── /series               → series y correlativos por tipo
  ├── /certificado          → upload, vigencia, alertas
  ├── /credenciales-sol     → usuario SOL, clave, ambiente
  ├── /validaciones         → reglas configurables (bloqueante/advertencia)
  └── /feriados             → tabla de feriados para cálculo de días hábiles
```

---

## 2. Tab "Datos fiscales"

### Campos editables

| Campo | Validación |
|---|---|
| RUC | 11 dígitos, módulo 11 correcto |
| Razón social | obligatorio |
| Nombre comercial | opcional |
| Ubigeo | 6 dígitos, debe existir en Cat 13 |
| Departamento, Provincia, Distrito | derivados del ubigeo (read-only o auto-rellenados) |
| Dirección fiscal | obligatorio |
| Código de establecimiento | 4 dígitos, default `0000` (casa matriz) |
| Modalidad envío boletas | dropdown: `INDIVIDUAL` (única opción habilitada en v1) |
| Porcentaje IGV | default 18, editable solo por admin |
| Porcentaje ICBPER | default 0.50 (bolsa plástica), editable |

### Validación antes de guardar

- Si el RUC cambia: invalidar todas las series existentes (forzar recreación).
- Validar ubigeo contra catálogo SUNAT vigente.

---

## 3. Tab "Series"

### Vista

| Tipo | Serie | Último correlativo | Ambiente | Activa | Acciones |
|---|---|---|---|---|---|
| Factura | F001 | 00000123 | PRODUCCION | ✓ | [Desactivar] |
| Factura | F001 | 00000045 | BETA | ✓ | [Desactivar] |
| Boleta | B001 | 00000456 | PRODUCCION | ✓ | [Desactivar] |
| NC factura | FC01 | 00000005 | PRODUCCION | ✓ | [Desactivar] |
| NC boleta | BC01 | 00000003 | PRODUCCION | ✓ | [Desactivar] |
| ND factura | FD01 | 00000001 | PRODUCCION | ✓ | [Desactivar] |
| ND boleta | BD01 | 00000000 | PRODUCCION | ✓ | [Desactivar] |

### Crear nueva serie

```
Tipo:        [dropdown: Factura, Boleta, NC factura, NC boleta, ND factura, ND boleta]
Prefijo:     [F | B | FC | BC | FD | BD]  (auto según tipo)
Número de serie: [001-999]
Ambiente:    [BETA | PRODUCCION]
```

Validación:
- La combinación (tipo, serie, ambiente) debe ser única.
- El prefijo debe coincidir con el tipo (F* para factura, B* para boleta, FC*/BC* para NC, FD*/BD* para ND).

### Reglas operativas

- Una serie nueva inicia con `ultimoCorrelativo = 0`. El primer correlativo emitido será `00000001`.
- Desactivar una serie no permite emitir más con ella, pero NO afecta los comprobantes ya emitidos.
- No se puede borrar una serie con comprobantes emitidos.

---

## 4. Tab "Certificado digital"

### Vista

```
┌──────────────────────────────────────────────────┐
│ Certificado activo                                │
│                                                    │
│ Alias: Cert-2026                                  │
│ Huella: AB:CD:EF:12:34:56:...                     │
│ Vigencia: 01/01/2026 → 31/12/2026                 │
│ Días restantes: 240                                │
│                                                    │
│ [ Subir nuevo certificado ] [ Desactivar ]         │
└──────────────────────────────────────────────────┘

Histórico:
  Cert-2025  31/12/2024 → 31/12/2025  Inactivo
  Cert-2024  31/12/2023 → 31/12/2024  Inactivo
```

### Subida de certificado

```
Modal:
  Alias:                  [____________]
  Archivo (.p12 / .pfx):  [Seleccionar archivo]
  Password del archivo:   [_____________]

Al hacer click "Subir":
  1. Validar extensión y tamaño (max 100KB)
  2. Subir a MinIO bucket temp-uploads
  3. Backend: leer, validar password, extraer info
  4. Si válido:
     ├─ Cifrar con FISCAL_MASTER_KEY
     ├─ Guardar en CertificadoDigital con vigencia
     ├─ Eliminar de temp-uploads
     └─ Si hay otro activo: desactivarlo
  5. Si inválido: mostrar error específico
```

### Reglas

- **El certificado nunca sale del servidor.** Ni se descarga, ni se muestra el password, nada.
- **El alias y la huella SÍ son visibles.** Eso permite identificar cuál está activo sin exponer el archivo.
- **Solo un certificado activo a la vez por empresa.**
- **Alertas automáticas**:
  - 60 días antes de vencer: aviso semanal por email al admin tributario.
  - 30 días antes: aviso diario.
  - 7 días antes: aviso diario + notificación in-app crítica.
  - Vencido: bloquear emisión nueva, alerta crítica continua.

---

## 5. Tab "Credenciales SOL"

### Campos

| Campo | Validación |
|---|---|
| Usuario SOL | obligatorio. En BETA típicamente `MODDATOS`. |
| Clave SOL | obligatorio. En BETA típicamente `moddatos`. |
| Ambiente | `BETA` o `PRODUCCION`. |

### Almacenamiento

- Ambos campos cifrados con `FISCAL_MASTER_KEY` (la misma del certificado).
- En la UI, la clave nunca se devuelve completa; solo se ve `********` con botón "cambiar".

### Validación al guardar

- Hacer un `getStatus` con un ticket dummy a SUNAT para verificar que las credenciales son aceptadas. Si falla por auth: mostrar error y no guardar.

---

## 6. Tab "Validaciones" — reglas configurables

### Concepto

Hay validaciones que SUNAT exige (bloqueantes obligatorias) y otras que el negocio puede decidir si son bloqueantes o advertencias.

### Reglas obligatorias (siempre bloqueantes, no editables)

Estas no se muestran como "configurables" porque cambiarlas significaría incumplir SUNAT.

| Regla | Ámbito |
|---|---|
| RUC del receptor válido (11 dígitos, módulo 11) | Factura |
| Razón social del receptor no vacía | Factura |
| Dirección fiscal del receptor no vacía | Factura |
| Documento de identidad del receptor para boleta ≥ S/ 700 | Boleta |
| Tipo de documento del receptor según Cat 06 | Todos |
| Cantidad > 0 en cada línea | Todos |
| Precio unitario > 0 en cada línea | Todos |
| Unidad de medida del Cat 03 en cada línea | Todos |
| Tipo de afectación IGV del Cat 07 en cada línea | Todos |
| Moneda del Cat 02 | Todos |
| Tipo de operación del Cat 17 | Todos |
| Empresa con certificado vigente | Todos |
| Empresa con credenciales SOL configuradas | Todos |
| Empresa con ambiente definido | Todos |

### Reglas configurables

Estas se muestran en la pantalla y la empresa puede marcar "Bloqueante" o "Advertencia".

| Regla | Default |
|---|---|
| RUC del receptor en estado "ACTIVO" en padrón SUNAT | Bloqueante |
| RUC del receptor en estado "HABIDO" en padrón SUNAT | Advertencia |
| RUC validado contra padrón hace menos de 30 días | Advertencia |
| Razón social en padrón coincide con la registrada | Advertencia |
| Stock disponible al momento de emitir | Bloqueante (si la venta no ha descontado todavía) |
| Producto con código SUNAT (Cat 25) asignado | Advertencia |
| Cliente con email registrado (para envío automático) | Advertencia |
| Total del comprobante > 0 | Bloqueante |
| Si moneda ≠ PEN, tipo de cambio definido | Bloqueante |

### UI

```
┌──────────────────────────────────────────────────────────────┐
│ Reglas configurables                                          │
│                                                                │
│ ┌──────────────────────────────────────────────┬──────────┐ │
│ │ Regla                                         │ Tipo      │ │
│ ├──────────────────────────────────────────────┼──────────┤ │
│ │ RUC del receptor activo en SUNAT              │ [Bloq ▼] │ │
│ │ RUC del receptor habido en SUNAT              │ [Adv  ▼] │ │
│ │ Razón social coincide con padrón              │ [Adv  ▼] │ │
│ │ Cliente con email registrado                  │ [Adv  ▼] │ │
│ │ Producto con código SUNAT asignado            │ [Adv  ▼] │ │
│ │ ...                                           │          │ │
│ └──────────────────────────────────────────────┴──────────┘ │
│                                                                │
│ [ Restaurar defaults ]   [ Guardar ]                           │
└──────────────────────────────────────────────────────────────┘
```

### Almacenamiento

En `ConfigEmpresaFiscal.reglasValidacion` (JSON):

```json
{
  "ruc_receptor_activo_sunat": "BLOQUEANTE",
  "ruc_receptor_habido_sunat": "ADVERTENCIA",
  "razon_social_coincide_padron": "ADVERTENCIA",
  "cliente_con_email": "ADVERTENCIA",
  "producto_con_codigo_sunat": "ADVERTENCIA",
  "moneda_no_pen_con_tipo_cambio": "BLOQUEANTE"
}
```

---

## 7. `ValidacionFiscalService`

### Interfaz

```typescript
type NivelValidacion = 'BLOQUEANTE' | 'ADVERTENCIA';

interface ResultadoValidacion {
  bloqueantes: ItemValidacion[];
  advertencias: ItemValidacion[];
}

interface ItemValidacion {
  reglaId: string;
  mensaje: string;
  enlaceCorreccion?: {
    label: string;     // "Editar cliente"
    url: string;       // "/erp/clientes/123"
  };
}

interface ValidacionFiscalService {
  validar(input: {
    venta: Venta;
    tipoComprobante: TipoComprobante;
    motivoNc?: string;       // si aplica
    comprobanteOrigenId?: string;  // si es NC/ND
  }): Promise<ResultadoValidacion>;
}
```

### Pipeline interno

```
1. Cargar contexto:
   ├─ Venta con líneas
   ├─ Cliente
   ├─ ConfigEmpresa, ConfigEmpresaFiscal, CertificadoDigital activo
   └─ Comprobante origen (si NC/ND)

2. Ejecutar reglas obligatorias:
   └─ Si alguna falla → bloqueantes.push(...)

3. Ejecutar reglas configurables según ConfigEmpresaFiscal.reglasValidacion:
   ├─ Para cada regla, evaluar
   └─ Si falla, push a bloqueantes o advertencias según config

4. Para reglas que requieren consulta externa (padrón SUNAT):
   ├─ Cache de 24h por RUC
   └─ Si cache vencido, consultar via ClienteValidacionSunatService

5. Devolver { bloqueantes, advertencias }
```

### Cuándo se ejecuta

**Antes de tomar correlativo. Siempre.**

```
Pipeline de emisión (resumen, completo en 05-FLUJO-VENTAS-Y-COMPROBANTES.md §3):

1. validar() → si hay bloqueantes: ABORTAR, mostrar al usuario
2. Si solo advertencias: mostrar y pedir confirmación
3. Tomar correlativo
4. Crear comprobante
5. Encolar
```

---

## 8. UI: modal con resultado de validación

```
┌────────────────────────────────────────────────────────┐
│ ⛔ No se puede emitir                                  │
│                                                          │
│ Se encontraron 2 errores que impiden la emisión:        │
│                                                          │
│ • RUC del receptor no está ACTIVO en SUNAT             │
│   [ Editar cliente → ]                                  │
│                                                          │
│ • Producto "Cable HDMI" no tiene código SUNAT asignado │
│   [ Editar producto → ]                                 │
│                                                          │
│                                              [ Cerrar ] │
└────────────────────────────────────────────────────────┘
```

```
┌────────────────────────────────────────────────────────┐
│ ⚠ Advertencias                                         │
│                                                          │
│ Estos puntos no impiden la emisión, pero se recomienda │
│ revisar antes de continuar:                             │
│                                                          │
│ • RUC del receptor validado hace 45 días                │
│   (último cruce con padrón SUNAT)                       │
│                                                          │
│ • Cliente sin email registrado                          │
│   El comprobante no se podrá enviar automáticamente.    │
│                                                          │
│           [ Cancelar ]    [ Emitir de todos modos ]    │
└────────────────────────────────────────────────────────┘
```

---

## 9. Tab "Feriados"

### Por qué importa

El cálculo de "10 días hábiles" para NC excepcional depende de tener una tabla de feriados nacionales actualizada.

### Vista

```
Año: [2026 ▼]

┌────────────┬──────────────────────────────┬──────┐
│ Fecha      │ Descripción                   │      │
├────────────┼──────────────────────────────┼──────┤
│ 01/01/2026 │ Año Nuevo                     │ [×]  │
│ 02/04/2026 │ Jueves Santo                  │ [×]  │
│ 03/04/2026 │ Viernes Santo                 │ [×]  │
│ 01/05/2026 │ Día del Trabajo               │ [×]  │
│ 29/06/2026 │ San Pedro y San Pablo         │ [×]  │
│ 28/07/2026 │ Fiestas Patrias               │ [×]  │
│ 29/07/2026 │ Fiestas Patrias               │ [×]  │
│ 06/08/2026 │ Batalla de Junín              │ [×]  │
│ 30/08/2026 │ Santa Rosa de Lima            │ [×]  │
│ 08/10/2026 │ Combate de Angamos            │ [×]  │
│ 01/11/2026 │ Día de Todos los Santos       │ [×]  │
│ 08/12/2026 │ Inmaculada Concepción         │ [×]  │
│ 09/12/2026 │ Batalla de Ayacucho           │ [×]  │
│ 25/12/2026 │ Navidad                       │ [×]  │
└────────────┴──────────────────────────────┴──────┘

[ + Agregar feriado ]
```

### Modelo

```prisma
model FeriadoNacional {
  id          String   @id @default(cuid())
  fecha       DateTime @db.Date
  descripcion String

  @@unique([fecha])
  @@index([fecha])
}
```

### Carga inicial

Seed con los feriados oficiales del Perú año por año. Mantenimiento manual cuando el gobierno decreta días no laborables adicionales.

---

## 10. Permisos por rol

| Acción | Vendedor | Cajero | Facturador | Admin tributario | Admin sistema |
|---|---|---|---|---|---|
| Ver datos fiscales | — | — | ✓ | ✓ | ✓ |
| Editar datos fiscales | — | — | — | ✓ | ✓ |
| Ver series | — | — | ✓ | ✓ | ✓ |
| Crear/desactivar serie | — | — | — | ✓ | ✓ |
| Subir certificado | — | — | — | ✓ | ✓ |
| Ver alias del certificado | — | — | ✓ | ✓ | ✓ |
| Cambiar credenciales SOL | — | — | — | ✓ | ✓ |
| Editar reglas configurables | — | — | — | ✓ | ✓ |
| Editar feriados | — | — | — | ✓ | ✓ |

---

## 11. Tareas

- [ ] Implementar pantalla `/erp/configuracion/tributario` con los 6 tabs
- [ ] Tab "Datos fiscales": campos según §2 con validaciones
- [ ] Tab "Series": CRUD de series con reglas de §3
- [ ] Tab "Certificado": upload, validación, almacenamiento cifrado, alertas
- [ ] Tab "Credenciales SOL": almacenamiento cifrado + validación contra SUNAT
- [ ] Tab "Validaciones": UI de reglas configurables con persistencia en JSON
- [ ] Tab "Feriados": CRUD + seed inicial
- [ ] Implementar `ValidacionFiscalService` con interfaz §7
- [ ] Implementar todas las reglas obligatorias (§6 tabla 1)
- [ ] Implementar todas las reglas configurables (§6 tabla 2)
- [ ] Cache de validaciones contra padrón SUNAT (24h por RUC)
- [ ] UI: modal con bloqueantes y advertencias (§8)
- [ ] Implementar alertas de vencimiento de certificado (60/30/7 días)
- [ ] Implementar bloqueo de emisión cuando certificado venció
- [ ] Permisos por rol según §10
- [ ] Tests: cada regla configurable evaluada con cliente válido y con cliente con error
