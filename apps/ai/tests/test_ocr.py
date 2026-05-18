from typing import cast
from unittest.mock import AsyncMock, patch

from app.schemas.ocr_schemas import OcrInvoiceResult, OcrSerialResult
from app.services.claude_service import MOCK_INVOICE, MOCK_SERIAL
from httpx import AsyncClient, Response

HEADERS = {"X-Internal-Key": "test-ai-internal-key"}

# Minimal valid 1x1 PNG
TINY_PNG = (
    b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01"
    b"\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15\xc4\x89"
    b"\x00\x00\x00\nIDATx\x9cc\x00\x01\x00\x00\x05\x00\x01"
    b"\r\n\xb4\x00\x00\x00\x00IEND\xaeB`\x82"
)


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
    "app.routers.ocr.claude_service.extract_invoice_data",
    new_callable=AsyncMock,
    return_value=MOCK_INVOICE,
)
async def test_ocr_invoice_returns_mock_data(
    mock_extract: AsyncMock,
    client: AsyncClient,
) -> None:
    response = await client.post(
        "/ocr/invoice",
        headers=HEADERS,
        files={"file": ("invoice.png", TINY_PNG, "image/png")},
    )

    assert response.status_code == 200
    data = OcrInvoiceResult.model_validate(_response_payload(response))
    assert data.proveedor_nombre == "Distribuidora Lima SAC"
    assert data.proveedor_ruc == "20456789012"
    assert data.numero_factura == "F001-00001234"
    assert data.total == 1003.00
    assert len(data.items) == 2
    assert data.items[0].descripcion == "Toner HP 85A Compatible"
    assert data.confianza == 95
    mock_extract.assert_awaited_once()


async def test_ocr_invoice_rejects_unsupported_type(client: AsyncClient) -> None:
    response = await client.post(
        "/ocr/invoice",
        headers=HEADERS,
        files={"file": ("readme.txt", b"plain text", "text/plain")},
    )

    assert response.status_code == 400
    assert "no soportado" in _response_detail(response)


@patch(
    "app.routers.ocr.claude_service.extract_serial_numbers",
    new_callable=AsyncMock,
    return_value=MOCK_SERIAL,
)
async def test_ocr_serial_returns_mock_data(
    mock_extract: AsyncMock,
    client: AsyncClient,
) -> None:
    response = await client.post(
        "/ocr/serial",
        headers=HEADERS,
        files={"file": ("equipment.png", TINY_PNG, "image/png")},
    )

    assert response.status_code == 200
    data = OcrSerialResult.model_validate(_response_payload(response))
    assert data.numeros_detectados == ["VNB3R14032", "CNC2471XY9"]
    assert data.confianza == 90
    mock_extract.assert_awaited_once()


async def test_ocr_serial_rejects_unsupported_type(client: AsyncClient) -> None:
    response = await client.post(
        "/ocr/serial",
        headers=HEADERS,
        files={"file": ("doc.pdf", b"%PDF-1.4 fake", "application/pdf")},
    )

    assert response.status_code == 400
    assert "no soportado" in _response_detail(response)
