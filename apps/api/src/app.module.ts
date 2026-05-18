import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { DatabaseModule } from './database/database.module';
import { HealthModule } from './modules/health/health.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsuariosModule } from './modules/usuarios/usuarios.module';
import { AuditoriaModule } from './modules/auditoria/auditoria.module';
import { UploadsModule } from './modules/uploads/uploads.module';
import { ClientesModule } from './modules/clientes/clientes.module';
import { ProveedoresModule } from './modules/proveedores/proveedores.module';
import { CategoriasModule } from './modules/categorias/categorias.module';
import { MarcasModule } from './modules/marcas/marcas.module';
import { ModelosModule } from './modules/modelos/modelos.module';
import { UnidadesMedidaModule } from './modules/unidades-medida/unidades-medida.module';
import { ProductosModule } from './modules/productos/productos.module';
import { InventarioModule } from './modules/inventario/inventario.module';
import { EquiposModule } from './modules/equipos/equipos.module';
import { GarantiasModule } from './modules/garantias/garantias.module';
import { ComprasModule } from './modules/compras/compras.module';
import { VentasModule } from './modules/ventas/ventas.module';
import { CajaModule } from './modules/caja/caja.module';
import { FacturacionModule } from './modules/facturacion/facturacion.module';
import { PortalClienteModule } from './modules/portal-cliente/portal-cliente.module';
import { SoporteModule } from './modules/soporte/soporte.module';
import { AdminConfigModule } from './modules/config/config.module';
import { ReportesModule } from './modules/reportes/reportes.module';
import { UbicacionesModule } from './modules/ubicaciones/ubicaciones.module';
import { WebsocketsModule } from './websockets';
import { AiModule } from './modules/ai/ai.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { AuditoriaInterceptor } from './common/interceptors';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '../../.env',
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 100,
      },
    ]),
    DatabaseModule,
    AuthModule,
    UsuariosModule,
    AuditoriaModule,
    UploadsModule,
    ClientesModule,
    ProveedoresModule,
    CategoriasModule,
    MarcasModule,
    ModelosModule,
    UnidadesMedidaModule,
    ProductosModule,
    InventarioModule,
    EquiposModule,
    GarantiasModule,
    ComprasModule,
    VentasModule,
    CajaModule,
    FacturacionModule,
    PortalClienteModule,
    SoporteModule,
    AdminConfigModule,
    ReportesModule,
    UbicacionesModule,
    WebsocketsModule,
    AiModule,
    HealthModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditoriaInterceptor,
    },
  ],
})
export class AppModule {}
