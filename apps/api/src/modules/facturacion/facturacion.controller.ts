import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  ParseUUIDPipe,
  UploadedFile,
  UseInterceptors,
  Res,
  StreamableFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { Readable } from 'stream';
import { ApiTags, ApiOperation, ApiConsumes } from '@nestjs/swagger';
import { EstadoVenta, RolUsuario, TipoDocumento } from '@erp/shared';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { ClienteValidacionSunatService } from './cliente-validacion-sunat.service';
import { CertificadoDigitalService } from './certificado-digital.service';
import { ConfiguracionFiscalService } from './configuracion-fiscal.service';
import { SunatCredentialsService } from './sunat-credentials.service';
import { ComprobanteEnvioLogService } from './comprobante-envio-log.service';
import { EmpresaSedeFiscalService } from './empresa-sede-fiscal.service';
import { FacturacionService } from './facturacion.service';
import { FeriadosNacionalesService } from './feriados-nacionales.service';
import { PadronSunatRucService } from './padron-sunat-ruc.service';
import { SeriesDocumentoAdminService } from './series-documento-admin.service';
import {
  EmitirComprobanteDto,
  CreateNotaCreditoDto,
  CreateNotaDebitoDto,
  QueryComprobanteDto,
  QueryComprobanteEnvioLogDto,
  CreateClienteValidacionSunatDto,
  UpdateClienteValidacionSunatDto,
  QueryClienteValidacionSunatDto,
  CreateSerieDocumentoDto,
  UpdateSerieDocumentoDto,
  QuerySerieDocumentoDto,
  CreateEmpresaSedeFiscalDto,
  UpdateEmpresaSedeFiscalDto,
  QueryEmpresaSedeFiscalDto,
  UploadCertificadoDigitalDto,
  QueryCertificadoDigitalDto,
  UpdateSunatCredentialsDto,
  UpdateConfigEmpresaDto,
  UpdateConfigEmpresaFiscalDto,
  AnularComprobanteDto,
  QueryElegibilidadComprobanteDto,
  QueryComunicacionBajaDto,
  CreateFeriadoNacionalDto,
  QueryFeriadoNacionalDto,
  UpdateFeriadoNacionalDto,
} from './dto';

@ApiTags('Facturación')
@Controller('facturacion')
export class FacturacionController {
  constructor(
    private readonly facturacionService: FacturacionService,
    private readonly configuracionFiscalService: ConfiguracionFiscalService,
    private readonly seriesDocumentoAdminService: SeriesDocumentoAdminService,
    private readonly empresaSedeFiscalService: EmpresaSedeFiscalService,
    private readonly certificadoDigitalService: CertificadoDigitalService,
    private readonly sunatCredentialsService: SunatCredentialsService,
    private readonly clienteValidacionSunatService: ClienteValidacionSunatService,
    private readonly comprobanteEnvioLogService: ComprobanteEnvioLogService,
    private readonly feriadosNacionalesService: FeriadosNacionalesService,
    private readonly padronSunatRucService: PadronSunatRucService,
  ) {}

  // ── Comprobantes ────────────────────────────────────────────────────

  @Post('emitir')
  @Roles(RolUsuario.ADMIN, RolUsuario.ENCARGADO)
  @ApiOperation({
    summary: 'Emitir comprobante (factura/boleta) para una venta',
  })
  emitir(
    @Body() dto: EmitirComprobanteDto,
    @CurrentUser('sub') userId?: string,
  ) {
    return this.facturacionService.emitirComprobante(dto, userId);
  }

  @Get('validar-pre-emision/:ventaId')
  @Roles(RolUsuario.ADMIN, RolUsuario.ENCARGADO)
  @ApiOperation({
    summary:
      'Doc 10 §7 — preview de validación pre-emisión. Devuelve bloqueantes y advertencias.',
  })
  validarPreEmision(
    @Param('ventaId', ParseUUIDPipe) ventaId: string,
    @Query('tipo') tipoQuery?: string,
  ) {
    const tipo =
      tipoQuery === TipoDocumento.BOLETA
        ? TipoDocumento.BOLETA
        : TipoDocumento.FACTURA;
    return this.facturacionService.validarPreEmision(ventaId, tipo);
  }

