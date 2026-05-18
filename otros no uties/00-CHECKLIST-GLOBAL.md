# Checklist global entre sprints

Usa esta lista antes de iniciar un sprint, antes de cerrarlo y al pasar al
siguiente. La idea es que el proyecto avance ordenado y no queden huecos.

## Antes de iniciar un sprint

- [ ] Leer `00-REGLAS-AGENTS.md`
- [ ] Leer `00-MAPA-TABLAS.md`
- [ ] Confirmar que las dependencias del sprint ya estan completas
- [ ] Leer el archivo completo del sprint actual
- [ ] Revisar si el sprint requiere cambios en `apps/api`, `apps/web`, `apps/ai` o `packages/shared`
- [ ] Confirmar que las tablas duenas del sprint estan cubiertas en el plan
- [ ] Confirmar el contrato de datos que se va a consumir o exponer
- [ ] Confirmar si necesita migraciones, seeds o archivos de configuracion
- [ ] Definir que pruebas minimas deben quedar listas al cerrar

## Durante la implementacion

- [ ] Mantener el alcance dentro del sprint actual
- [ ] Actualizar el checklist del sprint a medida que se avanza
- [ ] No dejar endpoints sin proteccion de roles si aplica
- [ ] No dejar pantallas sin estados de carga, error y vacio si aplica
- [ ] No dejar servicios externos sin mocks o validaciones minimas
- [ ] Documentar cualquier decision que afecte al sprint siguiente

## Antes de cerrar un sprint

- [ ] El codigo compila
- [ ] El lint pasa
- [ ] El type-check pasa
- [ ] Las pruebas del area tocada pasan
- [ ] Las tablas duenas del sprint quedaron realmente implementadas o explicitamente bloqueadas
- [ ] Los flujos minimos del sprint fueron validados manualmente
- [ ] Se reviso que el sprint no rompa sprints ya cerrados
- [ ] Quedaron claros los entregables que desbloquea al siguiente sprint

## Handoff al siguiente sprint

- [ ] El archivo del sprint actual refleja el estado real
- [ ] Los pendientes menores quedaron anotados como follow-up y no mezclados con trabajo critico
- [ ] El siguiente sprint ya tiene visibles sus dependencias cumplidas
- [ ] Si el sprint desbloquea otro servicio, dejar artefacto de handoff consumible usando `SPRINTS/_handoff-template.md` (OpenAPI + ejemplos + errores + permisos)
- [ ] No quedan decisiones importantes escondidas en mensajes sueltos o terminal

## Regla de oro

Si un sprint no puede validarse de punta a punta, no esta realmente cerrado.
