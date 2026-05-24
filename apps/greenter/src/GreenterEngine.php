<?php

declare(strict_types=1);

namespace Inventori\Greenter;

use DateTimeImmutable;
use Greenter\Model\Client\Client;
use Greenter\Model\Company\Address;
use Greenter\Model\Company\Company;
use Greenter\Model\Response\BillResult;
use Greenter\Model\Response\StatusResult;
use Greenter\Model\Response\SummaryResult;
use Greenter\Model\Sale\FormaPagos\FormaPagoContado;
use Greenter\Model\Sale\Invoice;
use Greenter\Model\Sale\Legend;
use Greenter\Model\Sale\Note;
use Greenter\Model\Sale\SaleDetail;
use Greenter\Model\Voided\Voided;
use Greenter\Model\Voided\VoidedDetail;
use Greenter\See;
use InvalidArgumentException;

final class GreenterEngine
{
    /**
     * @param array<string, mixed> $payload
     * @return array<string, mixed>
     */
    public function emitir(array $payload): array
    {
        $documento = $this->requireArray($payload, 'documento');
        $send = (bool)($payload['send'] ?? true);

        $see = $this->buildSee($payload);
        $document = $this->buildDocument($documento);

        if (!$send) {
            $xml = $see->getXmlSigned($document);

            return [
                'success' => true,
                'accepted' => null,
                'fileName' => $document->getName(),
                'xml' => base64_encode($xml),
                'xmlText' => $xml,
                'diagnostico' => $this->diagnostico($documento, $document, $xml),
            ];
        }

        /** @var BillResult $result */
        $result = $see->send($document);
        $xml = $see->getFactory()->getLastXml() ?? '';

        if (!$result->isSuccess()) {
            $error = $result->getError();

            return [
                'success' => false,
                'accepted' => false,
                'fileName' => $document->getName(),
                'xml' => base64_encode($xml),
                'xmlText' => $xml,
                'diagnostico' => $this->diagnostico($documento, $document, $xml),
                'error' => [
                    'code' => $error?->getCode() ?? 'SUNAT_ERROR',
                    'message' => $error?->getMessage() ?? 'SUNAT rechazo el documento.',
                ],
            ];
        }

        $cdr = $result->getCdrResponse();

        return [
            'success' => true,
            'accepted' => $cdr?->isAccepted(),
            'fileName' => $document->getName(),
            'xml' => base64_encode($xml),
            'xmlText' => $xml,
            'cdrZip' => $result->getCdrZip() ? base64_encode($result->getCdrZip()) : null,
            'cdr' => [
                'id' => $cdr?->getId(),
                'code' => $cdr?->getCode(),
                'description' => $cdr?->getDescription(),
                'notes' => $cdr?->getNotes() ?? [],
                'reference' => $cdr?->getReference(),
            ],
            'diagnostico' => $this->diagnostico($documento, $document, $xml),
        ];
    }

    /**
     * @param array<string, mixed> $payload
     * @return array<string, mixed>
     */
    public function comunicarBaja(array $payload): array
    {
        $baja = $this->requireArray($payload, 'baja');
        $send = (bool)($payload['send'] ?? true);

        $see = $this->buildSee($payload);
        $voided = $this->buildVoided($baja);

        if (!$send) {
            $xml = $see->getXmlSigned($voided);

            return [
                'success' => true,
                'accepted' => null,
                'fileName' => $voided->getName(),
                'xml' => base64_encode($xml),
                'xmlText' => $xml,
                'diagnostico' => $this->diagnosticoBaja($baja, $voided, $xml),
            ];
        }

        /** @var SummaryResult $result */
        $result = $see->send($voided);
        $xml = $see->getFactory()->getLastXml() ?? '';

        if (!$result->isSuccess()) {
            $error = $result->getError();

            return [
                'success' => false,
                'accepted' => false,
                'fileName' => $voided->getName(),
                'xml' => base64_encode($xml),
                'xmlText' => $xml,
                'diagnostico' => $this->diagnosticoBaja($baja, $voided, $xml),
                'error' => [
                    'code' => $error?->getCode() ?? 'SUNAT_ERROR',
                    'message' => $error?->getMessage() ?? 'SUNAT rechazo la comunicacion de baja.',
                ],
            ];
        }

        return [
            'success' => true,
            'accepted' => true,
            'ticket' => $result->getTicket(),
            'fileName' => $voided->getName(),
            'xml' => base64_encode($xml),
            'xmlText' => $xml,
            'diagnostico' => $this->diagnosticoBaja($baja, $voided, $xml),
        ];
    }

