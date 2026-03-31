import { Injectable, Logger, ConflictException } from '@nestjs/common';
import * as crypto from 'crypto';
import { extname } from 'path';
import * as fs from 'fs';
import { Cron, CronExpression } from '@nestjs/schedule';

import { PrismaService } from '../prisma/prisma.service';
import { ChunkerService } from './chunker.service';
import { PdfParser } from './parsers/pdf.parser';
import { DocxParser } from './parsers/docx.parser';
import { XlsxParser } from './parsers/xlsx.parser';
import { LlmFactoryService } from '../chatbot/llm-factory.service';

@Injectable()
export class DocumentsService {
  private readonly logger = new Logger(DocumentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly chunker: ChunkerService,
    private readonly llmFactory: LlmFactoryService,
  ) {}

  /**
   * Toma el archivo que Multer ya guardó en `/uploads/` y comienza
   * el flujo de persistencia y parseo.
   */
  async processUploadedFile(file: Express.Multer.File, tenantId: string) {
    this.logger.log(`Iniciando procesamiento de archivo: ${file.originalname} para tenant: ${tenantId}`);

    const ext = extname(file.originalname).toLowerCase().replace('.', ''); 

    // Fase Hash: Des-Duplicación Criptográfica Estricta (SHA-256)
    const fileBuffer = fs.readFileSync(file.path);
    const hashSignature = crypto.createHash('sha256').update(fileBuffer).digest('hex');

    // Comprobar si este Tenant ya posee esta misma firma digital
    const existingDoc = await this.prisma.document.findUnique({
       where: {
         tenant_id_file_hash: {
            tenant_id: tenantId,
            file_hash: hashSignature,
         }
       }
    });

    if (existingDoc) {
       this.logger.warn(`Intento de ingesta duplicada bloqueado. Tenant: ${tenantId}, Hash: ${hashSignature}`);
       // Limpiar del Storage temporal para no acumular basura
       fs.unlinkSync(file.path);
       throw new ConflictException(`El documento [${existingDoc.titulo}] ya existe en la Base de Conocimientos con este mismo contenido físico. No puedes subir redundancias.`);
    }

    // 1. Guardar registro inicial en base de datos
    const documentRecord = await this.prisma.document.create({
      data: {
        tenant_id: tenantId,
        titulo: file.originalname,
        tipo_documento: 'General',
        formato: ext,
        file_path: file.path, 
        file_hash: hashSignature,
        status: 'processing',
      },
    });

    // 2. Disparar el parseo asíncrono para no bloquear la petición HTTP del usuario
    this.executeIngestionPipeline(documentRecord.id, file.path, ext, tenantId)
      .catch((error) => {
        this.logger.error(`Error en pipeline asíncrono para ${documentRecord.id}`, error);
      });

    // Retorna inmediatamente al cliente
    return {
      success: true,
      data: {
        document_id: documentRecord.id,
        status: 'processing',
        file: file.originalname,
      },
      message: 'El documento ha entrado a la cola de procesamiento e indexación vectorial.',
    };
  }

  /**
   * Pipeline asíncrono real: Parsers -> Chunker -> Vector BD
   */
  private async executeIngestionPipeline(
    documentId: string,
    filePath: string,
    format: string,
    tenantId: string,
  ) {
    try {
      this.logger.log(`Procesando archivo: ${filePath} (${format})`);
      
      let rawTextChunks: string[] = [];

      // 1. Fase de Parseo Extracción Física a RAM
      if (format === 'pdf') {
         const rawPdfText = await PdfParser.extractText(filePath);
         rawTextChunks = this.chunker.splitText(rawPdfText);
      } else if (format === 'docx') {
         const rawDocxText = await DocxParser.extractText(filePath);
         rawTextChunks = this.chunker.splitText(rawDocxText);
      } else if (format === 'xlsx') {
         // El Excel devuelve cada línea como chunk atómico
         rawTextChunks = await XlsxParser.extractRowsAsChunks(filePath);
      } else {
         throw new Error('Formato ext físico desconocido. (' + format + ')');
      }

      this.logger.log(`Se generaron ${rawTextChunks.length} fragmentos. Iniciando vectorización.`);

      // 2. Fase de Embebido
      // Usamos el Factory para obtener el motor global de embebidos (generalmente OpenAI MiniLM/1536d)
      const embeddingModel = this.llmFactory.createEmbeddingModel();
      
      let chunkIndex = 0;
      for (const chunkedText of rawTextChunks) {
         if (!chunkedText.trim()) continue;

         // Vectorizar por Lotes atómicos o individuales
         const vectorBytes = await embeddingModel.embedQuery(chunkedText);
         const vectorString = `[${vectorBytes.join(',')}]`;

         // Inserción vectorizada con Unsupported() Raw Query PostgreSQL
         await this.prisma.$executeRaw`
           INSERT INTO document_chunks (
             id, document_id, tenant_id, contenido_texto, embedding, chunk_index, metadata
           ) VALUES (
             gen_random_uuid(), 
             ${documentId}::uuid, 
             ${tenantId}::uuid, 
             ${chunkedText}, 
             ${vectorString}::vector, 
             ${chunkIndex}, 
             '{}'::jsonb
           )
         `;
         chunkIndex++;
      }

      // 3. Documento ha finalizado, podemos cerrar el ciclo
      await this.prisma.document.update({
        where: { id: documentId },
        data: { status: 'ready', total_chunks: rawTextChunks.length },
      });

      this.logger.log(`Pipeline finalizado con éxito para doc: ${documentId}`);

    } catch (error) {
       await this.prisma.document.update({
        where: { id: documentId },
        data: { 
           status: 'error',
           error_message: error.message || 'Error desconocido en parseo',
        },
      });
      throw error;
    }
  }

  /**
   * CRON JOB: Cada Medianoche se hace una limpieza de la carpeta de uploads para
   * mantenerla para auditoría local por cierto tiempo (Ej: 2 días) y borrar.
   * Requisito: ScheduleModule instanciado.
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  handleUploadsCleanup() {
     this.logger.log('CRON START: Limpiando directorio transitorio de auditorías PDF/Word');
     const directoryPath = './uploads';
     const expiracyDays = 2; // Para auditoría
     const expiracyMs = expiracyDays * 24 * 60 * 60 * 1000;

     fs.readdir(directoryPath, (err, files) => {
        if (err) return;
        
        files.forEach((file) => {
           const fullPath = directoryPath + '/' + file;
           fs.stat(fullPath, (errStat, stats) => {
             if (errStat) return;
             const now = new Date().getTime();
             const fileTime = new Date(stats.mtime).getTime();
             
             if (now - fileTime > expiracyMs) {
                fs.unlink(fullPath, (errUnl) => {
                   if (!errUnl) this.logger.debug(`Purgado archivo viejo: ${file}`);
                });
             }
           });
        });
     });
  }
}
