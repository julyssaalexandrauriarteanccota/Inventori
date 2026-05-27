import { Module } from '@nestjs/common';
import { ClienteEquiposController } from './cliente-equipos.controller';
import { ClienteEquiposService } from './cliente-equipos.service';
import { EquiposController } from './equipos.controller';
import { EquiposService } from './equipos.service';
import { SnmpService } from './snmp.service';

@Module({
  controllers: [EquiposController, ClienteEquiposController],
  providers: [EquiposService, ClienteEquiposService, SnmpService],
  exports: [EquiposService, ClienteEquiposService],
})
export class EquiposModule {}
