import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { UploadsModule } from '../uploads/uploads.module';
import { InventarioModule } from '../inventario/inventario.module';
import { SoporteService } from './soporte.service';
import { SoporteController } from './soporte.controller';

@Module({
  imports: [DatabaseModule, UploadsModule, InventarioModule],
  controllers: [SoporteController],
  providers: [SoporteService],
  exports: [SoporteService],
})
export class SoporteModule {}
