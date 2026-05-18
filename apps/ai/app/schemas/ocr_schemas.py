from typing import ClassVar

from pydantic import BaseModel, ConfigDict, Field


class OcrInvoiceItem(BaseModel):
    descripcion: str
    cantidad: float
    precio_unitario: float = Field(alias="precioUnitario")
    subtotal: float

    model_config: ClassVar[ConfigDict] = ConfigDict(populate_by_name=True)


class OcrInvoiceResult(BaseModel):
    proveedor_nombre: str = Field(alias="proveedorNombre")
    proveedor_ruc: str = Field(alias="proveedorRuc")
    numero_factura: str = Field(alias="numeroFactura")
    fecha_emision: str = Field(alias="fechaEmision")
    subtotal: float
    igv: float
    total: float
    moneda: str = "PEN"
    items: list[OcrInvoiceItem] = Field(default_factory=list)
    confianza: float = Field(ge=0, le=100)
    texto_original: str | None = Field(default=None, alias="textoOriginal")

    model_config: ClassVar[ConfigDict] = ConfigDict(populate_by_name=True)


class OcrSerialResult(BaseModel):
    numeros_detectados: list[str] = Field(alias="numerosDetectados")
    confianza: float = Field(ge=0, le=100)

    model_config: ClassVar[ConfigDict] = ConfigDict(populate_by_name=True)
