# Sprint 15 - AI, OCR y clasificacion

- Estado: COMPLETADO
- Fase: AI
- Depende de: 04, 05, 08
- Desbloquea: Ninguno

## Objetivo

Conectar el servicio AI al flujo real del ERP para asistir en compras y soporte
sin romper la arquitectura de tres servicios.

## Tablas y contratos consumidos por este sprint

- `OrdenCompra`
- `DetalleOrdenCompra`
- `Proveedor`
- `Producto`
- `Ticket`
- `HistorialTicket`
- `Equipo`

## Reglas AGENTS criticas para este sprint

- [x] `web` nunca llama a `ai` directo
- [x] `api` se comunica con `ai` por HTTP interno o cola
- [x] Solo `claude_service.py` importa `anthropic`
- [x] Endpoints AI validan `X-Internal-Key`
- [ ] Tareas pesadas van por Celery (diferido — MVP usa sync)

## Checklist de implementacion

### AI - `apps/ai`

- [x] Completar `POST /ocr/invoice`
- [x] Completar `POST /ocr/serial`
- [x] Completar `POST /clasificar/ticket`
- [x] Validar `X-Internal-Key` en endpoints protegidos
- [x] Encapsular integracion LLM en `claude_service.py`
- [x] Definir modelos Pydantic de request y response

### Backend - `apps/api`

- [x] Integrar OCR desde compras (`POST /compras/ocr-factura`)
- [x] Integrar clasificacion automatica al crear ticket (`POST /soporte/clasificar-ticket`)
- [x] Sync (no Celery) para MVP — aceptable en volumen actual
- [ ] Registrar resultados relevantes en DB (diferido — stateless para MVP)

### Frontend - `apps/web`

- [x] Boton "Escanear factura" en pagina de compras (abre dialog con OCR upload)
- [x] Boton "Clasificar con IA" en formulario de tickets (auto-completa prioridad/tipoServicio)
- [x] Mostrar datos sugeridos OCR para que el usuario confirme o edite

### Testing

- [x] Tests de routers FastAPI con mocks (`apps/ai/tests/`)
- [x] Tests de integracion API -> AI con mocks (`apps/api/src/modules/ai/ai.service.spec.ts`)
- [ ] Validacion manual del flujo OCR y clasificacion (requiere ANTHROPIC_API_KEY)

## Checklist de cierre

- [x] OCR devuelve datos utiles para compras
- [x] Clasificacion sugiere prioridad o tipo de falla
- [x] La integracion respeta la arquitectura y seguridad interna
- [x] Los contratos AI del sprint quedaron cubiertos
