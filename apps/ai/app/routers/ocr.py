import io
import logging
from collections.abc import Callable
from typing import Annotated, BinaryIO, Protocol, TypeAlias, cast

from fastapi import APIRouter, File, HTTPException, UploadFile

from app.schemas.ocr_schemas import OcrInvoiceResult, OcrSerialResult
from app.services.claude_service import claude_service

logger = logging.getLogger(__name__)


class SupportsSave(Protocol):
    def save(self, fp: BinaryIO, format: str) -> None: ...


PdfToImageConverter: TypeAlias = Callable[..., list[SupportsSave]]

router = APIRouter()

ALLOWED_IMAGE_TYPES = {
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
}
ALLOWED_DOC_TYPES = ALLOWED_IMAGE_TYPES | {"application/pdf"}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB


def _convert_pdf_first_page_to_png(contents: bytes) -> bytes:
    try:
        import pdf2image
    except ImportError as exc:
        raise HTTPException(
            status_code=500,
            detail="pdf2image no disponible para procesar PDFs",
        ) from exc

    convert_from_bytes = cast(PdfToImageConverter, pdf2image.convert_from_bytes)
    images = convert_from_bytes(contents, first_page=1, last_page=1)
    if not images:
        raise HTTPException(status_code=400, detail="No se pudo leer el PDF")

    buffer = io.BytesIO()
    images[0].save(buffer, format="PNG")
    return buffer.getvalue()


@router.post("/invoice", response_model=OcrInvoiceResult)
async def ocr_invoice(file: Annotated[UploadFile, File(...)]) -> OcrInvoiceResult:
    """Extract structured data from an invoice image or PDF."""
    if file.content_type not in ALLOWED_DOC_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Tipo de archivo no soportado: {file.content_type}. Formatos aceptados: JPEG, PNG, WebP, GIF, PDF",
        )

    contents = await file.read()
    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=400, detail="Archivo demasiado grande (máx 10 MB)"
        )

    media_type = file.content_type or "image/jpeg"
    if media_type == "application/pdf":
        contents = _convert_pdf_first_page_to_png(contents)
        media_type = "image/png"

    try:
        return await claude_service.extract_invoice_data(contents, media_type)
    except Exception as e:
        logger.error(f"OCR invoice failed: {e}")
        raise HTTPException(
            status_code=500, detail=f"Error procesando factura: {str(e)}"
        )


@router.post("/serial", response_model=OcrSerialResult)
async def ocr_serial(file: Annotated[UploadFile, File(...)]) -> OcrSerialResult:
    """Extract serial numbers from an equipment photo."""
    if file.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Tipo de archivo no soportado: {file.content_type}. Formatos aceptados: JPEG, PNG, WebP, GIF",
        )

    contents = await file.read()
    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=400, detail="Archivo demasiado grande (máx 10 MB)"
        )

    try:
        return await claude_service.extract_serial_numbers(
            contents, file.content_type or "image/jpeg"
        )
    except Exception as e:
        logger.error(f"OCR serial failed: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Error extrayendo números de serie: {str(e)}",
        )
