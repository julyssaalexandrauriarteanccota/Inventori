import { DocumentBuilder } from '@nestjs/swagger';

export function buildSwaggerConfig() {
  return new DocumentBuilder()
    .setTitle('ERP API')
    .setDescription(
      'API del sistema ERP para gestión de fotocopiadoras e impresoras',
    )
    .setVersion('1.0')
    .addBearerAuth()
    .build();
}
