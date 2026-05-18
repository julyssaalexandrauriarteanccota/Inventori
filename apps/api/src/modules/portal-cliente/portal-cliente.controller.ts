import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  Res,
  StreamableFile,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Readable } from 'stream';
import type { Request, Response } from 'express';
import { Public } from '../../common/decorators';
import { BuscarComprobantePortalDto } from './dto/buscar-comprobante-portal.dto';
import { PortalClienteService } from './portal-cliente.service';

@ApiTags('Portal cliente')
@Public()
@Controller('portal-cliente')
export class PortalClienteController {
  constructor(private readonly portalService: PortalClienteService) {}

  @Post('buscar')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({
    summary: 'Buscar comprobante público por datos del comprobante y receptor',
  })
  buscar(@Body() dto: BuscarComprobantePortalDto, @Req() req: Request) {
    return this.portalService.buscarPorDatos(dto, requestMeta(req));
  }

  @Get('c/:tokenConsulta')
  @Throttle({ default: { limit: 60, ttl: 60000 } })
  @ApiOperation({ summary: 'Ver comprobante público por token de consulta' })
  verPorToken(
    @Param('tokenConsulta', ParseUUIDPipe) tokenConsulta: string,
    @Req() req: Request,
  ) {
    return this.portalService.buscarPorToken(tokenConsulta, requestMeta(req));
  }

  @Get('c/:tokenConsulta/preview')
  @Throttle({ default: { limit: 60, ttl: 60000 } })
  @ApiOperation({ summary: 'Preview público del comprobante' })
  preview(
    @Param('tokenConsulta', ParseUUIDPipe) tokenConsulta: string,
    @Req() req: Request,
  ) {
    return this.portalService.preview(tokenConsulta, requestMeta(req));
  }

  @Get('c/:tokenConsulta/descargas/:artifact')
  @Throttle({ default: { limit: 60, ttl: 60000 } })
  @ApiOperation({ summary: 'Descargar XML, CDR o PDF público verificado' })
  async descargar(
    @Param('tokenConsulta', ParseUUIDPipe) tokenConsulta: string,
    @Param('artifact') artifact: string,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const file = await this.portalService.descargar(
      tokenConsulta,
      artifact,
      requestMeta(req),
    );

    if (file.kind === 'redirect') {
      res.redirect(file.redirectUrl);
      return;
    }

    res.setHeader('Content-Type', file.contentType);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${file.filename}"`,
    );
    return new StreamableFile(Readable.from(file.content));
  }
}

function requestMeta(req: Request) {
  return {
    ip:
      req.ip ||
      req.headers['x-forwarded-for']?.toString().split(',')[0]?.trim() ||
      req.socket.remoteAddress ||
      'unknown',
    userAgent: req.headers['user-agent'],
  };
}
