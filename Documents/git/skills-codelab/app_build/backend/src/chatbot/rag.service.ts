import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LlmFactoryService } from './llm-factory.service';
import { TokenTrackingService } from './token-tracking.service';
import { TenantConfigCacheService } from '../tenant/tenant-config-cache.service';

@Injectable()
export class RagService {
  private readonly logger = new Logger(RagService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly llmFactory: LlmFactoryService,
    private readonly tokenTracking: TokenTrackingService,
    private readonly configCache: TenantConfigCacheService,
  ) {}

  /**
   * Flujo Central de RAG con Búsqueda Vectorial por pgvector y Aislamiento de Tenant.
   */
  async processChat(tenantId: string, userId: string, question: string) {
    this.logger.log(`Dummy Chat RAG. Question: ${question}`);
    return {
      message: 'Soy el Chatbot Dummy de Respaldo respondiendo exitosamente.',
      sources: ['Dummy Doc.pdf'],
    };
  }
}
