import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
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

  @Get()
  async getDocuments() {
    return this.documentsService.findAll();
  }

  @Delete(':id')
  async deleteDocument(@Param('id') id: string) {
    return this.documentsService.deleteDocument(id);
  }

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

    // Priorizar SIEMPRE el tenant_id validado por el ApiKeyGuard por seguridad.
    // El tenant_id del body solo se usa como fallback si el Guard no lo inyectó (caso raro).
    const tenantId = request.tenant_id || request.body?.tenant_id;

    if (!tenantId) {
       throw new BadRequestException('No se pudo identificar el Tenant del archivo. Falta API Key válida.');
    }

    // Delegamos la lógica al servicio, entregando la ruta del archivo físico y el tenant
    return this.documentsService.processUploadedFile(file, tenantId);
  }
}
