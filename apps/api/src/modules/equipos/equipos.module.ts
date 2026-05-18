import { Module } from '@nestjs/common';
import { EquiposController } from './equipos.controller';
import { EquiposService } from './equipos.service';
import { SnmpService } from './snmp.service';

@Module({
  controllers: [EquiposController],
  providers: [EquiposService, SnmpService],
  exports: [EquiposService],
})
export class EquiposModule {}