    /**
     * @param array<string, mixed> $payload
     * @return array<string, mixed>
     */
    public function consultarTicket(array $payload): array
    {
        $ticket = $this->requireString($payload, 'ticket');
        $see = $this->buildSee($payload);

        /** @var StatusResult $result */
        $result = $see->getStatus($ticket);

        if (!$result->isSuccess()) {
            $error = $result->getError();

            return [
                'success' => false,
                'accepted' => false,
                'statusCode' => $result->getCode(),
                'error' => [
                    'code' => $error?->getCode() ?? $result->getCode() ?? 'SUNAT_ERROR',
                    'message' => $error?->getMessage() ?? 'SUNAT no resolvio el ticket.',
                ],
            ];
        }

        $cdr = $result->getCdrResponse();

        return [
            'success' => true,
            'accepted' => $cdr?->isAccepted() ?? ($result->getCode() === '0'),
            'statusCode' => $result->getCode(),
            'cdrZip' => $result->getCdrZip() ? base64_encode($result->getCdrZip()) : null,
            'cdr' => [
                'id' => $cdr?->getId(),
                'code' => $cdr?->getCode() ?? $result->getCode(),
                'description' => $cdr?->getDescription(),
                'notes' => $cdr?->getNotes() ?? [],
                'reference' => $cdr?->getReference(),
            ],
        ];
    }

    /**
     * @param array<string, mixed> $payload
     */
    private function buildSee(array $payload): See
    {
        $sunat = $this->requireArray($payload, 'sunat');
        $sol = $this->requireArray($sunat, 'sol');
        $endpoint = $this->requireString($sunat, 'endpoint');
        $ruc = $this->requireString($sol, 'ruc');
        $usuario = $this->requireString($sol, 'usuario');
        $clave = $this->requireString($sol, 'clave');
        $certificate = $this->readCertificate($sunat);

        $see = new See();
        $see->setService($endpoint);
        $see->setCertificate($certificate);
        $see->setClaveSOL($ruc, $usuario, $clave);
        $see->setCachePath(sys_get_temp_dir() . '/inventori-greenter-cache');

        return $see;
    }

    /**
     * @param array<string, mixed> $documento
     */
    private function buildDocument(array $documento): Invoice|Note
    {
        $tipoDoc = $this->requireString($documento, 'tipoDoc');

        return match ($tipoDoc) {
            '01', '03' => $this->buildInvoice($documento),
            '07', '08' => $this->buildNote($documento),
            default => throw new InvalidArgumentException("Tipo de documento no soportado por Greenter sidecar: {$tipoDoc}"),
        };
    }

    /**
     * @param array<string, mixed> $documento
     */
    private function buildInvoice(array $documento): Invoice
    {
        $invoice = new Invoice();
        $invoice
            ->setUblVersion((string)($documento['ublVersion'] ?? '2.1'))
            ->setTipoOperacion((string)($documento['tipoOperacion'] ?? '0101'))
            ->setTipoDoc($this->requireString($documento, 'tipoDoc'))
            ->setSerie($this->requireString($documento, 'serie'))
            ->setCorrelativo($this->normalizeCorrelativo($this->requireString($documento, 'correlativo')))
            ->setFechaEmision($this->date($documento['fechaEmision'] ?? 'now'))
            ->setTipoMoneda((string)($documento['moneda'] ?? 'PEN'))
            ->setFormaPago(new FormaPagoContado())
            ->setCompany($this->company($this->requireArray($documento, 'emisor')))
            ->setClient($this->client($this->requireArray($documento, 'cliente')));

        $this->applyTotals($invoice, $this->requireArray($documento, 'totales'));
        $invoice
            ->setDetails($this->details($this->requireArrayList($documento, 'items')))
            ->setLegends($this->legends($documento['leyendas'] ?? []));

        return $invoice;
    }

