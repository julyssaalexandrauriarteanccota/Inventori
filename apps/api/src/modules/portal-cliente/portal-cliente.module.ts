import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { FacturacionModule } from '../facturacion/facturacion.module';
import { PortalClienteController } from './portal-cliente.controller';
import { PortalClienteService } from './portal-cliente.service';

@Module({
  imports: [DatabaseModule, FacturacionModule],
  controllers: [PortalClienteController],
  providers: [PortalClienteService],
})
export class PortalClienteModule {}
