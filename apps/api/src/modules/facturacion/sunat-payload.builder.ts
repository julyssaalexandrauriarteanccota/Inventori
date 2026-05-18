import { BadRequestException, Injectable } from '@nestjs/common';
import { TipoAfectacionIgv, TipoDocumento } from '@erp/shared';

interface ComprobanteDetalleFiscalLike {
  item: number;
  codigoInterno?: string | null;
  descripcion: string;
  unidadSunat: string;
  tipoAfectacionIgv: string;
  cantidad: unknown;
  valorUnitario: unknown;
  precioUnitario: unknown;
  descuento?: unknown;
  baseImponible: unknown;
  igv: unknown;
  total: unknown;
}

export interface SunatUblBuildResult {
  fileName: string;
  xmlFileName: string;
  documentCode: string;
  xml: string;
}

@Injectable()
export class SunatPayloadBuilder {
  buildInvoice(comprobante: Record<string, unknown>): SunatUblBuildResult {
    const tipo = comprobante.tipo as TipoDocumento;
    if (![TipoDocumento.FACTURA, TipoDocumento.BOLETA].includes(tipo)) {
      throw new BadRequestException(
        `Tipo de comprobante no soportado para UBL Invoice: ${tipo}`,
      );
    }

    const ruc = this.required(comprobante.emisorRuc, 'RUC emisor');
    const serie = this.required(comprobante.serie, 'serie');
    const correlativo = Number(comprobante.correlativo ?? 0);
    const documentCode = tipo === TipoDocumento.FACTURA ? '01' : '03';
    const correlativoPadded = String(correlativo).padStart(8, '0');
    const xmlFileName = `${ruc}-${documentCode}-${serie}-${correlativoPadded}.xml`;
    const fileName = xmlFileName.replace(/\.xml$/, '');
    const detalles = this.getDetalles(comprobante);
    const fechaEmision = this.formatDate(comprobante.fechaEmision);
    const horaEmision = this.formatTime(comprobante.fechaEmision);

    const linesXml = detalles
      .map((detalle) => this.buildInvoiceLine(detalle))
      .join('');

    const xml = `<?xml version="1.0" encoding="ISO-8859-1" standalone="no"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2" xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2" xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2" xmlns:ds="http://www.w3.org/2000/09/xmldsig#" xmlns:ext="urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2">
  <ext:UBLExtensions>
    <ext:UBLExtension>
      <ext:ExtensionContent></ext:ExtensionContent>
    </ext:UBLExtension>
  </ext:UBLExtensions>
  <cbc:UBLVersionID>2.1</cbc:UBLVersionID>
  <cbc:CustomizationID>2.0</cbc:CustomizationID>
  <cbc:ID>${this.escape(`${serie}-${correlativoPadded}`)}</cbc:ID>
  <cbc:IssueDate>${fechaEmision}</cbc:IssueDate>
  <cbc:IssueTime>${horaEmision}</cbc:IssueTime>
  <cbc:InvoiceTypeCode listID="0101">${documentCode}</cbc:InvoiceTypeCode>
  <cbc:DocumentCurrencyCode>PEN</cbc:DocumentCurrencyCode>
  <cac:Signature>
    <cbc:ID>${this.escape(`${ruc}-${serie}-${correlativo}`)}</cbc:ID>
    <cac:SignatoryParty>
      <cac:PartyIdentification>
        <cbc:ID>${this.escape(ruc)}</cbc:ID>
      </cac:PartyIdentification>
      <cac:PartyName>
        <cbc:Name><![CDATA[${this.cdata(this.required(comprobante.emisorRazonSocial, 'razón social emisor'))}]]></cbc:Name>
      </cac:PartyName>
    </cac:SignatoryParty>
    <cac:DigitalSignatureAttachment>
      <cac:ExternalReference>
        <cbc:URI>#SignatureSP</cbc:URI>
      </cac:ExternalReference>
    </cac:DigitalSignatureAttachment>
  </cac:Signature>
  ${this.buildSupplierParty(comprobante)}
  ${this.buildCustomerParty(comprobante)}
  ${this.buildPaymentTerms(comprobante)}
  ${this.buildTaxTotal(comprobante)}
  <cac:LegalMonetaryTotal>
    <cbc:LineExtensionAmount currencyID="PEN">${this.money(comprobante.subtotal)}</cbc:LineExtensionAmount>
    <cbc:TaxInclusiveAmount currencyID="PEN">${this.money(comprobante.total)}</cbc:TaxInclusiveAmount>
    <cbc:PayableAmount currencyID="PEN">${this.money(comprobante.total)}</cbc:PayableAmount>
  </cac:LegalMonetaryTotal>
  ${linesXml}
</Invoice>`;

    return { fileName, xmlFileName, documentCode, xml };
  }

