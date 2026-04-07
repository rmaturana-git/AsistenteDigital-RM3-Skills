import { Injectable, Logger } from '@nestjs/common';
import { TenantConfig } from '@prisma/client';
import { ChatOpenAI, OpenAIEmbeddings } from '@langchain/openai';
import { ChatGoogleGenerativeAI, GoogleGenerativeAIEmbeddings } from '@langchain/google-genai';

@Injectable()
export class LlmFactoryService {
  private readonly logger = new Logger(LlmFactoryService.name);

  /** Devuelve la instancia LLM real según config del Tenant */
  createChatModel(config: TenantConfig) {
    const provider = config.llm_provider?.toLowerCase() || process.env.DEFAULT_LLM_PROVIDER;
    const model = config.llm_model || process.env.DEFAULT_LLM_MODEL;
    const temperature = Number(config.temperature) || 0.2;

    this.logger.debug(`Iniciando modelo LLM: ${provider} / ${model}`);

    if (provider === 'gemini') {
      return new ChatGoogleGenerativeAI({
        apiKey: process.env.GOOGLE_API_KEY || '',
        model: model || 'gemini-pro',
        temperature: temperature,
      });
    }

    // Default: OpenAI
    return new ChatOpenAI({
      openAIApiKey: process.env.OPENAI_API_KEY,
      modelName: model,
      temperature: temperature,
    });
  }

  /**
   * Crea el modelo de Embeddings real para la búsqueda vectorial.
   * IMPORTANTE: En el MVP usamos un modelo fijo para evitar colisiones de dimensiones en pgvector.
   */
  createEmbeddingModel() {
    const provider = process.env.DEFAULT_EMBEDDING_PROVIDER || 'openai';

    if (provider === 'gemini') {
      return new GoogleGenerativeAIEmbeddings({
        apiKey: process.env.GOOGLE_API_KEY,
        modelName: "embedding-001",
      });
    }

    return new OpenAIEmbeddings({
      openAIApiKey: process.env.OPENAI_API_KEY,
    });
  }
}
