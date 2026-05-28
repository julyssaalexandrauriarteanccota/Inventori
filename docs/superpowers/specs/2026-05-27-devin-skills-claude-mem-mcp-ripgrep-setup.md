# Devin skills + claude-mem + MCP ripgrep setup

**Fecha:** 2026-05-27
**Estado:** Diseno aprobado, pendiente de implementacion

## 1. Objetivo

Agregar soporte local para Devin y herramientas de contexto:

- Crear 3 skills para Devin en `.devin/skills/`.
- Instalar `claude-mem` en el repo.
- Configurar MCP ripgrep en el workspace y en Claude Desktop.

## 2. Alcance

### 2.1. Devin skills

Crear los archivos:

- `.devin/skills/optimizacion-websockets.md`
- `.devin/skills/arquitectura-erp.md`
- `.devin/skills/estandares-codigo.md`

**Formato propuesto (por archivo):**

- Titulo y proposito
- Cuando usarlo (2-4 bullets)
- Do / Don’t (2-4 bullets)
- Referencias internas (links a docs del repo)
- Extractos clave (copias breves y pertinentes)

**Fuentes base (mezcla de resumen + extractos):**

- `AGENTS.md`
- `apps/web/AGENTS.md`
- `docs/superpowers/specs/2026-05-26-realtime-websocket-global-design.md`
- `docs/superpowers/specs/2026-05-26-sesion-unica-design.md`
- `README.md`

### 2.2. MCP ripgrep

**Workspace**

- Editar `.vscode/mcp.json` para agregar servidor `ripgrep`.
- Mantener la entrada existente de `shadcn`.

**Claude Desktop (usuario)**

- Editar `%APPDATA%\Claude\claude_desktop_config.json`.
- Agregar `mcpServers.ripgrep` con:

```json
{
  "command": "npx",
  "args": ["-y", "mcp-ripgrep@latest"]
}
```

**Prerequisitos**

- Node.js >= 18
- `rg` disponible en PATH

### 2.3. claude-mem

- Ejecutar `npx claude-mem install` en la raiz del repo.
- Verificar cambios en `.claude/settings.json` o `.claude/settings.local.json` segun lo que genere el instalador.

## 3. No-objetivos

- No crear prompts o agents extra fuera de `.devin/skills/`.
- No cambiar codigo de `apps/`.
- No alterar configuraciones de seguridad ni secretos.

## 4. Diseno de contenido por skill

### 4.1. `optimizacion-websockets.md`

- Resumir el objetivo de eliminar polling y depender de invalidacion por WS.
- Incluir el flujo actual (interceptor -> evento -> invalidacion de queries) en 3-5 lineas.
- Enumerar las 3 brechas actuales y su solucion propuesta (padron SUNAT, scope alquileres, staleTime productos).

### 4.2. `arquitectura-erp.md`

- Resumen del monorepo, servicios y puertos.
- Flujo de datos web -> api -> db -> ai.
- Reglas clave: `apps/ai` fuera del workspace, `@erp/shared` como fuente de verdad.

### 4.3. `estandares-codigo.md`

- Patrones y restricciones de NestJS, Next.js y Prisma (solo bullets cortos).
- Enfatizar: no `fetch` directo en web, no editar `components/ui`, `PATCH` en API.
- Recordar comandos de test y build clave.

## 5. Riesgos

- Desactualizacion de extractos si cambian los docs base.
- Config del MCP en Claude Desktop es local y no se versiona.

## 6. Verificacion

- `rg --version` para confirmar ripgrep.
- Revisar `.vscode/mcp.json` contiene `shadcn` y `ripgrep`.
- Confirmar en Claude Desktop que `ripgrep` aparece como MCP server.
- Verificar que los 3 archivos `.devin/skills/*.md` existen y enlazan a docs reales.