  buildCreditNote(nota: Record<string, unknown>): SunatUblBuildResult {
    return this.buildAdjustmentNote(nota, {
      rootName: 'CreditNote',
      documentCode: '07',
      typeCodeTag: 'CreditNoteTypeCode',
      lineTag: 'CreditNoteLine',
      quantityTag: 'CreditedQuantity',
      monetaryTotalTag: 'LegalMonetaryTotal',
      reasonCode: this.mapCreditNoteReasonCode(nota.motivoNota ?? nota.tipo),
    });
  }

  buildDebitNote(nota: Record<string, unknown>): SunatUblBuildResult {
    return this.buildAdjustmentNote(nota, {
      rootName: 'DebitNote',
      documentCode: '08',
      typeCodeTag: 'DebitNoteTypeCode',
      lineTag: 'DebitNoteLine',
      quantityTag: 'DebitedQuantity',
      monetaryTotalTag: 'RequestedMonetaryTotal',
      reasonCode: this.mapDebitNoteReasonCode(nota.motivoNota ?? nota.motivo),
    });
  }

  /**
   * Doc 04 §6 — Resumen diario de Comunicación de Baja (VoidedDocuments).
   * Genera un RA que da de baja un único comprobante. La estructura sigue
   * UBL VoidedDocuments-1 / SAC-1 (extensiones SUNAT).
   *
   * Identificación: `RA-YYYYMMDD-NNN`. fileName SUNAT: `{ruc}-RA-YYYYMMDD-NNN`.
   * IssueDate = fecha de generación de la baja (hoy).
   * ReferenceDate = fecha de emisión del comprobante a anular.
   */
  buildVoidedNote(comunicacion: {
    identificadorBaja: string;
    fechaGeneracion: Date | string;
    motivo: string;
    comprobante: Record<string, unknown>;
  }): SunatUblBuildResult {
    const comprobante = comunicacion.comprobante;
    const ruc = this.required(comprobante.emisorRuc, 'RUC emisor');
    const identificador = this.required(
      comunicacion.identificadorBaja,
      'identificador de baja',
    );
    if (!/^RA-\d{8}-\d{1,5}$/.test(identificador)) {
      throw new BadRequestException(
        `Identificador de baja inválido: ${identificador}. Formato esperado RA-YYYYMMDD-NNN.`,
      );
    }
    const motivo = this.required(comunicacion.motivo, 'motivo de baja');

    const tipo = comprobante.tipo as TipoDocumento;
    const documentCode = this.documentCodeForTipo(tipo);
    const serie = this.required(comprobante.serie, 'serie comprobante');
    const correlativo = Number(comprobante.correlativo ?? 0);
    if (!correlativo) {
      throw new BadRequestException('Correlativo del comprobante inválido');
    }

    const issueDate = this.formatDate(comunicacion.fechaGeneracion);
    const referenceDate = this.formatDate(comprobante.fechaEmision);
    const xmlFileName = `${ruc}-${identificador}.xml`;
    const fileName = xmlFileName.replace(/\.xml$/, '');

    const xml = `<?xml version="1.0" encoding="ISO-8859-1" standalone="no"?>
<VoidedDocuments xmlns="urn:sunat:names:specification:ubl:peru:schema:xsd:VoidedDocuments-1" xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2" xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2" xmlns:ds="http://www.w3.org/2000/09/xmldsig#" xmlns:ext="urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2" xmlns:sac="urn:sunat:names:specification:ubl:peru:schema:xsd:SunatAggregateComponents-1">
  <ext:UBLExtensions>
    <ext:UBLExtension>
      <ext:ExtensionContent></ext:ExtensionContent>
    </ext:UBLExtension>
  </ext:UBLExtensions>
  <cbc:UBLVersionID>2.0</cbc:UBLVersionID>
  <cbc:CustomizationID>1.0</cbc:CustomizationID>
  <cbc:ID>${this.escape(identificador)}</cbc:ID>
  <cbc:ReferenceDate>${referenceDate}</cbc:ReferenceDate>
  <cbc:IssueDate>${issueDate}</cbc:IssueDate>
  <cac:Signature>
    <cbc:ID>${this.escape(`${ruc}-${identificador}`)}</cbc:ID>
    <cac:SignatoryParty>
      <cac:PartyIdentification>
        <cbc:ID>${this.escape(ruc)}</cbc:ID>
      </cac:PartyIdentification>
      <cac:PartyName>
        <cbc:Name><![CDATA[${this.cdata(this.required(comprobante.emisorRazonSocial, 'razón social emisor'))}]]></cbc:Name>
      </cac:PartyName>
    </cac:SignatoryParty>
    <cac:DigitalSignatureAttachment>
      <cac:ExternalReference>
        <cbc:URI>#SignatureSP</cbc:URI>
      </cac:ExternalReference>
    </cac:DigitalSignatureAttachment>
  </cac:Signature>
  <cac:AccountingSupplierParty>
    <cbc:CustomerAssignedAccountID>${this.escape(ruc)}</cbc:CustomerAssignedAccountID>
    <cbc:AdditionalAccountID>6</cbc:AdditionalAccountID>
    <cac:Party>
      <cac:PartyLegalEntity>
        <cbc:RegistrationName><![CDATA[${this.cdata(this.required(comprobante.emisorRazonSocial, 'razón social emisor'))}]]></cbc:RegistrationName>
      </cac:PartyLegalEntity>
    </cac:Party>
  </cac:AccountingSupplierParty>
  <sac:VoidedDocumentsLine>
    <cbc:LineID>1</cbc:LineID>
    <cbc:DocumentTypeCode>${documentCode}</cbc:DocumentTypeCode>
    <sac:DocumentSerialID>${this.escape(serie)}</sac:DocumentSerialID>
    <sac:DocumentNumberID>${correlativo}</sac:DocumentNumberID>
    <sac:VoidReasonDescription><![CDATA[${this.cdata(motivo)}]]></sac:VoidReasonDescription>
  </sac:VoidedDocumentsLine>
</VoidedDocuments>`;

    return { fileName, xmlFileName, documentCode, xml };
  }

