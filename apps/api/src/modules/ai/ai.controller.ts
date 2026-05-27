import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
  Body,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AiService } from './ai.service';
import { ClasificarTicketDto } from './dto/clasificar-ticket.dto';

@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('ocr/serial')
  @UseInterceptors(FileInterceptor('file'))
  async ocrSerial(@UploadedFile() file: Express.Multer.File) {
    return this.aiService.extractSerialNumbers(
      file.buffer,
      file.originalname,
      file.mimetype,
    );
  }

  @Post('clasificar/ticket')
  async clasificarTicket(@Body() dto: ClasificarTicketDto) {
    return this.aiService.classifyTicket(dto);
  }
}
