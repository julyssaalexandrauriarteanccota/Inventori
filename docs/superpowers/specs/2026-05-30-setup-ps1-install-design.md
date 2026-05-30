# Setup PS1 - Instalacion Windows

**Fecha:** 2026-05-30
**Estado:** Diseno aprobado, pendiente de implementacion

## 1. Objetivo

Crear un `setup.ps1` en la raiz para que una nueva maquina pueda instalar y levantar el proyecto sin errores, con prompts y sin guardar secretos.

## 2. Alcance

- Script unico `setup.ps1` (solo Windows/PowerShell).
- Flujo interactivo con prompts.
- Copia `.env.example` -> `.env` si falta.
- Verifica pre-requisitos (git, node, pnpm, docker si se usa Docker).
- Puede ejecutar todo o solo mostrar los comandos.

## 3. No-objetivos

- No guardar secretos ni escribir valores sensibles en `.env`.
- No generar credenciales ni llaves.
- No crear scripts bash.

## 4. Diseno

### 4.1 Ubicacion

- Archivo: `setup.ps1` en la raiz.

### 4.2 Prompts

1) Modo de infraestructura:
- `Docker local` (postgres/redis/minio)
- `Supabase`

2) Modo de ejecucion:
- `Ejecutar todo`
- `Solo preparar y mostrar comandos`

### 4.3 Pasos comunes

- Validar comandos disponibles:
  - `git`, `node`, `pnpm`
  - `docker` solo si se elige Docker local
- Copiar `.env.example` -> `.env` si no existe.
- Mostrar variables criticas que deben completarse:
  - `JWT_SECRET`, `JWT_REFRESH_SECRET`, `DATABASE_URL`
  - `DIRECT_URL` solo si `DATABASE_URL` es pooler

### 4.4 Comandos (si "Ejecutar todo")

**Docker local**
1. `docker compose up -d postgres redis minio minio-init`
2. `pnpm install`
3. `pnpm --filter @erp/api exec prisma migrate deploy`
4. `pnpm --filter @erp/api exec prisma generate`
5. `pnpm dev`

**Supabase**
1. `pnpm install`
2. `pnpm --filter @erp/api exec prisma migrate deploy`
3. `pnpm --filter @erp/api exec prisma generate`
4. `pnpm dev`

### 4.5 Salidas esperadas

- Mensajes claros con cada paso y errores de prerequisitos.
- Si "Solo preparar": imprime la lista de comandos con notas.

## 5. Riesgos

- Usuario ejecuta sin completar `.env` -> fallas en runtime.
- Docker no instalado -> se detecta y se detiene con mensaje.

## 6. Verificacion

- `setup.ps1` corre en PowerShell sin errores de sintaxis.
- En modo preparar, imprime comandos correctos.
- En modo ejecutar, instala deps, migra y levanta servicios.