  mapAfectacionIgv(value: string) {
    const map: Record<
      string,
      {
        code: string;
        taxExemptionReasonCode: string;
        taxSchemeId: string;
        taxSchemeName: string;
        taxTypeCode: string;
      }
    > = {
      [TipoAfectacionIgv.GRAVADO_OPERACION_ONEROSA]: {
        code: '10',
        taxExemptionReasonCode: '10',
        taxSchemeId: '1000',
        taxSchemeName: 'IGV',
        taxTypeCode: 'VAT',
      },
      [TipoAfectacionIgv.EXONERADO_OPERACION_ONEROSA]: {
        code: '20',
        taxExemptionReasonCode: '20',
        taxSchemeId: '9997',
        taxSchemeName: 'EXO',
        taxTypeCode: 'VAT',
      },
      [TipoAfectacionIgv.INAFECTO_OPERACION_ONEROSA]: {
        code: '30',
        taxExemptionReasonCode: '30',
        taxSchemeId: '9998',
        taxSchemeName: 'INA',
        taxTypeCode: 'FRE',
      },
      [TipoAfectacionIgv.EXPORTACION]: {
        code: '40',
        taxExemptionReasonCode: '40',
        taxSchemeId: '9995',
        taxSchemeName: 'EXP',
        taxTypeCode: 'FRE',
      },
    };

    return map[value] ?? map[TipoAfectacionIgv.GRAVADO_OPERACION_ONEROSA];
  }

