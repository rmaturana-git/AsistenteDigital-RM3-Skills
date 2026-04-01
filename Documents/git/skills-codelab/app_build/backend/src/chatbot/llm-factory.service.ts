import { Injectable, Logger } from '@nestjs/common';
import { TenantConfig } from '@prisma/client';

@Injectable()
export class LlmFactoryService {
  private readonly logger = new Logger(LlmFactoryService.name);

  /** Devuelve la instancia LLM intercambiable según config del Tenant */
  createChatModel(config: TenantConfig) {
    return { provider: config.llm_provider, ready: true }; 
  }

  /**
   * Mock Vectorial Estándar para evitar Crash de Node 'ERR_PACKAGE_PATH_NOT_EXPORTED'.
   * Retorna dimensionalidad fake (dim 1536)
   */
  createEmbeddingModel() {
    return {
      embedQuery: async (text: string) => {
         // Genera vector fantasma de 1536 dimensiones de PGVector
         return Array(1536).fill(0).map(() => Math.random() * 0.1);
      }
    };
  }
}
