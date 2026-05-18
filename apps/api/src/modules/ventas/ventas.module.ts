import { forwardRef, Module } from '@nestjs/common';
import { VentasController } from './ventas.controller';
import { VentasService } from './ventas.service';
import { VentaReversoFiscalService } from './venta-reverso-fiscal.service';
import { CajaModule } from '../caja/caja.module';
import { FacturacionModule } from '../facturacion/facturacion.module';

@Module({
  imports: [CajaModule, forwardRef(() => FacturacionModule)],
  controllers: [VentasController],
  providers: [VentasService, VentaReversoFiscalService],
  exports: [VentasService, VentaReversoFiscalService],
})
export class VentasModule {}
