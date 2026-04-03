import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LlmFactoryService } from './llm-factory.service';
import { TokenTrackingService } from './token-tracking.service';
import { TenantConfigCacheService } from '../tenant/tenant-config-cache.service';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { StringOutputParser } from '@langchain/core/output_parsers';

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
    this.logger.log(`Procesando consulta RAG para tenant ${tenantId}. Pregunta: ${question}`);
    
    try {
      // 1. Obtener la configuración del Tenant y el modelo
      const config = await this.configCache.getConfig(tenantId);
      if (!config) throw new Error(`Configuración no encontrada para tenant ${tenantId}`);

      const chatModel = this.llmFactory.createChatModel(config);
      const embeddingModel = this.llmFactory.createEmbeddingModel();

      // 2. Generar embedding de la pregunta
      const queryVector = await embeddingModel.embedQuery(question);

      // 3. Búsqueda Vectorial en pgvector vía Prisma (SQL raw por mayor control)
      // Buscamos los fragmentos más similares aislados por tenant
      const chunks: any[] = await this.prisma.$queryRaw`
        SELECT contenido_texto as content, metadata, (embedding <=> ${queryVector}::vector) as distance
        FROM "document_chunks"
        WHERE tenant_id = ${tenantId}::uuid
        ORDER BY distance ASC
        LIMIT 5;
      `;

      if (chunks.length === 0) {
        return {
          message: "No encontré información relevante en tus documentos para responder a esa pregunta.",
          sources: []
        };
      }

      // 4. Preparar el Contexto para el LLM y extraer las Fuentes (Archivos)
      const contextText = chunks.map(c => c.content).join('\n\n--- SEGMENTO ---\n\n');
      const sources = Array.from(new Set(chunks.map(c => c.metadata?.source || 'Este o múltiples documentos en Base de Datos')));

      // --- LOG DEBUG: Diagnóstico Vectorial Físico ---
      const fechaActual = new Date().toLocaleString('es-ES');
      let debugText = `================ DIAGNÓSTICO RAG ================\n`;
      debugText += `FECHA Y HORA : ${fechaActual}\n`;
      debugText += `TENANT ID    : ${tenantId}\n`;
      debugText += `ARCHIVOS     : ${sources.join(', ')}\n`;
      debugText += `-------------------------------------------------\n`;
      debugText += `PREGUNTA     : ${question}\n`;
      debugText += `CHUNKS USADOS: Top ${chunks.length}\n=================================================\n\n`;

      chunks.forEach((c, idx) => {
        debugText += `[CHUNK ${idx + 1}] DISTANCIA VECTORIAL: ${c.distance.toFixed(4)}\n`;
        debugText += `(Mientras más cerca a 0.000, más perfecta es la similitud matemática)\n`;
        debugText += `EXTRACTO REAL ENVIADO A LA IA: \n"${c.content}"\n\n`;
      });
      
      try {
        require('fs').writeFileSync('rag_ultimo_diagnostico.txt', debugText);
      } catch (e) {}

      // 5. Chain de Respuesta (Prompt Engineering)
      const baseSystemPrompt = config.system_prompt 
        ? config.system_prompt 
        : "Eres un asistente corporativo de la plataforma RM3 especializado en acreditación de personal.";
      
      const strictRules = "REGLA ESTRICTA: Responde a la pregunta del usuario utilizando UNICAMENTE la información del contexto proporcionado abajo. Si la información no está presente explícitamente en el contexto, debes decir con cortesía que no cuentas con esa información en los documentos de la plataforma. NO inventes ni asumas datos. Formula tu respuesta en Español.";
      
      const prompt = ChatPromptTemplate.fromMessages([
        ["system", `${baseSystemPrompt}\n\n${strictRules}\n\n--- CONTEXTO ---\n{context}`],
        ["user", "{input}"]
      ]);

      const chain = prompt.pipe(chatModel).pipe(new StringOutputParser());
      const responseText = await chain.invoke({
        context: contextText,
        input: question
      });

      // 6. Registro de métricas de tokens (Estimación de tokens para el tracking asíncrono)
      const inTokens = Math.ceil((contextText.length + question.length) / 4);
      const outTokens = Math.ceil(responseText.length / 4);
      
      this.tokenTracking.trackUsage(
        tenantId, 
        config.llm_provider, 
        config.llm_model, 
        inTokens, 
        outTokens, 
        'chat'
      ); // Llamada asíncrona fire-and-forget

      return {
        message: responseText,
        sources: sources,
      };

    } catch (error) {
      this.logger.error(`Error crítico en RAG Service: ${error.message}`);
      throw error;
    }
  }
}
