# Especificación de Diseño: Consulta DNI/RUC con Decolecta en Clientes

## Contexto y Objetivo

El módulo de Clientes ya distingue persona natural (`DNI`) y empresa (`RUC`), y el pipeline de facturación consulta `cliente_validaciones_sunat` para decidir si debe advertir o bloquear una factura. Hoy el usuario todavía debe escribir datos de clientes manualmente, lo que aumenta el riesgo de razón social, dirección fiscal o nombres mal ingresados antes de emitir comprobantes.

El objetivo de este corte es integrar **Decolecta** como primer proveedor de consulta documental para el panel de Clientes. La solución debe consultar RUC y DNI desde el backend, autocompletar el formulario en web, y persistir la validación normalizada para que facturación use la misma fuente interna.

## Alcance

- Implementar consultas de RUC y DNI usando Decolecta.
- Exponer un endpoint interno protegido para el frontend ERP.
- Autocompletar `ClienteForm` en creación y edición.
- Guardar/actualizar `ClienteValidacionSunat` para RUC y DNI consultados.
- Dejar la arquitectura preparada para agregar otros proveedores después, sin implementar fallback multi-proveedor todavía.

Fuera de alcance en este corte:

- Panel administrativo para cambiar proveedor desde UI.
- Consumo directo desde frontend hacia Decolecta.
- Validación masiva de clientes existentes.
- Compra, monitoreo o control de cuota del plan Decolecta.

## Proveedor Inicial

Decolecta requiere token generado en su plataforma y lo recibe en `Authorization: Bearer <token>`.

Endpoints documentados:

- RUC SUNAT: `GET https://api.decolecta.com/v1/sunat/ruc?numero=<ruc>`
- DNI RENIEC: `GET https://api.decolecta.com/v1/reniec/dni?numero=<dni>`

Variables de entorno nuevas:

```env
DECOLECTA_API_TOKEN=""
DECOLECTA_API_BASE_URL="https://api.decolecta.com"
DECOLECTA_TIMEOUT_MS="8000"
```

Si falta `DECOLECTA_API_TOKEN`, el backend debe responder un error controlado y no intentar consultar al proveedor.

## Arquitectura Backend

Se agregará una frontera interna dentro del módulo `clientes`:

- `ConsultaDocumentoClienteController` o endpoint adicional en `ClientesController`.
- `ConsultaDocumentoClienteService`, responsable del caso de uso.
- `DecolectaDocumentoProvider`, responsable de hablar con Decolecta.

Endpoint propuesto:

```http
POST /api/v1/clientes/consulta-documento
```

Payload:

```json
{
  "tipoDocumento": "DNI",
  "numeroDocumento": "12345678"
}
```

o:

```json
{
  "tipoDocumento": "RUC",
  "numeroDocumento": "20123456789"
}
```

Roles permitidos:

- `ADMIN`
- `ENCARGADO`

No se habilita para `TECNICO` porque la consulta consume cuota externa y modifica trazabilidad de validación.

Contrato normalizado de respuesta:

```ts
interface ConsultaDocumentoClienteResult {
  tipoDocumento: "DNI" | "RUC";
  tipoDocumentoSunat: "1" | "6";
  numeroDocumento: string;
  proveedor: "DECOLECTA";
  consultadoAt: string;
  nombres?: string;
  apellidoPaterno?: string;
  apellidoMaterno?: string;
  nombreCompleto?: string;
  razonSocial?: string;
  direccion?: string;
  departamento?: string;
  provincia?: string;
  distrito?: string;
  ubigeo?: string;
  estado?: string;
  condicionDomicilio?: string;
}
```

Validaciones:

- `DNI`: exactamente 8 dígitos y distinto de `00000000`.
- `RUC`: exactamente 11 dígitos, iniciando con `10` o `20`, como ya exige el módulo de clientes.
- El endpoint no crea ni actualiza clientes; solo consulta, normaliza y registra la validación documental.

Persistencia:

- Para RUC:
  - `tipoDocumentoSunat = "6"`
  - `numeroDocumento = ruc`
  - `nombreNormalizado = razon_social`
  - `direccionFiscal = direccion`
  - `estado = estado` original del padrón SUNAT devuelto por Decolecta, por ejemplo `ACTIVO`
  - `condicionDomicilio = condicion`
  - `ultimaValidacionAt = now`
