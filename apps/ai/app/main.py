from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, Response
from starlette.middleware.base import RequestResponseEndpoint

from app.core.config import settings
from app.routers import clasificacion, health, ocr

app = FastAPI(
    title="ERP AI Service",
    version="1.0.0",
    docs_url="/docs" if settings.NODE_ENV == "development" else None,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.API_SERVICE_URL],
    allow_methods=["POST", "GET"],
    allow_headers=["X-Internal-Key"],
)


@app.middleware("http")
async def validate_internal_key(
    request: Request,
    call_next: RequestResponseEndpoint,
) -> Response:
    if request.url.path == "/health":
        return await call_next(request)

    key = request.headers.get("X-Internal-Key")
    if key != settings.AI_INTERNAL_KEY:
        return JSONResponse(status_code=401, content={"detail": "Unauthorized"})

    return await call_next(request)


app.include_router(health.router)
app.include_router(ocr.router, prefix="/ocr", tags=["OCR"])
app.include_router(clasificacion.router, prefix="/clasificar", tags=["Clasificación"])
