"""Claude AI service for OCR and ticket classification."""

import base64
import json
import logging
from collections.abc import Sequence
from typing import Protocol, TypeAlias, cast

from app.core.config import settings
from app.schemas.clasificacion_schemas import (
    ClasificarTicketRequest,
    PrioridadTicket,
    TicketClassificationResult,
    TipoServicio,
)
from app.schemas.ocr_schemas import OcrInvoiceItem, OcrInvoiceResult, OcrSerialResult

logger = logging.getLogger(__name__)

ClaudeMessageParam: TypeAlias = dict[str, object]
JsonObject: TypeAlias = dict[str, object]


class ClaudeContentBlock(Protocol):
    text: str


class ClaudeMessageResponse(Protocol):
    content: Sequence[ClaudeContentBlock]


class ClaudeMessagesAPI(Protocol):
    def create(
        self,
        *,
        model: str,
        max_tokens: int,
        messages: Sequence[ClaudeMessageParam],
    ) -> ClaudeMessageResponse: ...


class ClaudeClient(Protocol):
    messages: ClaudeMessagesAPI


# ── Mock data for dev mode ───────────────────────────────────────

MOCK_INVOICE = OcrInvoiceResult(
    proveedorNombre="Distribuidora Lima SAC",
    proveedorRuc="20456789012",
    numeroFactura="F001-00001234",
    fechaEmision="2025-01-15",
    subtotal=850.00,
    igv=153.00,
    total=1003.00,
    moneda="PEN",
    items=[
        OcrInvoiceItem(
            descripcion="Toner HP 85A Compatible",
            cantidad=5,
            precioUnitario=120.00,
            subtotal=600.00,
        ),
        OcrInvoiceItem(
            descripcion="Tambor DR-1060 Brother",
            cantidad=2,
            precioUnitario=125.00,
            subtotal=250.00,
        ),
    ],
    confianza=95,
    textoOriginal="[Modo desarrollo — datos simulados]",
)

MOCK_SERIAL = OcrSerialResult(
    numerosDetectados=["VNB3R14032", "CNC2471XY9"],
    confianza=90,
)

MOCK_CLASSIFICATION = TicketClassificationResult(
    prioridadSugerida=PrioridadTicket.MEDIA,
    tipoServicioSugerido=TipoServicio.TALLER,
    categoriaFalla="Atasco de papel",
    confianza=85,
    razonamiento="El problema descrito indica un atasco mecánico que requiere revisión presencial del equipo en taller.",
)

# ── Prompt templates ─────────────────────────────────────────────

OCR_INVOICE_PROMPT = """Analiza esta imagen de factura/boleta peruana y extrae los datos en formato JSON.

Responde SOLO con JSON válido, sin texto adicional. Usa esta estructura exacta:
{
  "proveedorNombre": "nombre del proveedor",
  "proveedorRuc": "RUC del proveedor (11 dígitos)",
  "numeroFactura": "número de factura (ej: F001-00001234)",
  "fechaEmision": "YYYY-MM-DD",
  "subtotal": 0.00,
  "igv": 0.00,
  "total": 0.00,
  "moneda": "PEN",
  "items": [
    {
      "descripcion": "descripción del producto",
      "cantidad": 1,
      "precioUnitario": 0.00,
      "subtotal": 0.00
    }
  ],
  "confianza": 85
}

Si algún campo no es legible, usa "" para texto y 0 para números. El campo confianza (0-100) refleja tu certeza general."""

OCR_SERIAL_PROMPT = """Analiza esta imagen y extrae todos los números de serie visibles.

Los números de serie suelen estar en etiquetas, placas metálicas, o stickers del equipo.
Pueden tener formatos como: VNB3R14032, CNC2471XY9, MXLW123456, etc.

Responde SOLO con JSON válido:
{
  "numerosDetectados": ["SERIAL1", "SERIAL2"],
  "confianza": 85
}

Si no encuentras números de serie, devuelve una lista vacía con confianza 0."""

