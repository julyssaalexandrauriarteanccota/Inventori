import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ClientesController } from './clientes.controller';
import { ClientesService } from './clientes.service';
import { ConsultaDocumentoClienteService } from './consulta-documento-cliente.service';
import { PadronSunatRucService } from '../facturacion/padron-sunat-ruc.service';

@Module({
  imports: [HttpModule],
  controllers: [ClientesController],
  providers: [ClientesService, ConsultaDocumentoClienteService, PadronSunatRucService],
  exports: [ClientesService],
})
export class ClientesModule {}
