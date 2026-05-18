import { forwardRef, Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { DatabaseModule } from '../../database/database.module';
import { VentasModule } from '../ventas/ventas.module';
import { FacturacionController } from './facturacion.controller';
import { CertificadoDigitalService } from './certificado-digital.service';
import { ClienteValidacionSunatService } from './cliente-validacion-sunat.service';
import { ConfiguracionFiscalService } from './configuracion-fiscal.service';
import { ComprobanteDetalleService } from './comprobante-detalle.service';
import { ComprobanteEnvioLogService } from './comprobante-envio-log.service';
import { ComprobanteSnapshotService } from './comprobante-snapshot.service';
import { EmpresaSedeFiscalService } from './empresa-sede-fiscal.service';
import { FacturacionService } from './facturacion.service';
import { FiscalSecretsService } from './fiscal-secrets.service';
import { SerieDocumentoService } from './serie-documento.service';
import { SeriesDocumentoAdminService } from './series-documento-admin.service';
import { SunatCredentialsService } from './sunat-credentials.service';
import { SunatDirectGateway } from './sunat-direct.gateway';
import { SunatPayloadBuilder } from './sunat-payload.builder';
import { ComprobantePdfService } from './comprobante-pdf.service';
import { ComprobanteEmailService } from './comprobante-email.service';
import { FiscalStorageService } from './fiscal-storage.service';
import { FeriadosNacionalesService } from './feriados-nacionales.service';
import { ValidacionFiscalService } from './validacion-fiscal.service';
import { SunatProcessor } from './sunat.processor';
import { SunatBajaProcessor } from './sunat-baja.processor';
import { SunatConsultaProcessor } from './sunat-consulta.processor';
import { SunatMonitorProcessor } from './sunat-monitor.processor';
import { SunatMonitorService } from './sunat-monitor.service';
import { SunatXmlSigner } from './sunat-xml.signer';

@Module({
  imports: [
    DatabaseModule,
    forwardRef(() => VentasModule),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        connection: {
          url: configService.get<string>('REDIS_URL', 'redis://localhost:6379'),
          lazyConnect: true,
          enableOfflineQueue: false,
          retryStrategy: () => null,
          maxRetriesPerRequest: null,
        },
      }),
      inject: [ConfigService],
    }),
    // Doc 06 §1 — colas separadas por responsabilidad. Esto permite:
    //   * controlar concurrencia por tipo de trabajo,
    //   * pausar bajas sin afectar emisiones,
    //   * exponer métricas por cola,
    //   * dimensionar workers independientes en producción.
    BullModule.registerQueue(
      { name: 'cola-envio-cpe' },
      { name: 'cola-baja' },
      { name: 'cola-consulta-ticket' },
      { name: 'cola-monitor' },
    ),
  ],
  controllers: [FacturacionController],
  providers: [
    FacturacionService,
    CertificadoDigitalService,
    ClienteValidacionSunatService,
    ConfiguracionFiscalService,
    EmpresaSedeFiscalService,
    FiscalSecretsService,
    ComprobanteDetalleService,
    ComprobanteEnvioLogService,
    ComprobanteSnapshotService,
    SerieDocumentoService,
    SeriesDocumentoAdminService,
    SunatCredentialsService,
    SunatDirectGateway,
    SunatPayloadBuilder,
    SunatProcessor,
    SunatBajaProcessor,
    SunatConsultaProcessor,
    SunatMonitorProcessor,
    SunatMonitorService,
    SunatXmlSigner,
    FiscalStorageService,
    FeriadosNacionalesService,
    ComprobantePdfService,
    ComprobanteEmailService,
    ValidacionFiscalService,
  ],
  exports: [FacturacionService, FiscalStorageService, ValidacionFiscalService],
})
export class FacturacionModule {}
