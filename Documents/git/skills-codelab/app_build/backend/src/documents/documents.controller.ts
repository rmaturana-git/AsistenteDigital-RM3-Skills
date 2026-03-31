import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  UseGuards,
  Req,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { DocumentsService } from './documents.service';
import { ApiKeyGuard } from '../auth/api-key.guard';

@Controller('documents')
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Post('ingest')
  @UseGuards(ApiKeyGuard)
  @UseInterceptors(FileInterceptor('file'))
  async uploadDocument(
    @UploadedFile() file: Express.Multer.File,
    @Req() request: any,
  ) {
    if (!file) {
      throw new BadRequestException('No se ha proporcionado ningún archivo o formato no válido.');
    }

    // El ApiKeyGuard ya validó al tenant y lo inyectó en el request
    const tenantId = request.tenant_id;

    if (!tenantId) {
       throw new BadRequestException('No se pudo identificar el Tenant del archivo. Falta API Key.');
    }

    // Delegamos la lógica al servicio, entregando la ruta del archivo físico y el tenant
    return this.documentsService.processUploadedFile(file, tenantId);
  }
}