  private buildSupplierParty(comprobante: Record<string, unknown>) {
    const ruc = this.required(comprobante.emisorRuc, 'RUC emisor');
    return `<cac:AccountingSupplierParty>
    <cac:Party>
      <cac:PartyIdentification>
        <cbc:ID schemeID="6">${this.escape(ruc)}</cbc:ID>
      </cac:PartyIdentification>
      <cac:PartyName>
        <cbc:Name><![CDATA[${this.cdata(this.text(comprobante.emisorNombreComercial ?? comprobante.emisorRazonSocial))}]]></cbc:Name>
      </cac:PartyName>
      <cac:PartyLegalEntity>
        <cbc:RegistrationName><![CDATA[${this.cdata(this.required(comprobante.emisorRazonSocial, 'razón social emisor'))}]]></cbc:RegistrationName>
        <cac:RegistrationAddress>
          <cbc:ID>${this.escape(this.text(comprobante.emisorUbigeoFiscal, '000000'))}</cbc:ID>
          <cbc:AddressTypeCode>${this.escape(this.text(comprobante.emisorCodigoEstablecimiento, '0000'))}</cbc:AddressTypeCode>
          <cac:AddressLine>
            <cbc:Line><![CDATA[${this.cdata(this.text(comprobante.emisorDireccionFiscal))}]]></cbc:Line>
          </cac:AddressLine>
          <cac:Country><cbc:IdentificationCode>PE</cbc:IdentificationCode></cac:Country>
        </cac:RegistrationAddress>
      </cac:PartyLegalEntity>
    </cac:Party>
  </cac:AccountingSupplierParty>`;
  }

  private buildCustomerParty(comprobante: Record<string, unknown>) {
    return `<cac:AccountingCustomerParty>
    <cac:Party>
      <cac:PartyIdentification>
        <cbc:ID schemeID="${this.escape(this.text(comprobante.clienteDocTipo, '0'))}">${this.escape(this.text(comprobante.clienteDocNum, '-'))}</cbc:ID>
      </cac:PartyIdentification>
      <cac:PartyLegalEntity>
        <cbc:RegistrationName><![CDATA[${this.cdata(this.text(comprobante.clienteNombre, 'CLIENTE'))}]]></cbc:RegistrationName>
        <cac:RegistrationAddress>
          <cac:AddressLine><cbc:Line><![CDATA[${this.cdata(this.text(comprobante.clienteDireccion))}]]></cbc:Line></cac:AddressLine>
          <cac:Country><cbc:IdentificationCode>PE</cbc:IdentificationCode></cac:Country>
        </cac:RegistrationAddress>
      </cac:PartyLegalEntity>
    </cac:Party>
  </cac:AccountingCustomerParty>`;
  }

  private buildTaxTotal(comprobante: Record<string, unknown>) {
    return `<cac:TaxTotal>
    <cbc:TaxAmount currencyID="PEN">${this.money(comprobante.igv)}</cbc:TaxAmount>
    <cac:TaxSubtotal>
      <cbc:TaxableAmount currencyID="PEN">${this.money(comprobante.subtotal)}</cbc:TaxableAmount>
      <cbc:TaxAmount currencyID="PEN">${this.money(comprobante.igv)}</cbc:TaxAmount>
      <cac:TaxCategory>
        <cac:TaxScheme>
          <cbc:ID>1000</cbc:ID>
          <cbc:Name>IGV</cbc:Name>
          <cbc:TaxTypeCode>VAT</cbc:TaxTypeCode>
        </cac:TaxScheme>
      </cac:TaxCategory>
    </cac:TaxSubtotal>
  </cac:TaxTotal>`;
  }

  /**
   * Doc 03 §5.7 — Forma de pago obligatoria desde 2023.
   * V1 emite todos los CPE como "Contado". El soporte de "Credito" con
   * cuotas se añadirá cuando el módulo de cuentas por cobrar lo requiera.
   */
  private buildPaymentTerms(comprobante: Record<string, unknown>) {
    const formaPago = (comprobante.formaPago ?? null) as {
      tipo?: string;
    } | null;
    const tipo = formaPago?.tipo === 'Credito' ? 'Credito' : 'Contado';
    return `<cac:PaymentTerms>
    <cbc:ID>FormaPago</cbc:ID>
    <cbc:PaymentMeansID>${this.escape(tipo)}</cbc:PaymentMeansID>
  </cac:PaymentTerms>`;
  }

