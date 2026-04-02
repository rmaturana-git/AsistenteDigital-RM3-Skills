import { Injectable, Logger } from '@nestjs/common';
import { TenantConfig } from '@prisma/client';
import { ChatOpenAI, OpenAIEmbeddings } from '@langchain/openai';

@Injectable()
export class LlmFactoryService {
  private readonly logger = new Logger(LlmFactoryService.name);

  /** Devuelve la instancia LLM real según config del Tenant */
  createChatModel(config: TenantConfig) {
    this.logger.debug(`Iniciando modelo LLM: ${config.llm_provider} / ${config.llm_model}`);
    
    // Por el MVP priorizamos OpenAI, pero extendible a otros proveedores
    return new ChatOpenAI({
      openAIApiKey: process.env.OPENAI_API_KEY, 
      modelName: config.llm_model || process.env.DEFAULT_LLM_MODEL,
      temperature: Number(config.temperature) || 0.2, // Propiedad correcta es 'temperature'
    });
  }

  /**
   * Crea el modelo de Embeddings real para la búsqueda vectorial.
   */
  createEmbeddingModel() {
    return new OpenAIEmbeddings({
      openAIApiKey: process.env.OPENAI_API_KEY,
    });
  }
}
