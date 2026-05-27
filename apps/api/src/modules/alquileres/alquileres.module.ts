import { Module } from '@nestjs/common';
import { CajaModule } from '../caja/caja.module';
import { AlquileresController } from './alquileres.controller';
import { AlquileresService } from './alquileres.service';

@Module({
  imports: [CajaModule],
  controllers: [AlquileresController],
  providers: [AlquileresService],
  exports: [AlquileresService],
})
export class AlquileresModule {}
