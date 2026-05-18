from enum import Enum
from typing import ClassVar

from pydantic import BaseModel, ConfigDict, Field


class PrioridadTicket(str, Enum):
    BAJA = "BAJA"
    MEDIA = "MEDIA"
    ALTA = "ALTA"
    CRITICA = "CRITICA"


class TipoServicio(str, Enum):
    TALLER = "TALLER"
    VISITA = "VISITA"
    REMOTO = "REMOTO"


class ClasificarTicketRequest(BaseModel):
    titulo: str
    descripcion: str
    falla_reportada: str | None = Field(default=None, alias="fallaReportada")

    model_config: ClassVar[ConfigDict] = ConfigDict(populate_by_name=True)


class TicketClassificationResult(BaseModel):
    prioridad_sugerida: PrioridadTicket = Field(alias="prioridadSugerida")
    tipo_servicio_sugerido: TipoServicio = Field(alias="tipoServicioSugerido")
    categoria_falla: str = Field(alias="categoriaFalla")
    confianza: float = Field(ge=0, le=100)
    razonamiento: str

    model_config: ClassVar[ConfigDict] = ConfigDict(populate_by_name=True)
