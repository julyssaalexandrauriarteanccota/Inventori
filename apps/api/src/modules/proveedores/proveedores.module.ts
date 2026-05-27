import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ProveedoresController } from './proveedores.controller';
import { ProveedoresService } from './proveedores.service';
import { ConsultaDocumentoClienteService } from '../clientes/consulta-documento-cliente.service';
import { PadronSunatRucService } from '../facturacion/padron-sunat-ruc.service';

@Module({
  imports: [HttpModule],
  controllers: [ProveedoresController],
  providers: [
    ProveedoresService,
    ConsultaDocumentoClienteService,
    PadronSunatRucService,
  ],
  exports: [ProveedoresService],
})
export class ProveedoresModule {}