  private buildAdjustmentNote(
    nota: Record<string, unknown>,
    config: {
      rootName: 'CreditNote' | 'DebitNote';
      documentCode: '07' | '08';
      typeCodeTag: 'CreditNoteTypeCode' | 'DebitNoteTypeCode';
      lineTag: 'CreditNoteLine' | 'DebitNoteLine';
      quantityTag: 'CreditedQuantity' | 'DebitedQuantity';
      monetaryTotalTag: 'LegalMonetaryTotal' | 'RequestedMonetaryTotal';
      reasonCode: string;
    },
  ): SunatUblBuildResult {
    const comprobanteOrigen = this.getComprobanteOrigen(nota);
    const ruc = this.required(comprobanteOrigen.emisorRuc, 'RUC emisor');
    const serie = this.required(nota.serie, 'serie');
    const correlativo = Number(nota.correlativo ?? 0);
    const correlativoPadded = String(correlativo).padStart(8, '0');
    const xmlFileName = `${ruc}-${config.documentCode}-${serie}-${correlativoPadded}.xml`;
    const fileName = xmlFileName.replace(/\.xml$/, '');
    const fechaEmision = this.formatDate(nota.createdAt ?? new Date());
    const horaEmision = this.formatTime(nota.createdAt ?? new Date());
    const amounts = this.buildNoteAmounts(nota, comprobanteOrigen);
    const originDocumentCode = this.documentCodeForTipo(
      comprobanteOrigen.tipo as TipoDocumento,
    );
    const originNumber = this.required(
      comprobanteOrigen.numero,
      'número de comprobante origen',
    );
    const reason = this.required(
      nota.motivoNotaDescripcion ?? nota.motivo,
      'motivo de la nota',
    );
    const namespace = `urn:oasis:names:specification:ubl:schema:xsd:${config.rootName}-2`;

    const xml = `<?xml version="1.0" encoding="ISO-8859-1" standalone="no"?>
<${config.rootName} xmlns="${namespace}" xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2" xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2" xmlns:ds="http://www.w3.org/2000/09/xmldsig#" xmlns:ext="urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2">
  <ext:UBLExtensions>
    <ext:UBLExtension>
      <ext:ExtensionContent></ext:ExtensionContent>
    </ext:UBLExtension>
  </ext:UBLExtensions>
  <cbc:UBLVersionID>2.1</cbc:UBLVersionID>
  <cbc:CustomizationID>2.0</cbc:CustomizationID>
  <cbc:ID>${this.escape(`${serie}-${correlativoPadded}`)}</cbc:ID>
  <cbc:IssueDate>${fechaEmision}</cbc:IssueDate>
  <cbc:IssueTime>${horaEmision}</cbc:IssueTime>
  <cbc:${config.typeCodeTag}>${config.documentCode}</cbc:${config.typeCodeTag}>
  <cbc:DocumentCurrencyCode>PEN</cbc:DocumentCurrencyCode>
  <cac:DiscrepancyResponse>
    <cbc:ReferenceID>${this.escape(originNumber)}</cbc:ReferenceID>
    <cbc:ResponseCode>${this.escape(config.reasonCode)}</cbc:ResponseCode>
    <cbc:Description><![CDATA[${this.cdata(reason)}]]></cbc:Description>
  </cac:DiscrepancyResponse>
  <cac:BillingReference>
    <cac:InvoiceDocumentReference>
      <cbc:ID>${this.escape(originNumber)}</cbc:ID>
      <cbc:DocumentTypeCode>${originDocumentCode}</cbc:DocumentTypeCode>
    </cac:InvoiceDocumentReference>
  </cac:BillingReference>
  ${this.buildSignatureParty(comprobanteOrigen, serie, correlativo)}
  ${this.buildSupplierParty(comprobanteOrigen)}
  ${this.buildCustomerParty(comprobanteOrigen)}
  ${this.buildAdjustmentTaxTotal(amounts)}
  <cac:${config.monetaryTotalTag}>
    <cbc:LineExtensionAmount currencyID="PEN">${this.money(amounts.subtotal)}</cbc:LineExtensionAmount>
    <cbc:TaxInclusiveAmount currencyID="PEN">${this.money(amounts.total)}</cbc:TaxInclusiveAmount>
    <cbc:PayableAmount currencyID="PEN">${this.money(amounts.total)}</cbc:PayableAmount>
  </cac:${config.monetaryTotalTag}>
  ${this.buildAdjustmentLines(config, nota, amounts, reason, comprobanteOrigen)}
</${config.rootName}>`;

    return { fileName, xmlFileName, documentCode: config.documentCode, xml };
  }

