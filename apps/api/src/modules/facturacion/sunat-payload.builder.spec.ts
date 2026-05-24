import { BadRequestException } from '@nestjs/common';
import { TipoAfectacionIgv, TipoDocumento } from '@erp/shared';
import { SunatPayloadBuilder } from './sunat-payload.builder';

describe('SunatPayloadBuilder', () => {
  let builder: SunatPayloadBuilder;

  beforeEach(() => {
    builder = new SunatPayloadBuilder();
  });

  function buildComprobante(overrides: Record<string, unknown> = {}) {
    return {
      tipo: TipoDocumento.FACTURA,
      serie: 'F001',
      correlativo: 7,
      fechaEmision: new Date('2026-05-02T15:30:45.000Z'),
      clienteDocTipo: '6',
      clienteDocNum: '20999999991',
      clienteNombre: 'Cliente Demo & Asociados SAC',
      clienteDireccion: 'Av. Cliente <Demo> 123',
      emisorRuc: '20123456789',
      emisorRazonSocial: 'Empresa Demo SAC',
      emisorNombreComercial: 'ERP Demo',
      emisorDireccionFiscal: 'Av. Fiscal 456',
      emisorUbigeoFiscal: '150101',
      emisorCodigoEstablecimiento: '0000',
      subtotal: 100,
      igv: 18,
      total: 118,
      detallesFiscales: [
        {
          item: 1,
          codigoInterno: 'SKU-&-001',
          descripcion: 'Servicio de soporte demo ]]> seguro',
          unidadSunat: 'NIU',
          tipoAfectacionIgv: TipoAfectacionIgv.GRAVADO_OPERACION_ONEROSA,
          cantidad: 1,
          valorUnitario: 100,
          precioUnitario: 118,
          descuento: 0,
          baseImponible: 100,
          igv: 18,
          total: 118,
        },
      ],
      ...overrides,
    };
  }

  function buildNota(overrides: Record<string, unknown> = {}) {
    return {
      tipo: 'ANULACION',
      motivo: 'Anulación de operación de ejemplo',
      monto: 118,
      serie: 'FC01',
      correlativo: 3,
      createdAt: new Date('2026-05-03T10:20:30.000Z'),
      comprobanteOrigen: buildComprobante({
        numero: 'F001-00000007',
        total: 118,
        igv: 18,
      }),
      ...overrides,
    };
  }

  it('genera UBL Invoice para factura usando datos fiscales congelados de ejemplo', () => {
    const result = builder.buildInvoice(buildComprobante());

    expect(result.documentCode).toBe('01');
    expect(result.xmlFileName).toBe('20123456789-01-F001-00000007.xml');
    expect(result.fileName).toBe('20123456789-01-F001-00000007');
    expect(result.xml).toMatch(/^<\?xml version="1\.0" encoding="UTF-8"\?>/);
    expect(result.xml).toContain('<cbc:UBLVersionID>2.1</cbc:UBLVersionID>');
    expect(result.xml).toContain('<cbc:CustomizationID>2.0</cbc:CustomizationID>');
    expect(result.xml).toContain('<cbc:ID>F001-00000007</cbc:ID>');
    expect(result.xml).toContain('<cac:PaymentTerms>');
    expect(result.xml).toContain(
      '<cbc:PaymentMeansID>Contado</cbc:PaymentMeansID>',
    );
    expect(result.xml).toContain(
      '<cbc:InvoiceTypeCode listID="0101" listAgencyName="PE:SUNAT" listName="Tipo de Documento" listURI="urn:pe:gob:sunat:cpe:see:gem:catalogos:catalogo01" name="Tipo de Operacion" listSchemeURI="urn:pe:gob:sunat:cpe:see:gem:catalogos:catalogo51">01</cbc:InvoiceTypeCode>',
    );
    expect(result.xml).toContain(
      '<cbc:DocumentCurrencyCode listID="ISO 4217 Alpha" listAgencyName="United Nations Economic Commission for Europe" listName="Currency">PEN</cbc:DocumentCurrencyCode>',
    );
    expect(result.xml).toContain('<cbc:IssueDate>2026-05-02</cbc:IssueDate>');
    expect(result.xml).toContain('<cbc:IssueTime>10:30:45</cbc:IssueTime>');
    expect(result.xml).toContain('<cbc:ID schemeID="6">20123456789</cbc:ID>');
    expect(result.xml).toContain(
      '<cbc:TaxExemptionReasonCode>10</cbc:TaxExemptionReasonCode>',
    );
    expect(result.xml).toContain(
      '<cbc:LineExtensionAmount currencyID="PEN">100.00</cbc:LineExtensionAmount>',
    );
    expect(result.xml).toContain(
      '<cbc:InvoicedQuantity unitCode="NIU">1.0000</cbc:InvoicedQuantity>',
    );
  });

  it('genera UBL Invoice para boleta con código SUNAT 03', () => {
    const result = builder.buildInvoice(
      buildComprobante({
        tipo: TipoDocumento.BOLETA,
        serie: 'B001',
        clienteDocTipo: '1',
        clienteDocNum: '12345678',
      }),
    );

    expect(result.documentCode).toBe('03');
    expect(result.xmlFileName).toBe('20123456789-03-B001-00000007.xml');
    expect(result.xml).toContain(
      '<cbc:InvoiceTypeCode listID="0101" listAgencyName="PE:SUNAT" listName="Tipo de Documento" listURI="urn:pe:gob:sunat:cpe:see:gem:catalogos:catalogo01" name="Tipo de Operacion" listSchemeURI="urn:pe:gob:sunat:cpe:see:gem:catalogos:catalogo51">03</cbc:InvoiceTypeCode>',
    );
  });

  it('formatea fecha y hora de emisión en zona SUNAT Perú, no UTC', () => {
    const result = builder.buildInvoice(
      buildComprobante({
        tipo: TipoDocumento.BOLETA,
        serie: 'B001',
        fechaEmision: new Date('2026-05-22T02:44:31.000Z'),
      }),
    );

    expect(result.xml).toContain('<cbc:IssueDate>2026-05-21</cbc:IssueDate>');
    expect(result.xml).toContain('<cbc:IssueTime>21:44:31</cbc:IssueTime>');
  });

  it('mapea afectaciones IGV semánticas a códigos esperados por SUNAT', () => {
    expect(
      builder.mapAfectacionIgv(TipoAfectacionIgv.GRAVADO_OPERACION_ONEROSA),
    ).toEqual(
      expect.objectContaining({
        taxExemptionReasonCode: '10',
        taxSchemeId: '1000',
        taxSchemeName: 'IGV',
      }),
    );
    expect(
      builder.mapAfectacionIgv(TipoAfectacionIgv.EXONERADO_OPERACION_ONEROSA),
    ).toEqual(
      expect.objectContaining({
        taxExemptionReasonCode: '20',
        taxSchemeId: '9997',
        taxSchemeName: 'EXO',
      }),
    );
    expect(
      builder.mapAfectacionIgv(TipoAfectacionIgv.INAFECTO_OPERACION_ONEROSA),
    ).toEqual(
      expect.objectContaining({
        taxExemptionReasonCode: '30',
        taxSchemeId: '9998',
        taxSchemeName: 'INA',
      }),
    );
    expect(builder.mapAfectacionIgv(TipoAfectacionIgv.EXPORTACION)).toEqual(
      expect.objectContaining({
        taxExemptionReasonCode: '40',
        taxSchemeId: '9995',
        taxSchemeName: 'EXP',
      }),
    );
  });

  it('escapa texto XML normal y protege CDATA en nombres/descripciones', () => {
    const result = builder.buildInvoice(buildComprobante());

    expect(result.xml).toContain('SKU-&amp;-001');
    expect(result.xml).toContain('<![CDATA[Av. Cliente <Demo> 123]]>');
    expect(result.xml).toContain(
      'Servicio de soporte demo ]]]]><![CDATA[> seguro',
    );
  });

  it('envía descripciones de ítems a SUNAT como texto plano sin HTML', () => {
    const result = builder.buildInvoice(
      buildComprobante({
        detallesFiscales: [
          {
            item: 1,
            codigoInterno: 'EQ-IMP-0001',
            descripcion:
              '<p>Konica Minolta Bizhub 808&nbsp;</p><ul><li>Equipo Multifuncional</li></ul>',
            unidadSunat: 'NIU',
            tipoAfectacionIgv: TipoAfectacionIgv.GRAVADO_OPERACION_ONEROSA,
            cantidad: 1,
            valorUnitario: 3813.56,
            precioUnitario: 4500,
            descuento: 0,
            baseImponible: 3813.56,
            igv: 686.44,
            total: 4500,
          },
        ],
      }),
    );

    expect(result.xml).toContain(
      '<cbc:Description><![CDATA[Konica Minolta Bizhub 808 Equipo Multifuncional]]></cbc:Description>',
    );
    expect(result.xml).not.toContain('<p>');
    expect(result.xml).not.toContain('<li>');
    expect(result.xml).not.toContain('&nbsp;');
  });

  it('normaliza unidad legacy UND a NIU antes de enviar a SUNAT', () => {
    const result = builder.buildInvoice(
      buildComprobante({
        detallesFiscales: [
          {
            item: 1,
            codigoInterno: 'EQ-IMP-0001',
            descripcion: 'Konica Minolta Bizhub 808',
            unidadSunat: 'UND',
            tipoAfectacionIgv: TipoAfectacionIgv.GRAVADO_OPERACION_ONEROSA,
            cantidad: 1,
            valorUnitario: 3813.56,
            precioUnitario: 4500,
            descuento: 0,
            baseImponible: 3813.56,
            igv: 686.44,
            total: 4500,
          },
        ],
      }),
    );

    expect(result.xml).toContain(
      '<cbc:InvoicedQuantity unitCode="NIU">1.0000</cbc:InvoicedQuantity>',
    );
    expect(result.xml).not.toContain('unitCode="UND"');
  });

  it('normaliza unidades de servicio legacy a ZZ antes de enviar a SUNAT', () => {
    const result = builder.buildInvoice(
      buildComprobante({
        detallesFiscales: [
          {
            item: 1,
            codigoInterno: 'SRV-001',
            descripcion: 'Diagnóstico',
            unidadSunat: 'SERV',
            tipoFiscalProducto: 'SERVICIO',
            tipoAfectacionIgv: TipoAfectacionIgv.GRAVADO_OPERACION_ONEROSA,
            cantidad: 1,
            valorUnitario: 100,
            precioUnitario: 118,
            descuento: 0,
            baseImponible: 100,
            igv: 18,
            total: 118,
          },
        ],
      }),
    );

    expect(result.xml).toContain(
      '<cbc:InvoicedQuantity unitCode="ZZ">1.0000</cbc:InvoicedQuantity>',
    );
  });

  it('rechaza comprobantes sin detalles fiscales congelados', () => {
    expect(() =>
      builder.buildInvoice(buildComprobante({ detallesFiscales: [] })),
    ).toThrow(BadRequestException);
  });

  it('rechaza tipos que todavía no están soportados por UBL Invoice', () => {
    expect(() =>
      builder.buildInvoice(
        buildComprobante({ tipo: TipoDocumento.NOTA_CREDITO }),
      ),
    ).toThrow(BadRequestException);
  });

  it('genera UBL CreditNote inicial referenciando comprobante origen congelado', () => {
    const result = builder.buildCreditNote(buildNota());

    expect(result.documentCode).toBe('07');
    expect(result.xmlFileName).toBe('20123456789-07-FC01-00000003.xml');
    expect(result.fileName).toBe('20123456789-07-FC01-00000003');
    expect(result.xml).toContain('<CreditNote ');
    expect(result.xml).toContain('<cbc:CustomizationID>2.0</cbc:CustomizationID>');
    expect(result.xml).toContain('<cbc:ID>FC01-00000003</cbc:ID>');
    expect(result.xml).toContain(
      '<cbc:CreditNoteTypeCode>07</cbc:CreditNoteTypeCode>',
    );
    expect(result.xml).toContain(
      '<cbc:ReferenceID>F001-00000007</cbc:ReferenceID>',
    );
    expect(result.xml).toContain('<cbc:ResponseCode>01</cbc:ResponseCode>');
    expect(result.xml).toContain(
      '<cbc:DocumentTypeCode>01</cbc:DocumentTypeCode>',
    );
    expect(result.xml).toContain('<cac:CreditNoteLine>');
    expect(result.xml).toContain(
      '<cbc:CreditedQuantity unitCode="NIU">1.0000</cbc:CreditedQuantity>',
    );
    expect(result.xml).toContain(
      '<cbc:LineExtensionAmount currencyID="PEN">100.00</cbc:LineExtensionAmount>',
    );
    expect(result.xml).toContain(
      '<cbc:TaxAmount currencyID="PEN">18.00</cbc:TaxAmount>',
    );
  });

  it('genera CreditNote desde Comprobante unificado usando motivoNota y total', () => {
    const result = builder.buildCreditNote(
      buildNota({
        tipo: TipoDocumento.NOTA_CREDITO,
        motivoNota: '05',
        motivoNotaDescripcion: 'Descuento posterior por item defectuoso',
        total: 59,
        monto: undefined,
      }),
    );

    expect(result.xml).toContain('<cbc:ResponseCode>05</cbc:ResponseCode>');
    expect(result.xml).toContain('Descuento posterior por item defectuoso');
    expect(result.xml).toContain(
      '<cbc:PayableAmount currencyID="PEN">59.00</cbc:PayableAmount>',
    );
  });

  it('genera líneas de CreditNote desde detalles fiscales de la nota', () => {
    const result = builder.buildCreditNote(
      buildNota({
        tipo: TipoDocumento.NOTA_CREDITO,
        motivoNota: '05',
        motivoNotaDescripcion: 'Descuento posterior por items específicos',
        total: 59,
        detallesFiscales: [
          {
            item: 1,
            codigoInterno: 'SKU-001',
            descripcion: 'Descuento línea 1',
            unidadSunat: 'NIU',
            tipoAfectacionIgv: TipoAfectacionIgv.GRAVADO_OPERACION_ONEROSA,
            cantidad: 1,
            valorUnitario: 25,
            precioUnitario: 29.5,
            descuento: 0,
            baseImponible: 25,
            igv: 4.5,
            total: 29.5,
          },
          {
            item: 2,
            codigoInterno: 'SKU-002',
            descripcion: 'Descuento línea 2',
            unidadSunat: 'NIU',
            tipoAfectacionIgv: TipoAfectacionIgv.GRAVADO_OPERACION_ONEROSA,
            cantidad: 1,
            valorUnitario: 25,
            precioUnitario: 29.5,
            descuento: 0,
            baseImponible: 25,
            igv: 4.5,
            total: 29.5,
          },
        ],
      }),
    );

    expect(result.xml.match(/<cac:CreditNoteLine>/g)).toHaveLength(2);
    expect(result.xml).toContain('<cbc:ID>2</cbc:ID>');
    expect(result.xml).toContain('Descuento línea 2');
  });

  it('genera UBL DebitNote inicial con total solicitado', () => {
    const result = builder.buildDebitNote(
      buildNota({
        motivo: 'Penalidad contractual de ejemplo',
        serie: 'FD01',
        correlativo: 4,
      }),
    );

    expect(result.documentCode).toBe('08');
    expect(result.xmlFileName).toBe('20123456789-08-FD01-00000004.xml');
    expect(result.xml).toContain('<DebitNote ');
    expect(result.xml).toContain('<cbc:ID>FD01-00000004</cbc:ID>');
    expect(result.xml).toContain(
      '<cbc:DebitNoteTypeCode>08</cbc:DebitNoteTypeCode>',
    );
    expect(result.xml).toContain('<cbc:ResponseCode>03</cbc:ResponseCode>');
    expect(result.xml).toContain('<cac:RequestedMonetaryTotal>');
    expect(result.xml).toContain('<cac:DebitNoteLine>');
    expect(result.xml).toContain(
      '<cbc:DebitedQuantity unitCode="NIU">1.0000</cbc:DebitedQuantity>',
    );
  });

  it('rechaza notas sin comprobante origen incluido', () => {
    expect(() =>
      builder.buildCreditNote({
        motivo: 'Sin origen',
        monto: 118,
        serie: 'FC01',
        correlativo: 1,
      }),
    ).toThrow(BadRequestException);
  });

  describe('buildVoidedNote', () => {
    function baseComunicacion(overrides: Record<string, unknown> = {}) {
      return {
        identificadorBaja: 'RA-20260506-001',
        fechaGeneracion: new Date('2026-05-06T12:00:00.000Z'),
        motivo: 'Error en datos del cliente',
        comprobante: buildComprobante(),
        ...overrides,
      };
    }

    it('genera fileName y xmlFileName con el patrón {ruc}-RA-YYYYMMDD-NNN', () => {
      const result = builder.buildVoidedNote(baseComunicacion());
      expect(result.fileName).toBe('20123456789-RA-20260506-001');
      expect(result.xmlFileName).toBe('20123456789-RA-20260506-001.xml');
    });

    it('incluye los namespaces SUNAT y la línea sac:VoidedDocumentsLine con datos del comprobante', () => {
      const result = builder.buildVoidedNote(baseComunicacion());
      expect(result.xml).toContain(
        'xmlns="urn:sunat:names:specification:ubl:peru:schema:xsd:VoidedDocuments-1"',
      );
      expect(result.xml).toContain(
        'xmlns:sac="urn:sunat:names:specification:ubl:peru:schema:xsd:SunatAggregateComponents-1"',
      );
      expect(result.xml).toContain('<cbc:ID>RA-20260506-001</cbc:ID>');
      expect(result.xml).toContain(
        '<cbc:ReferenceDate>2026-05-02</cbc:ReferenceDate>',
      );
      expect(result.xml).toContain('<cbc:IssueDate>2026-05-06</cbc:IssueDate>');
      expect(result.xml).toContain('<sac:VoidedDocumentsLine>');
      expect(result.xml).toContain(
        '<cbc:DocumentTypeCode>01</cbc:DocumentTypeCode>',
      );
      expect(result.xml).toContain(
        '<sac:DocumentSerialID>F001</sac:DocumentSerialID>',
      );
      expect(result.xml).toContain(
        '<sac:DocumentNumberID>7</sac:DocumentNumberID>',
      );
      expect(result.xml).toContain('Error en datos del cliente');
    });

    it('mapea documentCode 03 para boletas', () => {
      const result = builder.buildVoidedNote(
        baseComunicacion({
          comprobante: buildComprobante({
            tipo: TipoDocumento.BOLETA,
            serie: 'B001',
            correlativo: 5,
          }),
        }),
      );
      expect(result.documentCode).toBe('03');
      expect(result.xml).toContain(
        '<cbc:DocumentTypeCode>03</cbc:DocumentTypeCode>',
      );
      expect(result.xml).toContain(
        '<sac:DocumentSerialID>B001</sac:DocumentSerialID>',
      );
      expect(result.xml).toContain(
        '<sac:DocumentNumberID>5</sac:DocumentNumberID>',
      );
    });

    it('rechaza identificador de baja con formato inválido', () => {
      expect(() =>
        builder.buildVoidedNote(
          baseComunicacion({ identificadorBaja: 'RA-2026-001' }),
        ),
      ).toThrow(BadRequestException);
      expect(() =>
        builder.buildVoidedNote(
          baseComunicacion({ identificadorBaja: 'RC-20260506-001' }),
        ),
      ).toThrow(BadRequestException);
    });

    it('rechaza motivo vacío y correlativo cero', () => {
      expect(() =>
        builder.buildVoidedNote(baseComunicacion({ motivo: '' })),
      ).toThrow(BadRequestException);
      expect(() =>
        builder.buildVoidedNote(
          baseComunicacion({
            comprobante: buildComprobante({ correlativo: 0 }),
          }),
        ),
      ).toThrow(BadRequestException);
    });
  });
});
