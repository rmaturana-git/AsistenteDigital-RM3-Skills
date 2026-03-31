import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { existsSync, mkdirSync } from 'fs';

import { DocumentsController } from './documents.controller';
import { DocumentsService } from './documents.service';
import { ChunkerService } from './chunker.service';
import { LlmFactoryService } from '../chatbot/llm-factory.service';
import { TenantConfigCacheService } from '../tenant/tenant-config-cache.service';

// Aseguramos que el directorio de subidas exista al cargar el módulo
const UPLOAD_DIR = './uploads';
if (!existsSync(UPLOAD_DIR)) {
  mkdirSync(UPLOAD_DIR, { recursive: true });
}

@Module({
  imports: [
    MulterModule.register({
      storage: diskStorage({
        destination: UPLOAD_DIR,
        filename: (req, file, cb) => {
          // Genera un nombre único con timestamp + un hash aleatorio
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
          const ext = extname(file.originalname);
          cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
        },
      }),
      limits: {
        fileSize: (Number(process.env.MAX_UPLOAD_MB) || 10) * 1024 * 1024,
      },
      fileFilter: (req, file, cb) => {
        // Bloquear formatos no aceptados
        const allowedTypes = ['.pdf', '.docx', '.xlsx'];
        const ext = extname(file.originalname).toLowerCase();
        if (allowedTypes.includes(ext)) {
          cb(null, true);
        } else {
          cb(new Error(`Formato no soportado. Tipos permitidos: ${allowedTypes.join(', ')}`), false);
        }
      },
    }),
  ],
  controllers: [DocumentsController],
  providers: [
    DocumentsService, 
    ChunkerService, 
    LlmFactoryService, 
    TenantConfigCacheService
  ],
})
export class DocumentsModule {}