  private buildSignatureParty(
    comprobante: Record<string, unknown>,
    serie: string,
    correlativo: number,
  ) {
    const ruc = this.required(comprobante.emisorRuc, 'RUC emisor');
    return `<cac:Signature>
    <cbc:ID>${this.escape(`${ruc}-${serie}-${correlativo}`)}</cbc:ID>
    <cac:SignatoryParty>
      <cac:PartyIdentification>
        <cbc:ID>${this.escape(ruc)}</cbc:ID>
      </cac:PartyIdentification>
      <cac:PartyName>
        <cbc:Name><![CDATA[${this.cdata(this.required(comprobante.emisorRazonSocial, 'razón social emisor'))}]]></cbc:Name>
      </cac:PartyName>
    </cac:SignatoryParty>
    <cac:DigitalSignatureAttachment>
      <cac:ExternalReference>
        <cbc:URI>#SignatureSP</cbc:URI>
      </cac:ExternalReference>
    </cac:DigitalSignatureAttachment>
  </cac:Signature>`;
  }

  private buildAdjustmentTaxTotal(amounts: {
    subtotal: number;
    igv: number;
    total: number;
  }) {
    return `<cac:TaxTotal>
    <cbc:TaxAmount currencyID="PEN">${this.money(amounts.igv)}</cbc:TaxAmount>
    <cac:TaxSubtotal>
      <cbc:TaxableAmount currencyID="PEN">${this.money(amounts.subtotal)}</cbc:TaxableAmount>
      <cbc:TaxAmount currencyID="PEN">${this.money(amounts.igv)}</cbc:TaxAmount>
      <cac:TaxCategory>
        <cac:TaxScheme>
          <cbc:ID>1000</cbc:ID>
          <cbc:Name>IGV</cbc:Name>
          <cbc:TaxTypeCode>VAT</cbc:TaxTypeCode>
        </cac:TaxScheme>
      </cac:TaxCategory>
    </cac:TaxSubtotal>
  </cac:TaxTotal>`;
  }

  private buildAdjustmentLines(
    config: {
      lineTag: 'CreditNoteLine' | 'DebitNoteLine';
      quantityTag: 'CreditedQuantity' | 'DebitedQuantity';
    },
    nota: Record<string, unknown>,
    amounts: { subtotal: number; igv: number; total: number },
    reason: string,
    comprobanteOrigen: Record<string, unknown>,
  ) {
    const detallesNota = nota.detallesFiscales as
      | ComprobanteDetalleFiscalLike[]
      | undefined;
    if (detallesNota && detallesNota.length > 0) {
      return detallesNota
        .map((detalle, index) =>
          this.buildAdjustmentLineFromDetalle(
            config,
            detalle,
            index + 1,
            detalle.descripcion || reason,
          ),
        )
        .join('');
    }

    const firstDetalle = this.getDetalles(comprobanteOrigen)[0];
    const fallbackDetalle: ComprobanteDetalleFiscalLike = {
      ...firstDetalle,
      item: 1,
      descripcion: reason,
      cantidad: 1,
      valorUnitario: amounts.subtotal,
      precioUnitario: amounts.total,
      baseImponible: amounts.subtotal,
      igv: amounts.igv,
      total: amounts.total,
    };
    return this.buildAdjustmentLineFromDetalle(
      config,
      fallbackDetalle,
      1,
      reason,
    );
  }