  @Post('emitir/:ventaId')
  @Roles(RolUsuario.ADMIN, RolUsuario.ENCARGADO)
  @ApiOperation({
    summary: 'Emitir comprobante para una venta usando ventaId en la ruta',
  })
  emitirPorVenta(
    @Param('ventaId', ParseUUIDPipe) ventaId: string,
    @Body() dto: Omit<EmitirComprobanteDto, 'ventaId'>,
    @CurrentUser('sub') userId?: string,
  ) {
    return this.facturacionService.emitirComprobante(
      {
        ventaId,
        tipo: dto.tipo,
        serieDocumentoId: dto.serieDocumentoId,
        observaciones: dto.observaciones,
      },
      userId,
    );
  }

  @Get('comprobantes')
  @Roles(RolUsuario.ADMIN, RolUsuario.ENCARGADO)
  @ApiOperation({ summary: 'Listar comprobantes paginados' })
  findAll(@Query() query: QueryComprobanteDto) {
    return this.facturacionService.findAll(query);
  }

  /**
   * Doc 05 §1 — Portal cliente: consulta pública por RUC emisor + tipo + serie
   * + correlativo. Devuelve sólo metadatos no-sensibles para que el receptor
   * verifique que el comprobante existe y fue aceptado por SUNAT.
   */
  @Public()
  @Get('public/comprobantes/lookup')
  @ApiOperation({
    summary: 'Consulta pública de comprobante por receptor (portal cliente)',
  })
  lookupPublico(
    @Query('rucEmisor') rucEmisor: string,
    @Query('tipo') tipo: string,
    @Query('serie') serie: string,
    @Query('correlativo') correlativo: string,
  ) {
    return this.facturacionService.lookupPublicoComprobante({
      rucEmisor,
      tipo,
      serie,
      correlativo,
    });
  }

  @Get('ventas-pendientes')
  @Roles(RolUsuario.ADMIN, RolUsuario.ENCARGADO)
  @ApiOperation({
    summary: 'Listar ventas listas para emitir comprobante',
  })
  findVentasPendientes(
    @Query()
    query: {
      page?: number;
      limit?: number;
      search?: string;
      fechaDesde?: string;
      fechaHasta?: string;
      totalMin?: number | string;
      totalMax?: number | string;
      estadoComercial?: EstadoVenta;
      vendedor?: string;
    },
  ) {
    return this.facturacionService.findVentasPendientesEmision(query);
  }

  @Get('comprobantes/:id')
  @Roles(RolUsuario.ADMIN, RolUsuario.ENCARGADO)
  @ApiOperation({ summary: 'Obtener detalle de un comprobante' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.facturacionService.findOne(id);
  }

  @Get('comprobantes/:id/documento')
  @Roles(RolUsuario.ADMIN, RolUsuario.ENCARGADO)
  @ApiOperation({
    summary: 'Obtener enlaces y metadatos del documento emitido',
  })
  getDocumento(@Param('id', ParseUUIDPipe) id: string) {
    return this.facturacionService.getDocumentoSoporte(id);
  }

  @Get('comprobantes/:id/elegibilidad')
  @Roles(RolUsuario.ADMIN, RolUsuario.ENCARGADO)
  @ApiOperation({
    summary:
      'Doc 04/07/08 — Elegibilidad unificada del comprobante para NC, ND o comunicación de baja',
    description:
      'Centraliza saldo no acreditado, plazo (NC excepcional 10 días hábiles, baja 7 días calendario), bloqueos por operaciones en proceso y motivos aplicables. La UI debe consultar este endpoint antes de abrir el formulario respectivo para mostrar todas las razones de bloqueo en un solo lugar.',
  })
  getElegibilidad(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: QueryElegibilidadComprobanteDto,
  ) {
    return this.facturacionService.getElegibilidad(id, query.proposito);
  }

  @Get('comprobantes/:id/saldo-nc')
  @Roles(RolUsuario.ADMIN, RolUsuario.ENCARGADO)
  @ApiOperation({
    summary:
      'Doc 08 — Saldo no acreditado, NCs en proceso y elegibilidad para emitir NC',
  })
  getSaldoNoAcreditado(@Param('id', ParseUUIDPipe) id: string) {
    return this.facturacionService.getSaldoNoAcreditado(id);
  }

  @Get('comprobantes/:id/pdf')
  @Roles(RolUsuario.ADMIN, RolUsuario.ENCARGADO)
  @ApiOperation({ summary: 'Descargar PDF del comprobante' })
  async descargarComprobantePdf(
    @Param('id', ParseUUIDPipe) id: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const file = await this.facturacionService.getComprobanteArtifactStream(
      id,
      'pdf',
    );
    res.setHeader('Content-Type', file.contentType);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${file.filename}"`,
    );
    return new StreamableFile(Readable.from(file.content));
  }