    /**
     * @param array<string, mixed> $documento
     */
    private function buildNote(array $documento): Note
    {
        $afectado = $this->requireArray($documento, 'documentoAfectado');
        $motivo = $this->requireArray($documento, 'motivo');

        $note = new Note();
        $note
            ->setUblVersion((string)($documento['ublVersion'] ?? '2.1'))
            ->setTipoDoc($this->requireString($documento, 'tipoDoc'))
            ->setSerie($this->requireString($documento, 'serie'))
            ->setCorrelativo($this->normalizeCorrelativo($this->requireString($documento, 'correlativo')))
            ->setFechaEmision($this->date($documento['fechaEmision'] ?? 'now'))
            ->setTipDocAfectado($this->requireString($afectado, 'tipoDoc'))
            ->setNumDocfectado($this->requireString($afectado, 'numero'))
            ->setCodMotivo($this->requireString($motivo, 'codigo'))
            ->setDesMotivo($this->requireString($motivo, 'descripcion'))
            ->setTipoMoneda((string)($documento['moneda'] ?? 'PEN'))
            ->setCompany($this->company($this->requireArray($documento, 'emisor')))
            ->setClient($this->client($this->requireArray($documento, 'cliente')));

        $this->applyTotals($note, $this->requireArray($documento, 'totales'));
        $note
            ->setDetails($this->details($this->requireArrayList($documento, 'items')))
            ->setLegends($this->legends($documento['leyendas'] ?? []));

        return $note;
    }

    /**
     * @param array<string, mixed> $baja
     */
    private function buildVoided(array $baja): Voided
    {
        $identificador = $this->requireString($baja, 'identificadorBaja');
        if (!preg_match('/^RA-\d{8}-(\d{1,5})$/', $identificador, $matches)) {
            throw new InvalidArgumentException("Identificador de baja invalido: {$identificador}");
        }

        $detalle = $this->requireArray($baja, 'detalle');
        $voidedDetail = new VoidedDetail();
        $voidedDetail
            ->setTipoDoc($this->requireString($detalle, 'tipoDoc'))
            ->setSerie($this->requireString($detalle, 'serie'))
            ->setCorrelativo($this->normalizeCorrelativo($this->requireString($detalle, 'correlativo')))
            ->setDesMotivoBaja($this->requireString($detalle, 'motivo'));

        $voided = new Voided();
        $voided
            ->setCorrelativo($matches[1])
            ->setFecGeneracion($this->date($baja['fechaReferencia'] ?? 'now'))
            ->setFecComunicacion($this->date($baja['fechaComunicacion'] ?? 'now'))
            ->setCompany($this->company($this->requireArray($baja, 'emisor')))
            ->setDetails([$voidedDetail]);

        return $voided;
    }

    /**
     * @param array<string, mixed> $emisor
     */
    private function company(array $emisor): Company
    {
        $company = new Company();
        $company
            ->setRuc($this->requireString($emisor, 'ruc'))
            ->setRazonSocial($this->requireString($emisor, 'razonSocial'))
            ->setNombreComercial((string)($emisor['nombreComercial'] ?? $emisor['razonSocial']))
            ->setAddress($this->address($emisor['direccion'] ?? []));

        return $company;
    }

    /**
     * @param array<string, mixed> $cliente
     */
    private function client(array $cliente): Client
    {
        $client = new Client();
        $client
            ->setTipoDoc($this->requireString($cliente, 'tipoDoc'))
            ->setNumDoc($this->requireString($cliente, 'numDoc'))
            ->setRznSocial($this->requireString($cliente, 'razonSocial'));

        if (isset($cliente['direccion']) && is_array($cliente['direccion'])) {
            $client->setAddress($this->address($cliente['direccion']));
        }

        return $client;
    }

