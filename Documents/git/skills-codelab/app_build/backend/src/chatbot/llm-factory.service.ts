import { Injectable, Logger } from '@nestjs/common';
import { ChatOpenAI, OpenAIEmbeddings } from '@langchain/openai';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { ChatOllama } from '@langchain/community/chat_models/ollama';
import { TenantConfig } from '@prisma/client';

@Injectable()
export class LlmFactoryService {
  private readonly logger = new Logger(LlmFactoryService.name);

  /** Devuelve la instancia LLM intercambiable según config del Tenant */
  createChatModel(config: TenantConfig) {
    const { llm_provider, llm_model, temperature, llm_api_key, tenant_id } = config;

    switch (llm_provider?.toLowerCase()) {
      case 'gemini':
        if (!llm_api_key) this.logger.warn(`Tenant ${tenant_id} no tiene API Key propia de Gemini. Fallback a Env Global.`);
        return new ChatGoogleGenerativeAI({
          modelName: llm_model || 'gemini-1.5-flash',
          maxOutputTokens: 2048,
          temperature: temperature,
          apiKey: llm_api_key || process.env.GEMINI_API_KEY,
        });

      case 'ollama':
        this.logger.log(`Forzando red local para Tenant ${tenant_id} mediante OLLAMA.`);
        return new ChatOllama({
          model: llm_model || 'llama3.2',
          temperature: temperature,
          baseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
        });

      case 'openai':
      default:
        if (!llm_api_key) this.logger.warn(`Tenant ${tenant_id} requeriría su propia OpenAI Key. Fallback Env Global.`);
        return new ChatOpenAI({
          modelName: llm_model || 'gpt-4o-mini',
          temperature: temperature,
          openAIApiKey: llm_api_key || process.env.OPENAI_API_KEY,
        });
    }
  }

  /**
   * Devuelve el modelo Vectorial Estándar para indexación.
   * ADVERTENCIA DE ARQUITECTURA: Un solo modelo universal para no romper la dimensionalidad pgvector (1536).
   */
  createEmbeddingModel() {
    return new OpenAIEmbeddings({
      modelName: process.env.DEFAULT_EMBEDDING_MODEL || 'text-embedding-3-small',
      openAIApiKey: process.env.OPENAI_API_KEY,
    });
  }
}