  @Get('comprobantes/:id/xml')
  @Roles(RolUsuario.ADMIN, RolUsuario.ENCARGADO)
  @ApiOperation({ summary: 'Descargar XML firmado del comprobante' })
  async descargarComprobanteXml(
    @Param('id', ParseUUIDPipe) id: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const file = await this.facturacionService.getComprobanteArtifactStream(
      id,
      'xml',
    );
    res.setHeader('Content-Type', file.contentType);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${file.filename}"`,
    );
    return new StreamableFile(Readable.from(file.content));
  }

  @Get('comprobantes/:id/cdr')
  @Roles(RolUsuario.ADMIN, RolUsuario.ENCARGADO)
  @ApiOperation({ summary: 'Descargar CDR (ZIP) del comprobante' })
  async descargarComprobanteCdr(
    @Param('id', ParseUUIDPipe) id: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const file = await this.facturacionService.getComprobanteArtifactStream(
      id,
      'cdr',
    );
    res.setHeader('Content-Type', file.contentType);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${file.filename}"`,
    );
    return new StreamableFile(Readable.from(file.content));
  }

  @Post('comprobantes/:id/anular')
  @Roles(RolUsuario.ADMIN)
  @ApiOperation({
    summary:
      'Comunicar baja (RA) de un comprobante ACEPTADO por SUNAT (solo ADMIN)',
  })
  anular(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AnularComprobanteDto,
    @CurrentUser('sub') userId?: string,
  ) {
    return this.facturacionService.anularComprobante(id, userId, dto.motivo);
  }

  @Post('comprobantes/:id/reintentar')
  @Roles(RolUsuario.ADMIN, RolUsuario.ENCARGADO)
  @ApiOperation({ summary: 'Reintentar envío de comprobante RECHAZADO' })
  reintentar(@Param('id', ParseUUIDPipe) id: string) {
    return this.facturacionService.reintentarEnvio(id);
  }

  @Post('comprobantes/:id/consultar-sunat')
  @Roles(RolUsuario.ADMIN, RolUsuario.ENCARGADO)
  @ApiOperation({
    summary: 'Consultar estado/CDR SUNAT directo del comprobante',
  })
  consultarSunat(@Param('id', ParseUUIDPipe) id: string) {
    return this.facturacionService.consultarEstadoSunat(id);
  }

  @Get('comprobantes/:id/envios')
  @Roles(RolUsuario.ADMIN, RolUsuario.ENCARGADO)
  @ApiOperation({ summary: 'Listar logs de envío de un comprobante' })
  findEnviosByComprobante(@Param('id', ParseUUIDPipe) id: string) {
    return this.comprobanteEnvioLogService.findByComprobante(id);
  }
  // ── Comunicaciones de baja (Doc 05) ─────────────────────────

  @Get('comunicaciones-baja')
  @Roles(RolUsuario.ADMIN, RolUsuario.ENCARGADO)
  @ApiOperation({ summary: 'Listar comunicaciones de baja (RA) paginadas' })
  findComunicacionesBaja(@Query() query: QueryComunicacionBajaDto) {
    return this.facturacionService.findComunicacionesBaja(query);
  }

  @Get('comunicaciones-baja/:id')
  @Roles(RolUsuario.ADMIN, RolUsuario.ENCARGADO)
  @ApiOperation({ summary: 'Obtener detalle de una comunicación de baja' })
  findComunicacionBajaById(@Param('id', ParseUUIDPipe) id: string) {
    return this.facturacionService.findComunicacionBajaById(id);
  }

  @Post('comunicaciones-baja/:id/consultar-estado')
  @Roles(RolUsuario.ADMIN, RolUsuario.ENCARGADO)
  @ApiOperation({
    summary:
      'Consultar estado SUNAT del ticket asociado a una comunicación de baja',
  })
  consultarEstadoBaja(@Param('id', ParseUUIDPipe) id: string) {
    return this.facturacionService.consultarEstadoBaja(id);
  }

  @Post('comunicaciones-baja/:id/cancelar')
  @Roles(RolUsuario.ADMIN, RolUsuario.ENCARGADO)
  @ApiOperation({
    summary:
      'Cancelar una comunicación de baja antes de que se envíe a SUNAT (Doc 07 §7)',
  })
  cancelarBaja(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('sub') userId?: string,
  ) {
    return this.facturacionService.cancelarBaja(id, userId);
  }

  @Get('comunicaciones-baja/:id/xml')
  @Roles(RolUsuario.ADMIN, RolUsuario.ENCARGADO)
  @ApiOperation({ summary: 'Descargar XML firmado de la comunicación de baja' })
  async descargarBajaXml(
    @Param('id', ParseUUIDPipe) id: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const file = await this.facturacionService.getBajaXmlStream(id);
    res.setHeader('Content-Type', file.contentType);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${file.filename}"`,
    );
    return new StreamableFile(Readable.from(file.content));
  }

  @Get('comunicaciones-baja/:id/cdr')
  @Roles(RolUsuario.ADMIN, RolUsuario.ENCARGADO)
  @ApiOperation({ summary: 'Descargar CDR de la comunicación de baja' })
  async descargarBajaCdr(
    @Param('id', ParseUUIDPipe) id: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const file = await this.facturacionService.getBajaCdrStream(id);
    res.setHeader('Content-Type', file.contentType);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${file.filename}"`,
    );
    return new StreamableFile(Readable.from(file.content));
  }
  // ── Logs de envío fiscal ────────────────────────────────────────────

  @Get('envio-logs')
  @Roles(RolUsuario.ADMIN, RolUsuario.ENCARGADO)
  @ApiOperation({ summary: 'Listar logs de envío fiscal' })
  findEnvioLogs(@Query() query: QueryComprobanteEnvioLogDto) {
    return this.comprobanteEnvioLogService.findAll(query);
  }

  // ── Series documentales ─────────────────────────────────────────────

  @Get('series-documento')
  @Roles(RolUsuario.ADMIN)
  @ApiOperation({ summary: 'Listar series documentales fiscales' })
  findSeriesDocumento(@Query() query: QuerySerieDocumentoDto) {
    return this.seriesDocumentoAdminService.findAll(query);
  }

  @Post('series-documento')
  @Roles(RolUsuario.ADMIN)
  @ApiOperation({ summary: 'Crear serie documental fiscal' })
  createSerieDocumento(@Body() dto: CreateSerieDocumentoDto) {
    return this.seriesDocumentoAdminService.create(dto);
  }

  @Post('series-documento/sync-legacy')
  @Roles(RolUsuario.ADMIN)
  @ApiOperation({ summary: 'Migrar series heredadas desde ConfigEmpresa' })
  syncLegacySeries() {
    return this.seriesDocumentoAdminService.syncFromLegacyConfig();
  }

  @Patch('series-documento/:id')
  @Roles(RolUsuario.ADMIN)
  @ApiOperation({ summary: 'Actualizar serie documental fiscal' })
  updateSerieDocumento(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSerieDocumentoDto,
  ) {
    return this.seriesDocumentoAdminService.update(id, dto);
  }

  @Delete('series-documento/:id')
  @Roles(RolUsuario.ADMIN)
  @ApiOperation({ summary: 'Desactivar serie documental fiscal' })
  deleteSerieDocumento(@Param('id', ParseUUIDPipe) id: string) {
    return this.seriesDocumentoAdminService.delete(id);
  }

  // ── Sedes fiscales SUNAT directo ────────────────────────────────────

  @Get('sedes-fiscales')
  @Roles(RolUsuario.ADMIN)
  @ApiOperation({ summary: 'Listar sedes fiscales SUNAT directo' })
  findSedesFiscales(@Query() query: QueryEmpresaSedeFiscalDto) {
    return this.empresaSedeFiscalService.findAll(query);
  }

  @Post('sedes-fiscales')
  @Roles(RolUsuario.ADMIN)
  @ApiOperation({ summary: 'Crear sede fiscal SUNAT directo' })
  createSedeFiscal(@Body() dto: CreateEmpresaSedeFiscalDto) {
    return this.empresaSedeFiscalService.create(dto);
  }

  @Patch('sedes-fiscales/:id')
  @Roles(RolUsuario.ADMIN)
  @ApiOperation({ summary: 'Actualizar sede fiscal SUNAT directo' })
  updateSedeFiscal(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateEmpresaSedeFiscalDto,
  ) {
    return this.empresaSedeFiscalService.update(id, dto);
  }

  @Delete('sedes-fiscales/:id')
  @Roles(RolUsuario.ADMIN)
  @ApiOperation({ summary: 'Desactivar sede fiscal SUNAT directo' })
  deleteSedeFiscal(@Param('id', ParseUUIDPipe) id: string) {
    return this.empresaSedeFiscalService.delete(id);
  }

  // ── Feriados nacionales ─────────────────────────────────────────────

  @Get('feriados')
  @Roles(RolUsuario.ADMIN)
  @ApiOperation({ summary: 'Listar feriados nacionales por año' })
  findFeriados(@Query() query: QueryFeriadoNacionalDto) {
    return this.feriadosNacionalesService.findAll(query);
  }

  @Post('feriados')
  @Roles(RolUsuario.ADMIN)
  @ApiOperation({ summary: 'Crear feriado nacional o día no laborable' })
  createFeriado(@Body() dto: CreateFeriadoNacionalDto) {
    return this.feriadosNacionalesService.create(dto);
  }

  @Patch('feriados/:id')
  @Roles(RolUsuario.ADMIN)
  @ApiOperation({ summary: 'Actualizar feriado nacional' })
  updateFeriado(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateFeriadoNacionalDto,
  ) {
    return this.feriadosNacionalesService.update(id, dto);
  }

  @Delete('feriados/:id')
  @Roles(RolUsuario.ADMIN)
  @ApiOperation({ summary: 'Eliminar feriado nacional' })
  deleteFeriado(@Param('id', ParseUUIDPipe) id: string) {
    return this.feriadosNacionalesService.delete(id);
  }

  // ── Certificado digital SUNAT directo ───────────────────────────────

  @Get('sunat-direct/status')
  @Roles(RolUsuario.ADMIN)
  @ApiOperation({ summary: 'Obtener estado seguro de SUNAT directo' })
  getSunatDirectStatus() {
    return this.certificadoDigitalService.getStatus();
  }

  @Post('sunat-direct/test-connection')
  @Roles(RolUsuario.ADMIN)
  @ApiOperation({ summary: 'Probar configuración segura de SUNAT directo' })
  testSunatDirectConnection() {
    return this.certificadoDigitalService.testConnection();
  }

  @Get('sunat-direct/credentials/status')
  @Roles(RolUsuario.ADMIN)
  @ApiOperation({ summary: 'Obtener estado seguro de credenciales SOL SUNAT' })
  getSunatCredentialsStatus() {
    return this.sunatCredentialsService.getSafeStatus();
  }

  @Patch('sunat-direct/credentials')
  @Roles(RolUsuario.ADMIN)
  @ApiOperation({ summary: 'Guardar credenciales SOL SUNAT cifradas' })
  updateSunatCredentials(@Body() dto: UpdateSunatCredentialsDto) {
    return this.sunatCredentialsService.upsert(dto);
  }

  @Get('certificados-digitales')
  @Roles(RolUsuario.ADMIN)
  @ApiOperation({ summary: 'Listar certificados digitales SUNAT directo' })
  findCertificados(@Query() query: QueryCertificadoDigitalDto) {
    return this.certificadoDigitalService.findAll(query);
  }

  @Post('certificados-digitales')
  @Roles(RolUsuario.ADMIN)
  @ApiOperation({ summary: 'Cargar certificado digital .p12 cifrado' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: 5 * 1024 * 1024 } }),
  )
  uploadCertificado(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: UploadCertificadoDigitalDto,
  ) {
    return this.certificadoDigitalService.upload(file, dto);
  }

  @Post('certificados-digitales/:id/activar')
  @Roles(RolUsuario.ADMIN)
  @ApiOperation({ summary: 'Activar certificado digital SUNAT directo' })
  activateCertificado(@Param('id', ParseUUIDPipe) id: string) {
    return this.certificadoDigitalService.activate(id);
  }

  @Post('certificados-digitales/:id/revocar')
  @Roles(RolUsuario.ADMIN)
  @ApiOperation({ summary: 'Revocar certificado digital SUNAT directo' })
  revokeCertificado(@Param('id', ParseUUIDPipe) id: string) {
    return this.certificadoDigitalService.revoke(id);
  }

  @Delete('certificados-digitales/:id')
  @Roles(RolUsuario.ADMIN)
  @ApiOperation({ summary: 'Eliminar certificado digital SUNAT directo' })
  deleteCertificado(@Param('id', ParseUUIDPipe) id: string) {
    return this.certificadoDigitalService.remove(id);
  }

  // ── Validación documental SUNAT ─────────────────────────────────────

  @Get('clientes-validaciones')
  @Roles(RolUsuario.ADMIN)
  @ApiOperation({ summary: 'Listar validaciones SUNAT de clientes' })
  findClienteValidaciones(@Query() query: QueryClienteValidacionSunatDto) {
    return this.clienteValidacionSunatService.findAll(query);
  }

  @Post('clientes-validaciones')
  @Roles(RolUsuario.ADMIN)
  @ApiOperation({ summary: 'Crear o actualizar validación SUNAT de cliente' })
  upsertClienteValidacion(@Body() dto: CreateClienteValidacionSunatDto) {
    return this.clienteValidacionSunatService.upsert(dto);
  }

  @Get('clientes-validaciones/:id')
  @Roles(RolUsuario.ADMIN)
  @ApiOperation({ summary: 'Obtener validación SUNAT de cliente' })
  findClienteValidacion(@Param('id', ParseUUIDPipe) id: string) {
    return this.clienteValidacionSunatService.findOne(id);
  }

  @Patch('clientes-validaciones/:id')
  @Roles(RolUsuario.ADMIN)
  @ApiOperation({ summary: 'Actualizar validación SUNAT de cliente' })
  updateClienteValidacion(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateClienteValidacionSunatDto,
  ) {
    return this.clienteValidacionSunatService.update(id, dto);
  }

  @Delete('clientes-validaciones/:id')
  @Roles(RolUsuario.ADMIN)
  @ApiOperation({ summary: 'Eliminar validación SUNAT de cliente' })
  deleteClienteValidacion(@Param('id', ParseUUIDPipe) id: string) {
    return this.clienteValidacionSunatService.delete(id);
  }

  @Post('padron-sunat-ruc/importar')
  @Roles(RolUsuario.ADMIN)
  @ApiOperation({
    summary: 'Iniciar importación del padrón reducido RUC SUNAT',
  })
  importarPadronSunatRuc() {
    return this.padronSunatRucService.startImportFromSunatUrl();
  }

  @Post('padron-sunat-ruc/importar/cancelar')
  @Roles(RolUsuario.ADMIN)
  @ApiOperation({
    summary: 'Solicitar cancelación de importación del padrón RUC',
  })
  cancelarImportacionPadronSunatRuc() {
    return this.padronSunatRucService.cancelImport();
  }

  @Get('padron-sunat-ruc/importar/status')
  @Roles(RolUsuario.ADMIN)
  @ApiOperation({ summary: 'Consultar progreso de importación del padrón RUC' })
  estadoImportacionPadronSunatRuc() {
    return this.padronSunatRucService.getImportStatus();
  }

  // ── Notas de crédito ────────────────────────────────────────────────

  @Post('notas-credito')
  @Roles(RolUsuario.ADMIN)
  @ApiOperation({ summary: 'Crear nota de crédito (solo ADMIN)' })
  crearNotaCredito(@Body() dto: CreateNotaCreditoDto) {
    return this.facturacionService.crearNotaCredito(dto);
  }

  // ── Notas de débito ─────────────────────────────────────────────────

  @Post('notas-debito')
  @Roles(RolUsuario.ADMIN)
  @ApiOperation({ summary: 'Crear nota de débito (solo ADMIN)' })
  crearNotaDebito(@Body() dto: CreateNotaDebitoDto) {
    return this.facturacionService.crearNotaDebito(dto);
  }

  // ── Configuración fiscal no sensible ────────────────────────────────

  @Get('config-fiscal')
  @Roles(RolUsuario.ADMIN)
  @ApiOperation({ summary: 'Obtener configuración fiscal no sensible' })
  getConfigFiscal() {
    return this.configuracionFiscalService.getConfigFiscal();
  }

  @Patch('config-fiscal')
  @Roles(RolUsuario.ADMIN)
  @ApiOperation({
    summary: 'Crear o actualizar configuración fiscal no sensible',
  })
  updateConfigFiscal(@Body() dto: UpdateConfigEmpresaFiscalDto) {
    return this.configuracionFiscalService.upsertConfigFiscal(dto);
  }

  // ── Configuración de empresa ────────────────────────────────────────

  @Get('config')
  @Roles(RolUsuario.ADMIN, RolUsuario.ENCARGADO)
  @ApiOperation({ summary: 'Obtener configuración de empresa y series' })
  getConfig() {
    return this.facturacionService.getConfig();
  }

  @Patch('config')
  @Roles(RolUsuario.ADMIN)
  @ApiOperation({ summary: 'Actualizar configuración de empresa (solo ADMIN)' })
  updateConfig(@Body() dto: UpdateConfigEmpresaDto) {
    return this.facturacionService.updateConfig(dto);
  }
}
