# Multi-sede operativo futuro

## Estado actual decidido

El sistema se mantiene como **operación de una sola sede**.

Aunque una empresa real pueda tener varios locales, por ahora el ERP no debe separar la operación por sede. Esto significa que no se implementa todavía multi-sede para:

- inventario
- ventas
- caja/POS
- compras
- soporte
- usuarios
- permisos
- auditoría
- reportes
- facturación por sucursal

La configuración tributaria actual debe asumir una **sede principal** y un **código de establecimiento SUNAT por defecto**, normalmente `0000`.

## Decisión de UI actual

La sección `Tributario` no debe exponer un módulo de sedes ni selección de sede fiscal.

En el estado actual solo se configuran:

- datos fiscales no sensibles del emisor
- series documentales para la sede principal
- certificados y credenciales SUNAT
- validaciones documentales
- logs de envío

La pantalla de series puede conservar el `codigoEstablecimiento` como dato fiscal simple, pero no debe permitir elegir múltiples sedes.

## Diferencia conceptual para el futuro

No mezclar estos conceptos:

| Concepto | Uso | Estado actual |
| --- | --- | --- |
| `ConfigEmpresa` | Branding, contacto y datos públicos | Activo |
| `ConfigEmpresaFiscal` | Emisor fiscal/SUNAT | Activo |
| `EmpresaSedeFiscal` | Local anexo SUNAT | Reservado para futuro |
| `SedeOperativa` | Sucursal real del negocio | No implementado |
| `Almacen` | Ubicación logística/stock | Activo |
| `Caja` | Punto de cobro/POS | Activo |

`EmpresaSedeFiscal` no debe usarse como si fuera una sucursal operativa. Una sede fiscal solo representa datos de SUNAT/local anexo; una sede operativa real afecta toda la operación.

## Si luego se implementa multi-sede real

Crear un modelo nuevo, por ejemplo `SedeOperativa`, y relacionarlo de forma transversal.

Áreas afectadas:

### Usuarios y permisos

- usuario con una o varias sedes permitidas
- sede por defecto
- permisos por sede
- admins con acceso global

### Almacenes e inventario

- `Almacen.sedeId`
- stock filtrado por sede
- movimientos entre sedes
- alertas de stock por sede
- reportes consolidados y por sede

### Caja/POS

- `Caja.sedeId`
- apertura de caja por sede
- arqueos por sede
- ventas rápidas restringidas a la sede activa

### Ventas y facturación

- `Venta.sedeId`
- `Cotizacion.sedeId`
- `Comprobante.sedeId`
- relación opcional con sede fiscal/SUNAT
- serie documental seleccionada por sede/ambiente/tipo

### Compras

- recepción hacia almacenes de una sede
- opcionalmente `OrdenCompra.sedeId`
- reportes de compras por sede

### Soporte técnico

- `Ticket.sedeId` o sede derivada por equipo/cliente/taller
- técnicos asignados por sede
- panel de taller por sede

### Reportes

- filtro global por sede
- dashboards por sede
- vistas consolidadas para admin

## Relación futura recomendada

```text
SedeOperativa
  puede vincularse opcionalmente a
EmpresaSedeFiscal
```

Ejemplos:

| Sede operativa | Sede fiscal SUNAT |
| --- | --- |
| Tienda Puno | Local `0000` |
| Tienda Juliaca | Local `0001` |
| Taller Puno | Local `0000` |

La relación debe ser opcional porque puede haber varias sedes operativas usando el mismo local fiscal.

## Implementación futura sugerida

1. Crear `SedeOperativa`.
2. Crear relación usuarios-sedes.
3. Agregar `sedeId` a almacenes y cajas.
4. Propagar sede activa al POS, ventas, compras y soporte.
5. Agregar selector global de sede en el shell ERP.
6. Ajustar permisos y guards.
7. Agregar filtros por sede en hooks/tablas/reportes.
8. Relacionar comprobantes con sede operativa y serie fiscal.
9. Implementar migración desde operación única hacia sede principal.
10. Activar UI de sedes fiscales/operativas solo cuando el diseño esté completo.

## Regla actual

Hasta que se haga ese rediseño, cualquier UI o flujo multi-sede debe permanecer oculto o documentado como futuro. La operación actual se trata como **sede única**.