  private buildAdjustmentLineFromDetalle(
    config: {
      lineTag: 'CreditNoteLine' | 'DebitNoteLine';
      quantityTag: 'CreditedQuantity' | 'DebitedQuantity';
    },
    detalle: ComprobanteDetalleFiscalLike,
    lineNumber: number,
    reason: string,
  ) {
    const afectacion = this.mapAfectacionIgv(detalle.tipoAfectacionIgv);
    return `<cac:${config.lineTag}>
    <cbc:ID>${lineNumber}</cbc:ID>
    <cbc:${config.quantityTag} unitCode="${this.escape(detalle.unidadSunat || 'NIU')}">${this.quantity(detalle.cantidad)}</cbc:${config.quantityTag}>
    <cbc:LineExtensionAmount currencyID="PEN">${this.money(detalle.baseImponible)}</cbc:LineExtensionAmount>
    <cac:PricingReference>
      <cac:AlternativeConditionPrice>
        <cbc:PriceAmount currencyID="PEN">${this.money(detalle.precioUnitario)}</cbc:PriceAmount>
        <cbc:PriceTypeCode>01</cbc:PriceTypeCode>
      </cac:AlternativeConditionPrice>
    </cac:PricingReference>
    <cac:TaxTotal>
      <cbc:TaxAmount currencyID="PEN">${this.money(detalle.igv)}</cbc:TaxAmount>
      <cac:TaxSubtotal>
        <cbc:TaxableAmount currencyID="PEN">${this.money(detalle.baseImponible)}</cbc:TaxableAmount>
        <cbc:TaxAmount currencyID="PEN">${this.money(detalle.igv)}</cbc:TaxAmount>
        <cac:TaxCategory>
          <cbc:Percent>${Number(detalle.igv) > 0 ? '18.00' : '0.00'}</cbc:Percent>
          <cbc:TaxExemptionReasonCode>${afectacion.taxExemptionReasonCode}</cbc:TaxExemptionReasonCode>
          <cac:TaxScheme>
            <cbc:ID>${afectacion.taxSchemeId}</cbc:ID>
            <cbc:Name>${afectacion.taxSchemeName}</cbc:Name>
            <cbc:TaxTypeCode>${afectacion.taxTypeCode}</cbc:TaxTypeCode>
          </cac:TaxScheme>
        </cac:TaxCategory>
      </cac:TaxSubtotal>
    </cac:TaxTotal>
    <cac:Item>
      <cbc:Description><![CDATA[${this.cdata(reason)}]]></cbc:Description>
      <cac:SellersItemIdentification><cbc:ID>${this.escape(detalle.codigoInterno ?? 'AJUSTE')}</cbc:ID></cac:SellersItemIdentification>
    </cac:Item>
    <cac:Price>
      <cbc:PriceAmount currencyID="PEN">${this.money(detalle.valorUnitario)}</cbc:PriceAmount>
    </cac:Price>
  </cac:${config.lineTag}>`;
  }

  private buildInvoiceLine(detalle: ComprobanteDetalleFiscalLike) {
    const afectacion = this.mapAfectacionIgv(detalle.tipoAfectacionIgv);
    return `<cac:InvoiceLine>
    <cbc:ID>${detalle.item}</cbc:ID>
    <cbc:InvoicedQuantity unitCode="${this.escape(detalle.unidadSunat || 'NIU')}">${this.quantity(detalle.cantidad)}</cbc:InvoicedQuantity>
    <cbc:LineExtensionAmount currencyID="PEN">${this.money(detalle.baseImponible)}</cbc:LineExtensionAmount>
    <cac:PricingReference>
      <cac:AlternativeConditionPrice>
        <cbc:PriceAmount currencyID="PEN">${this.money(detalle.precioUnitario)}</cbc:PriceAmount>
        <cbc:PriceTypeCode>01</cbc:PriceTypeCode>
      </cac:AlternativeConditionPrice>
    </cac:PricingReference>
    <cac:TaxTotal>
      <cbc:TaxAmount currencyID="PEN">${this.money(detalle.igv)}</cbc:TaxAmount>
      <cac:TaxSubtotal>
        <cbc:TaxableAmount currencyID="PEN">${this.money(detalle.baseImponible)}</cbc:TaxableAmount>
        <cbc:TaxAmount currencyID="PEN">${this.money(detalle.igv)}</cbc:TaxAmount>
        <cac:TaxCategory>
          <cbc:Percent>${Number(detalle.igv) > 0 ? '18.00' : '0.00'}</cbc:Percent>
          <cbc:TaxExemptionReasonCode>${afectacion.taxExemptionReasonCode}</cbc:TaxExemptionReasonCode>
          <cac:TaxScheme>
            <cbc:ID>${afectacion.taxSchemeId}</cbc:ID>
            <cbc:Name>${afectacion.taxSchemeName}</cbc:Name>
            <cbc:TaxTypeCode>${afectacion.taxTypeCode}</cbc:TaxTypeCode>
          </cac:TaxScheme>
        </cac:TaxCategory>
      </cac:TaxSubtotal>
    </cac:TaxTotal>
    <cac:Item>
      <cbc:Description><![CDATA[${this.cdata(detalle.descripcion)}]]></cbc:Description>
      <cac:SellersItemIdentification><cbc:ID>${this.escape(detalle.codigoInterno ?? '')}</cbc:ID></cac:SellersItemIdentification>
    </cac:Item>
    <cac:Price>
      <cbc:PriceAmount currencyID="PEN">${this.money(detalle.valorUnitario)}</cbc:PriceAmount>
    </cac:Price>
  </cac:InvoiceLine>`;
  }

