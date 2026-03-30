import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LlmFactoryService } from './llm-factory.service';
import { TokenTrackingService } from './token-tracking.service';
import { TenantConfigCacheService } from '../tenant/tenant-config-cache.service';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { ChatPromptTemplate } from '@langchain/core/prompts';

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
    // 1. Obtener Instancias (de Cached settings)
    const config = await this.configCache.getConfig(tenantId);
    if (!config) throw new Error('Configuración de Tenant Extraviada o Corrupta');

    const chatModel = this.llmFactory.createChatModel(config);
    const embeddingModel = this.llmFactory.createEmbeddingModel();

    // 2. Vectorizar la consulta de Entrada
    const questionEmbeddingBytes = await embeddingModel.embedQuery(question);
    
    // Transformar a un array compatible stringificado [x, y, z...] para PgVector (1536 dimensiones)
    const vectorString = `[${questionEmbeddingBytes.join(',')}]`;

    // 3. Similaridad Coseno contra Document_Chunks
    // Utilizando $queryRaw en Prisma nos permite usar <=> directo de la Extensión Vectorial de PSQL
    const searchResult: any[] = await this.prisma.$queryRaw`
      SELECT 
        dc.id, dc.contenido_texto, d.titulo,
        1 - (dc.embedding <=> ${vectorString}::vector) as similarity
      FROM document_chunks dc
      JOIN documents d ON dc.document_id = d.id
      WHERE dc.tenant_id = ${tenantId}::uuid AND d.status = 'ready'
      ORDER BY dc.embedding <=> ${vectorString}::vector
      LIMIT 5
    `;

    // 4. Inyección del Contexto RAG y armado del System Prompt Forzado a Español Fuerte
    const contextText = searchResult
      .map((doc) => `[Fuente: ${doc.titulo}]\n${doc.contenido_texto}`)
      .join('\n\n');

    const prompt = ChatPromptTemplate.fromMessages([
      [
        'system',
        `Eres el asistente oficial de procesos normativos del Sistema RM3 de acreditación empresarial. 
        Responde la duda del usuario basándote ESTRICTA Y ÚNICAMENTE en este contenido contextual normativo extraído de documentos de políticas. 
        Si el contexto carece de la información para responder con exactitud o seguridad, simplemente dilo para no alucinar. 
        INSTRUCCIÓN OBLIGATORIA INDEFECTIBLE: Responderás el 100% de la conversación utilizando de manera exclusiva idioma ESPAÑOL NEUTRO CHILENO, indistintamente del idioma de los documentos o de la pregunta.

        \n\n=== CONTEXTO NORMATIVO ENCONTRADO ===\n{context}`,
      ],
      ['human', '{question}'],
    ]);

    // 5. Cadena "Chain" Estándar LCEL de LangChain (Prompt -> Componente LLM Dinámico -> Casteo Mero a String)
    const chain = prompt.pipe(chatModel).pipe(new StringOutputParser());

    let inTokens = 0;
    let outTokens = 0;

    // 6. Disparar Petición invocada, espiando y sustrayendo usage al vuelo
    const responseText = await chain.invoke(
      { context: contextText, question: question },
      { 
        callbacks: [
          {
            handleLLMEnd: async (output) => {
              // Providers como OpenAI/Google inyectan tokenUsage en el objeto llmOutput
              const usage = output.llmOutput?.tokenUsage || output.llmOutput?.estimatedTokenUsage;
              if (usage) {
                inTokens = usage.promptTokens || 0;
                outTokens = usage.completionTokens || 0;
              }
            }
          }
        ]
      }
    );

    // 7. Liberar evento asíncrono hacia el Tracking de Facturación
    this.tokenTracking.trackUsage(tenantId, config.llm_provider, config.llm_model, inTokens, outTokens, 'chat');

    // 8. Deduplicar títulos consultados para agregarlos como Citas (Citations)
    const distinctSources = Array.from(new Set(searchResult.map(s => s.titulo)));

    return {
      message: responseText,
      sources: distinctSources,
    };
  }
}