- Para DNI:
  - `tipoDocumentoSunat = "1"`
  - `numeroDocumento = dni`
  - `nombreNormalizado = full_name` o nombres y apellidos unidos
  - `estado = "VALIDO"` si Decolecta devuelve datos completos
  - `ultimaValidacionAt = now`

Si existe un cliente con ese documento, el registro de validación debe asociarse con `clienteId`. Si no existe, se guarda sin `clienteId` para que pueda enlazarse luego al crear o actualizar el cliente.

Compatibilidad existente:

- `ValidacionFiscalService` ya espera que el RUC validado guarde estados de padrón como `ACTIVO`; esa semántica se mantiene.
- La UI de Clientes debe adaptar su lectura de estado documental para tratar `ACTIVO` como validado y condiciones distintas de `HABIDO` como advertencia o peligro, sin cambiar el contrato de emisión SUNAT.
- Para DNI, como no hay estado tributario SUNAT equivalente, se usará `VALIDO` cuando Decolecta devuelva nombres y apellidos completos.

## UX Frontend

En `ClienteForm` se agregará un botón de consulta junto al campo activo:

- Persona natural: campo `DNI`.
- Empresa: campo `RUC`.

Estados del botón:

- Deshabilitado hasta que el documento tenga la longitud válida.
- Loading mientras consulta.
- Error via toast cuando proveedor, token o red fallen.
- Success via toast cuando se encontraron datos.

Autocompletado:

- DNI rellena `nombre` y `apellido`.
- RUC rellena `razonSocial`, `direccion`, `departamento`, `provincia`, `distrito`.
- El autocompletado marca los campos como dirty y ejecuta validación del formulario.
- En creación puede sobrescribir campos fiscales principales tras consulta porque el usuario está buscando explícitamente por documento.
- En edición debe mostrar un texto/toast claro indicando que se actualizaron datos del padrón antes de guardar; no guarda el cliente hasta que el usuario presione guardar.

El token nunca se expone en web. El hook nuevo en `src/hooks/use-clientes.ts` debe llamar al endpoint interno con `api.post`.

## Relación con Facturación

La integración no cambia el flujo de emisión SUNAT ni las credenciales SOL. Su función es mejorar la calidad del cliente receptor antes de emitir.

La facturación seguirá leyendo `cliente_validaciones_sunat` como hoy. Al consultar RUC desde Clientes, la regla de RUC validado recientemente podrá pasar con datos reales del padrón, y las reglas de razón social, estado y condición domiciliaria tendrán información fresca.

## Manejo de Errores

Errores esperados:

- Token no configurado: `503 SERVICE_UNAVAILABLE`, mensaje "Consulta documental no configurada".
- Documento inválido: `400 BAD_REQUEST`.
- Decolecta responde no encontrado o inválido: `404 NOT_FOUND` o `422 UNPROCESSABLE_ENTITY`, según el caso normalizado.
- Timeout o caída del proveedor: `503 SERVICE_UNAVAILABLE`.

El backend debe registrar logs con `Logger`, sin incluir token ni datos sensibles más allá del tipo y número consultado. El frontend debe mostrar mensajes accionables, por ejemplo "No se pudo consultar Decolecta. Puedes completar el cliente manualmente y reintentar luego."

## Testing

Backend:

- Unit tests del servicio para DNI exitoso, RUC exitoso, documento inválido, token faltante, timeout/proveedor caído y persistencia `upsert` de `ClienteValidacionSunat`.
- Controller test o e2e enfocado para validar roles y payload.

Frontend:

- Test del hook de consulta documental con `api.post`.
- Test de `ClienteForm` para habilitar botón, mostrar loading, rellenar DNI y rellenar RUC.

Verificación manual:

1. Crear cliente natural, ingresar DNI válido, consultar y verificar nombres/apellidos.
2. Crear empresa, ingresar RUC válido, consultar y verificar razón social, dirección y ubigeo.
3. Guardar el cliente y confirmar que aparece con estado documental validado en la tabla.
4. Emitir una factura de prueba con un cliente RUC consultado y confirmar que la validación fiscal no advierte "RUC nunca validado".
5. Quitar `DECOLECTA_API_TOKEN` en entorno local y confirmar que el error no rompe el formulario.
