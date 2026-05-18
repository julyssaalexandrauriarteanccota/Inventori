import logging

from fastapi import APIRouter, HTTPException

from app.schemas.clasificacion_schemas import (
    ClasificarTicketRequest,
    TicketClassificationResult,
)
from app.services.claude_service import claude_service

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/ticket", response_model=TicketClassificationResult)
async def clasificar_ticket(request: ClasificarTicketRequest):
    """Classify a support ticket using AI to suggest priority and service type."""
    if not request.titulo.strip():
        raise HTTPException(status_code=400, detail="El título del ticket es requerido")

    try:
        result = await claude_service.classify_ticket(request)
        return result
    except Exception as e:
        logger.error(f"Classification failed: {e}")
        raise HTTPException(
            status_code=500, detail=f"Error clasificando ticket: {str(e)}"
        )
