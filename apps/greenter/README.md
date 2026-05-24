# Inventori Greenter Sidecar

Servicio PHP aislado para construir, firmar y enviar CPE SUNAT usando Greenter.

## Endpoints

- `GET /health`
- `POST /emitir`

`/emitir` recibe un JSON con `sunat` y `documento`. Si `send=false`, solo firma y devuelve el XML; si `send=true`, envia a SUNAT.

## Contrato minimo

```json
{
  "send": false,
  "sunat": {
    "endpoint": "https://e-beta.sunat.gob.pe/ol-ti-itcpfegem-beta/billService",
    "certificatePem": "-----BEGIN PRIVATE KEY-----...-----END CERTIFICATE-----",
    "sol": {
      "ruc": "10013415116",
      "usuario": "MODDATOS",
      "clave": "moddatos"
    }
  },
  "documento": {
    "tipoDoc": "03",
    "serie": "B001",
    "correlativo": "1",
    "fechaEmision": "2026-05-22T10:00:00-05:00",
    "moneda": "PEN",
    "emisor": {
      "ruc": "10013415116",
      "razonSocial": "EMPRESA DEMO",
      "direccion": {
        "ubigeo": "150101",
        "departamento": "LIMA",
        "provincia": "LIMA",
        "distrito": "LIMA",
        "direccion": "AV. DEMO 123",
        "codigoEstablecimiento": "0000"
      }
    },
    "cliente": {
      "tipoDoc": "1",
      "numDoc": "00000000",
      "razonSocial": "CLIENTE DEMO"
    },
    "totales": {
      "operGravadas": 10,
      "igv": 1.8,
      "totalImpuestos": 1.8,
      "valorVenta": 10,
      "subTotal": 11.8,
      "importeTotal": 11.8
    },
    "items": [
      {
        "codigo": "SERV",
        "unidad": "NIU",
        "cantidad": 1,
        "descripcion": "Producto demo",
        "baseIgv": 10,
        "porcentajeIgv": 18,
        "igv": 1.8,
        "tipoAfectacionIgv": "10",
        "totalImpuestos": 1.8,
        "valorVenta": 10,
        "valorUnitario": 10,
        "precioUnitario": 11.8
      }
    ],
    "leyendas": [
      {
        "codigo": "1000",
        "valor": "SON ONCE CON 80/100 SOLES"
      }
    ]
  }
}
```
