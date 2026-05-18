# ERP Frontend Modules and Modal CRUD Design

## Context

El frontend ERP ya evoluciono a un patron donde cada modulo principal vive en una sola pagina y las operaciones internas se resuelven con dialogs, alert dialogs, tabs y modales de detalle.

## Decision

Se adopta como regla oficial que en `apps/web/src/app/(erp)` cada dominio del ERP debe vivir preferentemente en una sola pagina principal por modulo.

## UI pattern

- El sidebar solo muestra modulos principales.
- Las operaciones `crear`, `editar`, `ver detalle`, `confirmar eliminar` y acciones rapidas se resuelven preferentemente con `Dialog`, `AlertDialog`, modales de detalle o tabs dentro del mismo modulo.
- Los tabs son la opcion preferida para subareas relacionadas dentro del mismo modulo.
- `Configuracion` concentra subareas administrativas como empresa, series, metodos de pago, auditoria y almacenes cuando tenga sentido funcional.

## Role model

- El ERP usa un mismo shell base para `ADMIN`, `ENCARGADO` y `TECNICO`.
- Lo que cambia por rol son los modulos visibles, tabs visibles, widgets, botones y acciones.
- No se deben crear dashboards o sidebars completamente separados por rol salvo una necesidad excepcional muy clara.

## Exceptions

Las rutas separadas siguen siendo validas para `auth`, sitio `public`, flujos largos o multietapa y flujos que necesiten URL propia compartible.

## Consequences

- Menos complejidad en sidebar y navegacion.
- Menos duplicacion de pantallas CRUD.
- Mejor continuidad visual dentro de cada modulo.
- Menor riesgo de que otro agente cree subrutas CRUD innecesarias.
