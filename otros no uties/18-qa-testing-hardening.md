# Sprint 18 - QA integral y hardening

- Estado: PENDIENTE
- Fase: Calidad
- Depende de: 01-17
- Desbloquea: 19

## Objetivo

Convertir el sistema en una entrega robusta: pruebas criticas, seguridad,
observabilidad minima y revision de performance.

## Cobertura de tablas y contratos

- [ ] Este sprint revisa las 36 tablas del schema y los contratos de los 3 servicios

## Reglas AGENTS criticas para este sprint

- [ ] Validar roles exactos y permisos reales
- [ ] Validar endpoints publicos y protegidos
- [ ] Validar inventario, SUNAT, garantias y uploads segun reglas del negocio
- [ ] No cerrar QA con pruebas vacias o simuladas sin valor

## Checklist de implementacion

### Backend y AI

- [ ] Tests de integracion para autenticacion
- [ ] Tests de integracion para facturacion con mock de Nubefact
- [ ] Tests de integracion para inventario sin stock negativo
- [ ] Tests de roles para restricciones del tecnico
- [ ] Validar que endpoints protegidos devuelven 401 sin token
- [ ] Validar consulta publica de garantia sin login
- [ ] Revisar configuracion de variables de entorno
- [ ] Auditar que `@Roles()` esta presente en todos los endpoints protegidos de todos los modulos
- [ ] Verificar que soft delete no deja registros huerfanos (ej: borrar cliente no deja tickets sin referencia)
- [ ] Review OWASP basico: SQL injection (Prisma mitiga), XSS (sanitizar inputs), CSRF (origin check), auth bypass (guards)
- [ ] Verificar rate limiting por tipo de endpoint: login 5/min, publico 30/min, autenticado 100/min, facturacion 10/min

### Frontend

- [ ] Revisar manejo de errores global
- [ ] Revisar estados vacios, loading y acceso denegado
- [ ] Revisar responsive en modulos principales y sitio publico

### Base de datos y performance

- [ ] Revisar indices
- [ ] Revisar queries lentas
- [ ] Ejecutar `EXPLAIN ANALYZE` donde sea necesario

### Testing

- [ ] Cobertura minima real en modulos criticos
- [ ] Smoke tests de flujos principales de negocio
- [ ] Revision manual cruzada de sprint por sprint
- [ ] Validar pipeline CI/CD: GitHub Actions ejecuta lint, type-check y tests de los 3 servicios
- [ ] Confirmar que CI bloquea merge si falla

## Checklist de cierre

- [ ] Los flujos criticos estan probados
- [ ] No hay huecos evidentes de seguridad basica
- [ ] El pipeline CI/CD funciona end-to-end
- [ ] Rate limiting verificado en endpoints criticos
- [ ] Soft delete revisado en todas las entidades afectadas
- [ ] `@Roles()` confirmado en todos los endpoints protegidos
- [ ] El sistema esta listo para prepararse para produccion
- [ ] La cobertura integral del schema y contratos quedo revisada
