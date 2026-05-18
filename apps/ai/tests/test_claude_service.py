from unittest.mock import patch

from app.schemas.clasificacion_schemas import ClasificarTicketRequest
from app.services.claude_service import (
    MOCK_CLASSIFICATION,
    MOCK_INVOICE,
    MOCK_SERIAL,
    ClaudeService,
)


def _make_mock_service() -> ClaudeService:
    """Create a ClaudeService instance with no Anthropic client (mock mode)."""
    with patch("app.services.claude_service.settings") as mock_settings:
        mock_settings.ANTHROPIC_API_KEY = ""
        service = ClaudeService()
    return service


async def test_mock_mode_returns_invoice() -> None:
    service = _make_mock_service()
    result = await service.extract_invoice_data(b"fake-image", "image/png")

    assert result == MOCK_INVOICE
    assert result.proveedor_nombre == "Distribuidora Lima SAC"
    assert result.total == 1003.00


async def test_mock_mode_returns_serial() -> None:
    service = _make_mock_service()
    result = await service.extract_serial_numbers(b"fake-image", "image/png")

    assert result == MOCK_SERIAL
    assert result.numeros_detectados == ["VNB3R14032", "CNC2471XY9"]


async def test_mock_mode_returns_classification() -> None:
    service = _make_mock_service()
    request = ClasificarTicketRequest(
        titulo="Impresora no enciende",
        descripcion="La impresora HP no enciende al presionar el botón",
    )
    result = await service.classify_ticket(request)

    assert result == MOCK_CLASSIFICATION
    assert result.prioridad_sugerida.value == "MEDIA"
    assert result.tipo_servicio_sugerido.value == "TALLER"


def test_parse_json_response_handles_markdown() -> None:
    service = _make_mock_service()

    raw = '```json\n{"key": "value", "count": 42}\n```'
    result = service.parse_json_response(raw)

    assert result == {"key": "value", "count": 42}


def test_parse_json_response_handles_plain_json() -> None:
    service = _make_mock_service()

    raw = '{"key": "value"}'
    result = service.parse_json_response(raw)

    assert result == {"key": "value"}


def test_is_available_false_without_key() -> None:
    service = _make_mock_service()
    assert service.is_available is False