    /**
     * @param mixed $rawAddress
     */
    private function address(mixed $rawAddress): Address
    {
        $address = is_array($rawAddress) ? $rawAddress : [];
        $greenterAddress = new Address();
        $greenterAddress
            ->setUbigueo((string)($address['ubigeo'] ?? '000000'))
            ->setCodigoPais((string)($address['codigoPais'] ?? 'PE'))
            ->setDepartamento((string)($address['departamento'] ?? '-'))
            ->setProvincia((string)($address['provincia'] ?? '-'))
            ->setDistrito((string)($address['distrito'] ?? '-'))
            ->setUrbanizacion((string)($address['urbanizacion'] ?? '-'))
            ->setDireccion((string)($address['direccion'] ?? '-'))
            ->setCodLocal((string)($address['codigoEstablecimiento'] ?? '0000'));

        return $greenterAddress;
    }

    /**
     * @param Invoice|Note $sale
     * @param array<string, mixed> $totales
     */
    private function applyTotals(Invoice|Note $sale, array $totales): void
    {
        $sale
            ->setMtoOperGravadas($this->float($totales['operGravadas'] ?? 0))
            ->setMtoOperExoneradas($this->float($totales['operExoneradas'] ?? 0))
            ->setMtoOperInafectas($this->float($totales['operInafectas'] ?? 0))
            ->setMtoOperExportacion($this->float($totales['operExportacion'] ?? 0))
            ->setMtoOperGratuitas($this->float($totales['operGratuitas'] ?? 0))
            ->setMtoIGVGratuitas($this->float($totales['igvGratuitas'] ?? 0))
            ->setMtoIGV($this->float($totales['igv'] ?? 0))
            ->setTotalImpuestos($this->float($totales['totalImpuestos'] ?? ($totales['igv'] ?? 0)))
            ->setValorVenta($this->float($totales['valorVenta'] ?? ($totales['operGravadas'] ?? 0)))
            ->setSubTotal($this->float($totales['subTotal'] ?? ($totales['importeTotal'] ?? 0)))
            ->setMtoImpVenta($this->float($totales['importeTotal'] ?? ($totales['subTotal'] ?? 0)));
    }

    /**
     * @param array<int, array<string, mixed>> $items
     * @return SaleDetail[]
     */
    private function details(array $items): array
    {
        return array_map(function (array $item): SaleDetail {
            $detail = new SaleDetail();
            $detail
                ->setCodProducto((string)($item['codigo'] ?? $item['codProducto'] ?? 'SERV'))
                ->setUnidad((string)($item['unidad'] ?? 'NIU'))
                ->setCantidad($this->float($item['cantidad'] ?? 1))
                ->setDescripcion((string)($item['descripcion'] ?? 'ITEM'))
                ->setMtoBaseIgv($this->float($item['baseIgv'] ?? $item['valorVenta'] ?? 0))
                ->setPorcentajeIgv($this->float($item['porcentajeIgv'] ?? 18))
                ->setIgv($this->float($item['igv'] ?? 0))
                ->setTipAfeIgv((string)($item['tipoAfectacionIgv'] ?? '10'))
                ->setTotalImpuestos($this->float($item['totalImpuestos'] ?? $item['igv'] ?? 0))
                ->setMtoValorVenta($this->float($item['valorVenta'] ?? 0))
                ->setMtoValorUnitario($this->float($item['valorUnitario'] ?? 0))
                ->setMtoPrecioUnitario($this->float($item['precioUnitario'] ?? 0));

            return $detail;
        }, $items);
    }

    /**
     * @param mixed $rawLegends
     * @return Legend[]
     */
    private function legends(mixed $rawLegends): array
    {
        if (!is_array($rawLegends) || $rawLegends === []) {
            return [];
        }

        return array_map(function (mixed $legend): Legend {
            if (!is_array($legend)) {
                throw new InvalidArgumentException('Cada leyenda debe ser un objeto.');
            }

            $greenterLegend = new Legend();
            $greenterLegend
                ->setCode((string)($legend['codigo'] ?? $legend['code'] ?? '1000'))
                ->setValue((string)($legend['valor'] ?? $legend['value'] ?? ''));

            return $greenterLegend;
        }, array_values($rawLegends));
    }

