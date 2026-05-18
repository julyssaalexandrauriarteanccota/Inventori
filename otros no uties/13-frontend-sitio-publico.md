# Sprint 13 - Sitio publico

- Estado: COMPLETADO
- Fase: Frontend publico
- Depende de: 02, 04, 08
- Desbloquea: 17

## Objetivo

Dejar listo el sitio publico para mostrar la empresa, el catalogo y consultas
sin login de garantia y tickets.

## Tablas y contratos consumidos por este sprint

- `Producto`
- `Categoria`
- `Marca`
- `Garantia`
- `Ticket`
- `ConfigEmpresa`

## Reglas AGENTS criticas para este sprint

- [x] Todo vive bajo `app/(public)`
- [x] Debe priorizar SEO y SSR
- [x] Las consultas publicas no requieren JWT
- [x] El sitio publico no debe exponer operaciones internas del ERP

## Checklist de implementacion

### Frontend - `apps/web`

- [x] Completar `app/(public)/page.tsx`
- [x] Completar `app/(public)/catalogo/page.tsx`
- [x] Completar `app/(public)/catalogo/[sku]/page.tsx`
- [x] Completar `app/(public)/garantia/page.tsx`
- [x] Completar `app/(public)/garantia/[codigoQR]/page.tsx`
- [x] Completar `app/(public)/ticket/page.tsx`
- [x] Completar `app/(public)/contacto/page.tsx`
- [x] Completar `app/(public)/layout.tsx`
- [x] Configurar metadata, sitemap y robots
- [x] Priorizar SEO, performance y responsive

### Backend - soporte al frontend

- [x] Confirmar endpoints publicos de catalogo, garantia y ticket
- [x] Confirmar datos minimos visibles sin autenticacion

### Shared - `packages/shared`

- [x] Confirmar tipos de respuesta publica y busqueda de catalogo

### Testing

- [x] Tests de render de paginas publicas clave
- [x] Tests de formularios publicos de garantia y ticket
- [x] Validacion manual de SEO tecnico basico

## Checklist de cierre

- [x] El sitio publico puede navegarse sin login
- [x] El catalogo y sus fichas funcionan
- [x] La consulta publica de garantia y ticket funciona
- [x] Las paginas estan listas para SEO
- [x] Los contratos publicos del sprint quedaron cubiertos