CLASSIFY_TICKET_PROMPT = """Eres un técnico experto en fotocopiadoras e impresoras.

Clasifica este ticket de soporte técnico:
- Título: {titulo}
- Descripción: {descripcion}
- Falla reportada: {falla_reportada}

Responde SOLO con JSON válido:
{{
  "prioridadSugerida": "BAJA|MEDIA|ALTA|CRITICA",
  "tipoServicioSugerido": "TALLER|VISITA|REMOTO",
  "categoriaFalla": "categoría breve de la falla",
  "confianza": 85,
  "razonamiento": "explicación breve de por qué sugieres esta clasificación"
}}

Criterios de prioridad:
- CRITICA: equipo principal de producción detenido, cliente importante
- ALTA: equipo afecta operaciones, múltiples usuarios impactados
- MEDIA: equipo funciona parcialmente, tiene workaround
- BAJA: mantenimiento preventivo, mejoras, consultas

Criterios de tipo de servicio:
- TALLER: requiere desmontaje, piezas especiales, calibración
- VISITA: puede resolverse in-situ pero necesita presencia física
- REMOTO: configuración, drivers, ajustes de software"""


class ClaudeService:
    """Wrapper for Anthropic Claude API calls."""

    def __init__(self) -> None:
        self._client: ClaudeClient | None = None
        if settings.ANTHROPIC_API_KEY:
            try:
                import anthropic

                client = cast(
                    object,
                    anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY),
                )
                self._client = cast(ClaudeClient, client)
                logger.info("Claude client initialized")
            except Exception as e:
                logger.warning(f"Failed to initialize Claude client: {e}")

    @property
    def is_available(self) -> bool:
        return self._client is not None

    @staticmethod
    def _extract_response_text(response: ClaudeMessageResponse) -> str:
        if not response.content:
            raise ValueError("Claude response did not include any content blocks")
        return response.content[0].text

    @staticmethod
    def _as_str(value: object, default: str = "") -> str:
        return value if isinstance(value, str) else default

    @staticmethod
    def _as_float(value: object, default: float = 0.0) -> float:
        if isinstance(value, bool):
            return default
        if isinstance(value, int | float):
            return float(value)
        if isinstance(value, str):
            try:
                return float(value)
            except ValueError:
                return default
        return default

    @staticmethod
    def _as_object_list(value: object) -> list[JsonObject]:
        if not isinstance(value, list):
            return []

        items = cast(list[object], value)
        objects: list[JsonObject] = []
        for item in items:
            if isinstance(item, dict):
                objects.append(cast(JsonObject, item))
        return objects

    @staticmethod
    def _as_str_list(value: object) -> list[str]:
        if not isinstance(value, list):
            return []

        items = cast(list[object], value)
        return [item for item in items if isinstance(item, str)]

    @staticmethod
    def _as_prioridad_ticket(
        value: object,
        default: PrioridadTicket = PrioridadTicket.MEDIA,
    ) -> PrioridadTicket:
        raw_value = value if isinstance(value, str) else default.value
        try:
            return PrioridadTicket(raw_value)
        except ValueError:
            return default

    @staticmethod
    def _as_tipo_servicio(
        value: object,
        default: TipoServicio = TipoServicio.TALLER,
    ) -> TipoServicio:
        raw_value = value if isinstance(value, str) else default.value
        try:
            return TipoServicio(raw_value)
        except ValueError:
            return default

    @staticmethod
    def _build_vision_message(
        b64_image: str,
        media_type: str,
        prompt: str,
    ) -> ClaudeMessageParam:
        content: list[ClaudeMessageParam] = [
            {
                "type": "image",
                "source": {
                    "type": "base64",
                    "media_type": media_type,
                    "data": b64_image,
                },
            },
            {"type": "text", "text": prompt},
        ]
        return {"role": "user", "content": content}

    @staticmethod
    def parse_json_response(text: str) -> JsonObject:
        """Extract JSON from Claude's response, handling markdown code blocks."""
        cleaned = text.strip()
        if cleaned.startswith("```"):
            lines = cleaned.split("\n")
            lines = [line for line in lines[1:] if not line.strip().startswith("```")]
            cleaned = "\n".join(lines)

        parsed = cast(object, json.loads(cleaned))
        if not isinstance(parsed, dict):
            raise ValueError("Claude response must be a JSON object")
        return cast(JsonObject, parsed)

    async def extract_invoice_data(
        self,
        image_bytes: bytes,
        media_type: str,
    ) -> OcrInvoiceResult:
        """Extract invoice data from an image using Claude Vision."""
        client = self._client
        if client is None:
            logger.info("Claude not available — returning mock invoice data")
            return MOCK_INVOICE

        try:
            b64_image = base64.standard_b64encode(image_bytes).decode("utf-8")
            response = client.messages.create(
                model="claude-sonnet-4-20250514",
                max_tokens=2000,
                messages=[
                    self._build_vision_message(
                        b64_image=b64_image,
                        media_type=media_type,
                        prompt=OCR_INVOICE_PROMPT,
                    )
                ],
            )

            data = self.parse_json_response(self._extract_response_text(response))
            invoice_items = self._as_object_list(data.get("items"))
            return OcrInvoiceResult(
                proveedorNombre=self._as_str(data.get("proveedorNombre")),
                proveedorRuc=self._as_str(data.get("proveedorRuc")),
                numeroFactura=self._as_str(data.get("numeroFactura")),
                fechaEmision=self._as_str(data.get("fechaEmision")),
                subtotal=self._as_float(data.get("subtotal")),
                igv=self._as_float(data.get("igv")),
                total=self._as_float(data.get("total")),
                moneda=self._as_str(data.get("moneda"), "PEN"),
                items=[
                    OcrInvoiceItem(
                        descripcion=self._as_str(item.get("descripcion")),
                        cantidad=self._as_float(item.get("cantidad")),
                        precioUnitario=self._as_float(item.get("precioUnitario")),
                        subtotal=self._as_float(item.get("subtotal")),
                    )
                    for item in invoice_items
                ],
                confianza=self._as_float(data.get("confianza"), 50.0),
            )
        except Exception as e:
            logger.error(f"OCR invoice extraction failed: {e}")
            raise

    async def extract_serial_numbers(
        self,
        image_bytes: bytes,
        media_type: str,
    ) -> OcrSerialResult:
        """Extract serial numbers from an equipment photo."""
        client = self._client
        if client is None:
            logger.info("Claude not available — returning mock serial data")
            return MOCK_SERIAL

        try:
            b64_image = base64.standard_b64encode(image_bytes).decode("utf-8")
            response = client.messages.create(
                model="claude-sonnet-4-20250514",
                max_tokens=1000,
                messages=[
                    self._build_vision_message(
                        b64_image=b64_image,
                        media_type=media_type,
                        prompt=OCR_SERIAL_PROMPT,
                    )
                ],
            )

            data = self.parse_json_response(self._extract_response_text(response))
            return OcrSerialResult(
                numerosDetectados=self._as_str_list(data.get("numerosDetectados")),
                confianza=self._as_float(data.get("confianza"), 0.0),
            )
        except Exception as e:
            logger.error(f"Serial number extraction failed: {e}")
            raise

    async def classify_ticket(
        self,
        request: ClasificarTicketRequest,
    ) -> TicketClassificationResult:
        """Classify a support ticket using Claude."""
        client = self._client
        if client is None:
            logger.info("Claude not available — returning mock classification")
            return MOCK_CLASSIFICATION

        try:
            prompt = CLASSIFY_TICKET_PROMPT.format(
                titulo=request.titulo,
                descripcion=request.descripcion,
                falla_reportada=request.falla_reportada or "No especificada",
            )

            response = client.messages.create(
                model="claude-sonnet-4-20250514",
                max_tokens=1000,
                messages=[{"role": "user", "content": prompt}],
            )

            data = self.parse_json_response(self._extract_response_text(response))
            return TicketClassificationResult(
                prioridadSugerida=self._as_prioridad_ticket(
                    data.get("prioridadSugerida")
                ),
                tipoServicioSugerido=self._as_tipo_servicio(
                    data.get("tipoServicioSugerido")
                ),
                categoriaFalla=self._as_str(
                    data.get("categoriaFalla"),
                    "Sin clasificar",
                ),
                confianza=self._as_float(data.get("confianza"), 50.0),
                razonamiento=self._as_str(data.get("razonamiento")),
            )
        except Exception as e:
            logger.error(f"Ticket classification failed: {e}")
            raise


# Singleton instance
claude_service = ClaudeService()
