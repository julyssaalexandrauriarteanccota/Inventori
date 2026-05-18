# apps/ai

Servicio AI en FastAPI para OCR y clasificación.

## Estado

- Servicio independiente de Python.
- No forma parte del workspace de `pnpm`.
- Puerto de desarrollo usado en el repo: `8000`.
- El código fuente vive en `app/`.
- Los tests viven en `tests/`.

## Estructura

### Código fuente

- `app/main.py`: crea la aplicación FastAPI, registra CORS, middleware de `X-Internal-Key` y routers.
- `app/core/config.py`: configuración con `pydantic-settings`.
- `app/routers/health.py`: endpoint público de salud.
- `app/routers/ocr.py`: endpoints de OCR.
- `app/routers/clasificacion.py`: endpoint de clasificación de tickets.
- `app/schemas/ocr_schemas.py`: modelos Pydantic de OCR.
- `app/schemas/clasificacion_schemas.py`: modelos Pydantic de clasificación.
- `app/services/claude_service.py`: integración con Anthropic y modo mock.
- `app/workers/`: existe, pero actualmente solo contiene `__init__.py`.

### Tests

- `tests/test_health.py`
- `tests/test_internal_key.py`
- `tests/test_ocr.py`
- `tests/test_clasificacion.py`
- `tests/test_claude_service.py`

### Archivos de soporte

- `requirements.txt`: dependencias Python.
- `pytest.ini`: configuración de pytest.

### Artefactos locales detectados

- `.venv/`
- `.pytest_cache/`
- `.codex-ai.log`
- `.codex-ai.err.log`

## Arranque

Desde la raíz del repo:

- `pnpm dev:ai`

Comando usado por el repo:

- `cd apps/ai && .venv\Scripts\python.exe -m uvicorn app.main:app --reload --port 8000`

## Tests

Desde `apps/ai`:

- `pytest --tb=short`

## Configuración

Variables usadas en `app/core/config.py`:

- `NODE_ENV`
- `DATABASE_URL`
- `AI_INTERNAL_KEY`
- `API_SERVICE_URL`
- `ANTHROPIC_API_KEY`
- `REDIS_URL`

Detalles verificados:

- carga `.env` desde `../../.env`
- `docs_url` solo se expone en `development`
- CORS permite origen `API_SERVICE_URL`

## Autenticación interna

Middleware en `app/main.py`:

- `GET /health` es público
- el resto valida `X-Internal-Key`
- si el header falta o no coincide, la respuesta actual es `401` con `{"detail": "Unauthorized"}`

## Endpoints actuales

### `GET /health`

- público
- responde `{"status": "ok"}`

### `POST /ocr/invoice`

- requiere `X-Internal-Key`
- acepta `image/jpeg`, `image/png`, `image/webp`, `image/gif`, `application/pdf`
- tamaño máximo: `10 MB`
- si recibe PDF, convierte la primera página a PNG
- responde con `OcrInvoiceResult`

Campos principales del resultado:

- `proveedorNombre`
- `proveedorRuc`
- `numeroFactura`
- `fechaEmision`
- `subtotal`
- `igv`
- `total`
- `moneda`
- `items`
- `confianza`
- `textoOriginal`

### `POST /ocr/serial`

- requiere `X-Internal-Key`
- acepta `image/jpeg`, `image/png`, `image/webp`, `image/gif`
- tamaño máximo: `10 MB`
- responde con `OcrSerialResult`

Campos principales del resultado:

- `numerosDetectados`
- `confianza`

### `POST /clasificar/ticket`

- requiere `X-Internal-Key`
- body actual:
  - `titulo`
  - `descripcion`
  - `fallaReportada` opcional
- responde con `TicketClassificationResult`

Campos principales del resultado:

- `prioridadSugerida`
- `tipoServicioSugerido`
- `categoriaFalla`
- `confianza`
- `razonamiento`

## Servicio Claude

`app/services/claude_service.py` concentra la integración con Anthropic.

Comportamiento actual:

- crea un singleton `claude_service`
- si `ANTHROPIC_API_KEY` está disponible, intenta inicializar el cliente de Anthropic
- si no está disponible, devuelve respuestas mock para OCR de factura, OCR de serie y clasificación
- los prompts de OCR y clasificación están definidos en el mismo archivo

## Dependencias principales

Detectadas en `requirements.txt`:

- API: `fastapi`, `uvicorn[standard]`
- config/modelos: `pydantic`, `pydantic-settings`, `python-dotenv`
- IA: `anthropic`, `openai`
- OCR/documentos: `pillow`, `pypdf`, `pdf2image`, `python-multipart`
- tareas/infra: `celery`, `redis`, `psycopg2-binary`, `httpx`
- tests: `pytest`, `pytest-asyncio`

## Estado actual del código

- Los routers llaman directamente a `claude_service`.
- `app/workers/` existe, pero no hay workers implementados todavía.
- No hay `README.md` previo en esta carpeta; este archivo documenta el estado actual encontrado.