  private getComprobanteOrigen(nota: Record<string, unknown>) {
    const comprobanteOrigen = nota.comprobanteOrigen as
      | Record<string, unknown>
      | undefined;
    if (!comprobanteOrigen) {
      throw new BadRequestException(
        'La nota no tiene comprobante origen incluido',
      );
    }
    return comprobanteOrigen;
  }

  private buildNoteAmounts(
    nota: Record<string, unknown>,
    comprobanteOrigen: Record<string, unknown>,
  ) {
    const total = Number(nota.monto ?? nota.total ?? 0);
    if (total <= 0) {
      throw new BadRequestException(
        'El monto de la nota debe ser mayor a cero',
      );
    }

    const originalTotal = Number(comprobanteOrigen.total ?? 0);
    const originalIgv = Number(comprobanteOrigen.igv ?? 0);
    const igv =
      originalTotal > 0
        ? +(total * (originalIgv / originalTotal)).toFixed(2)
        : 0;
    const subtotal = +(total - igv).toFixed(2);

    return { subtotal, igv, total };
  }

  private documentCodeForTipo(tipo: TipoDocumento) {
    const map: Record<TipoDocumento, string> = {
      [TipoDocumento.FACTURA]: '01',
      [TipoDocumento.BOLETA]: '03',
      [TipoDocumento.NOTA_CREDITO]: '07',
      [TipoDocumento.NOTA_DEBITO]: '08',
    };
    return map[tipo] ?? '01';
  }

  private mapCreditNoteReasonCode(value: unknown) {
    const text = this.text(value).toUpperCase();
    if (/^\d{2}$/.test(text)) return text;
    if (text.includes('DESCUENTO')) return '04';
    if (text.includes('DEVOLUCION')) return '06';
    if (text.includes('ANULACION')) return '01';
    return '01';
  }

  private mapDebitNoteReasonCode(value: unknown) {
    const text = this.text(value).toUpperCase();
    if (/^\d{2}$/.test(text)) return text;
    if (text.includes('AUMENTO')) return '02';
    if (text.includes('PENAL')) return '03';
    return '01';
  }

  private getDetalles(comprobante: Record<string, unknown>) {
    const detalles = comprobante.detallesFiscales as
      | ComprobanteDetalleFiscalLike[]
      | undefined;
    if (!detalles || detalles.length === 0) {
      throw new BadRequestException(
        'El comprobante no tiene detalles fiscales congelados',
      );
    }
    return detalles;
  }

  private required(value: unknown, label: string) {
    const text = this.text(value).trim();
    if (!text) throw new BadRequestException(`Falta ${label}`);
    return text;
  }

  private formatDate(value: unknown) {
    const date = value ? new Date(value as string | Date) : new Date();
    return date.toISOString().slice(0, 10);
  }

  private formatTime(value: unknown) {
    const date = value ? new Date(value as string | Date) : new Date();
    return date.toISOString().slice(11, 19);
  }

  private money(value: unknown) {
    return Number(value ?? 0).toFixed(2);
  }

  private quantity(value: unknown) {
    return Number(value ?? 0).toFixed(4);
  }

  private escape(value: unknown) {
    return this.text(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  private cdata(value: unknown) {
    return this.text(value).replace(/]]>/g, ']]]]><![CDATA[>');
  }

  private text(value: unknown, fallback = ''): string {
    if (typeof value === 'string') {
      return value;
    }

    if (
      typeof value === 'number' ||
      typeof value === 'boolean' ||
      typeof value === 'bigint'
    ) {
      return String(value);
    }

    if (value instanceof Date) {
      return value.toISOString();
    }

    return fallback;
  }
}
