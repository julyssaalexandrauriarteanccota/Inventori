# Sprint 19 - Despliegue a produccion

- Estado: PENDIENTE
- Fase: Deploy
- Depende de: 18
- Desbloquea: Operacion real

## Objetivo

Empaquetar, desplegar y operar el sistema en produccion con configuracion
estable, backups y monitoreo minimo.

## Cobertura de tablas y servicios

- [ ] Este sprint opera sobre las 36 tablas ya implementadas y los 3 servicios del sistema

## Reglas AGENTS criticas para este sprint

- [ ] Produccion debe respetar arquitectura `web` -> `api` -> `ai`
- [ ] No usar `migrate dev` en produccion
- [ ] Backups, health checks y almacenamiento deben quedar definidos
- [ ] El despliegue no debe alterar reglas SUNAT ni contratos publicos

## Checklist de implementacion

### Infraestructura

- [ ] Definir Dockerfiles de produccion
- [ ] Definir `docker-compose.prod.yml` o estrategia equivalente
- [ ] Configurar servidor o VPS
- [ ] Configurar Nginx o proxy inverso
- [ ] Configurar SSL
- [ ] Configurar backups automaticos

### Backend, frontend y AI

- [ ] Confirmar variables de entorno de produccion
- [ ] Confirmar `prisma migrate deploy`
- [ ] Confirmar almacenamiento de archivos
- [ ] Confirmar jobs de colas y servicio AI

### Operacion

- [ ] Definir estrategia de logs
- [ ] Definir health checks operativos
- [ ] Definir rollback minimo
- [ ] Configurar monitoring y uptime (UptimeRobot, Uptime Kuma o similar) para los 3 servicios
- [ ] Configurar error tracking (Sentry o logging centralizado con alertas)
- [ ] Documentar runbook de operacion basico: inicio/parada de servicios, restauracion de backup, rotacion de secretos
- [ ] Documentar pasos de despliegue y recuperacion

### Testing y validacion final

- [ ] Smoke test post deploy de login, dashboard, ticket, garantia y facturacion
- [ ] Validar restauracion de backup en entorno controlado

## Checklist de cierre

- [ ] Produccion responde por dominio y SSL
- [ ] El sistema inicia correctamente con su configuracion final
- [ ] Backups y health checks estan activos
- [ ] Monitoring y error tracking configurados y validados
- [ ] Runbook de operacion documentado y accesible
- [ ] Existe procedimiento basico de rollback
- [ ] Los 3 servicios y las 36 tablas quedaron considerados en operacion
