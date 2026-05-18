from typing import cast
from unittest.mock import AsyncMock, patch

from app.schemas.clasificacion_schemas import TicketClassificationResult
from app.services.claude_service import MOCK_CLASSIFICATION
from httpx import AsyncClient, Response

HEADERS = {"X-Internal-Key": "test-ai-internal-key"}


def _response_payload(response: Response) -> object:
    return cast(object, response.json())


def _response_detail(response: Response) -> str:
    payload = _response_payload(response)
    assert isinstance(payload, dict)
    data = cast(dict[str, object], payload)
    detail = data.get("detail")
    assert isinstance(detail, str)
    return detail


@patch(
    "app.routers.clasificacion.claude_service.classify_ticket",
    new_callable=AsyncMock,
    return_value=MOCK_CLASSIFICATION,
)
async def test_clasificar_ticket_returns_result(
    mock_classify: AsyncMock,
    client: AsyncClient,
) -> None:
    response = await client.post(
        "/clasificar/ticket",
        headers=HEADERS,
        json={
            "titulo": "Impresora HP atascada",
            "descripcion": "La impresora se atasca con papel A4",
            "fallaReportada": "Atasco de papel frecuente",
        },
    )

    assert response.status_code == 200
    data = TicketClassificationResult.model_validate(_response_payload(response))
    assert data.prioridad_sugerida.value == "MEDIA"
    assert data.tipo_servicio_sugerido.value == "TALLER"
    assert data.categoria_falla == "Atasco de papel"
    assert data.confianza == 85
    assert len(data.razonamiento) > 0
    mock_classify.assert_awaited_once()


async def test_clasificar_ticket_rejects_empty_titulo(client: AsyncClient) -> None:
    response = await client.post(
        "/clasificar/ticket",
        headers=HEADERS,
        json={
            "titulo": "   ",
            "descripcion": "Alguna descripción",
        },
    )

    assert response.status_code == 400
    detail = _response_detail(response).lower()
    assert "título" in detail or "titulo" in detail


@patch(
    "app.routers.clasificacion.claude_service.classify_ticket",
    new_callable=AsyncMock,
    return_value=MOCK_CLASSIFICATION,
)
async def test_clasificar_ticket_accepts_minimal_body(
    mock_classify: AsyncMock,
    client: AsyncClient,
) -> None:
    response = await client.post(
        "/clasificar/ticket",
        headers=HEADERS,
        json={
            "titulo": "Toner agotado",
            "descripcion": "Se necesita reemplazo de toner",
        },
    )

    assert response.status_code == 200
    data = TicketClassificationResult.model_validate(_response_payload(response))
    assert data.prioridad_sugerida.value == "MEDIA"
    mock_classify.assert_awaited_once()
