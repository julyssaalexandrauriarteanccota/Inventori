---
description: "Use when writing or modifying FastAPI/Python code in apps/ai: routers, services, schemas, workers, or tests. Covers Pydantic patterns, auth requirements, and Celery conventions."
applyTo: "apps/ai/**/*.py"
---

# FastAPI AI Service Conventions

Ver arquitectura general en [`AGENTS.md`](../../AGENTS.md). Este servicio es **solo interno**: `web` nunca llama a `ai` directamente, siempre vía `api`.

## Autenticación

- **Todos** los endpoints privados deben validar el header `X-Internal-Key`
- Sin este header la respuesta debe ser `403 Forbidden`

## Modelos

- Usar modelos Pydantic para request/response; **nunca dicts crudos**
- Los schemas viven en `app/schemas/`

## Dependencias de LLM

- **Solo `app/services/claude_service.py`** puede importar `anthropic`
- No importar `anthropic` u `openai` directamente en routers ni en otros services
- Si se necesita otro proveedor, agregarlo en ese mismo archivo de servicio

## Tareas pesadas

- OCR y clasificación costosa → delegar a **Celery** (workers en `app/workers/`)
- Los endpoints devuelven `task_id` inmediatamente; el cliente consulta estado por separado
- No bloquear el event loop con operaciones síncronas lentas

## Tests

```bash
cd apps/ai && pytest --tb=short
```