    /**
     * @param array<string, mixed> $sunat
     */
    private function readCertificate(array $sunat): string
    {
        $raw = (string)($sunat['certificatePem'] ?? $sunat['certificadoPem'] ?? '');
        if ($raw !== '') {
            return str_contains($raw, '-----BEGIN')
                ? $raw
                : (base64_decode($raw, true) ?: $raw);
        }

        $path = (string)($sunat['certificatePath'] ?? $sunat['certificadoPath'] ?? '');
        if ($path === '' || !is_file($path)) {
            throw new InvalidArgumentException('Debe enviar certificatePem/certificadoPem o certificatePath/certificadoPath.');
        }

        $contents = file_get_contents($path);
        if ($contents === false) {
            throw new InvalidArgumentException('No se pudo leer el certificado indicado.');
        }

        return $contents;
    }

    /**
     * @param array<string, mixed> $documento
     * @param Invoice|Note $document
     * @return array<string, mixed>
     */
    private function diagnostico(array $documento, Invoice|Note $document, string $xml): array
    {
        return [
            'fileName' => $document->getName(),
            'tipoDoc' => $documento['tipoDoc'] ?? null,
            'serie' => $documento['serie'] ?? null,
            'correlativo' => $documento['correlativo'] ?? null,
            'root' => $document instanceof Note ? 'Note' : 'Invoice',
            'ublVersion' => $documento['ublVersion'] ?? '2.1',
            'customization' => '2.0',
            'bytesXml' => strlen($xml),
            'shaXml' => $xml === '' ? null : hash('sha256', $xml),
            'primerosBytes' => $xml === '' ? null : bin2hex(substr($xml, 0, 16)),
        ];
    }

    /**
     * @param array<string, mixed> $baja
     * @return array<string, mixed>
     */
    private function diagnosticoBaja(array $baja, Voided $document, string $xml): array
    {
        return [
            'fileName' => $document->getName(),
            'identificadorBaja' => $baja['identificadorBaja'] ?? null,
            'root' => 'VoidedDocuments',
            'ublVersion' => '2.0',
            'customization' => '1.0',
            'bytesXml' => strlen($xml),
            'shaXml' => $xml === '' ? null : hash('sha256', $xml),
            'primerosBytes' => $xml === '' ? null : bin2hex(substr($xml, 0, 16)),
        ];
    }

    /**
     * @param array<string, mixed> $payload
     * @return array<string, mixed>
     */
    private function requireArray(array $payload, string $key): array
    {
        if (!isset($payload[$key]) || !is_array($payload[$key])) {
            throw new InvalidArgumentException("Falta objeto requerido: {$key}");
        }

        return $payload[$key];
    }

    /**
     * @param array<string, mixed> $payload
     * @return array<int, array<string, mixed>>
     */
    private function requireArrayList(array $payload, string $key): array
    {
        $value = $this->requireArray($payload, $key);
        foreach ($value as $index => $item) {
            if (!is_array($item)) {
                throw new InvalidArgumentException("El item {$index} de {$key} debe ser objeto.");
            }
        }

        return array_values($value);
    }

    /**
     * @param array<string, mixed> $payload
     */
    private function requireString(array $payload, string $key): string
    {
        $value = $payload[$key] ?? null;
        if ($value === null || trim((string)$value) === '') {
            throw new InvalidArgumentException("Falta texto requerido: {$key}");
        }

        return trim((string)$value);
    }

    private function normalizeCorrelativo(string $value): string
    {
        $trimmed = ltrim($value, '0');

        return $trimmed === '' ? '0' : $trimmed;
    }

    private function date(mixed $value): DateTimeImmutable
    {
        return new DateTimeImmutable((string)$value);
    }

    private function float(mixed $value): float
    {
        return round((float)$value, 2);
    }
}
