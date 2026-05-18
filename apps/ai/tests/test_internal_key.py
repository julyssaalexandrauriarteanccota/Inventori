from typing import cast
from unittest.mock import AsyncMock, patch

import pytest
from app.services.claude_service import (
    MOCK_CLASSIFICATION,
    MOCK_INVOICE,
    MOCK_SERIAL,
)
from httpx import AsyncClient, Response
from pydantic import BaseModel

# Minimal valid 1x1 PNG
TINY_PNG = (
    b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01"
    b"\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15\xc4\x89"
    b"\x00\x00\x00\nIDATx\x9cc\x00\x01\x00\x00\x05\x00\x01"
    b"\r\n\xb4\x00\x00\x00\x00IEND\xaeB`\x82"
)


def _response_payload(response: Response) -> object:
    return cast(object, response.json())


async def _post_with_valid_key(
    client: AsyncClient,
    path: str,
    internal_key: str,
) -> Response:
    headers = {"X-Internal-Key": internal_key}

    if path == "/ocr/invoice":
        return await client.post(
            path,
            headers=headers,
            files={"file": ("invoice.png", TINY_PNG, "image/png")},
        )

    if path == "/ocr/serial":
        return await client.post(
            path,
            headers=headers,
            files={"file": ("serial.png", TINY_PNG, "image/png")},
        )

    return await client.post(
        path,
        headers=headers,
        json={
            "titulo": "Equipo con atasco recurrente",
            "descripcion": "El equipo presenta atasco de papel al imprimir.",
        },
    )


@pytest.mark.parametrize("path", ["/ocr/invoice", "/ocr/serial", "/clasificar/ticket"])
async def test_protected_endpoints_require_internal_key(
    client: AsyncClient,
    path: str,
) -> None:
    response = await client.post(path)

    assert response.status_code == 401
    assert _response_payload(response) == {"detail": "Unauthorized"}


@pytest.mark.parametrize(
    ("path", "patch_target", "mock_response"),
    [
        (
            "/ocr/invoice",
            "app.routers.ocr.claude_service.extract_invoice_data",
            MOCK_INVOICE,
        ),
        (
            "/ocr/serial",
            "app.routers.ocr.claude_service.extract_serial_numbers",
            MOCK_SERIAL,
        ),
        (
            "/clasificar/ticket",
            "app.routers.clasificacion.claude_service.classify_ticket",
            MOCK_CLASSIFICATION,
        ),
    ],
)
async def test_protected_endpoints_accept_valid_internal_key(
    client: AsyncClient,
    override_internal_key: str,
    path: str,
    patch_target: str,
    mock_response: BaseModel,
) -> None:
    with patch(
        patch_target,
        new_callable=AsyncMock,
        return_value=mock_response,
    ) as mocked_call:
        response = await _post_with_valid_key(client, path, override_internal_key)

    assert response.status_code == 200
    mocked_call.assert_awaited_once()
