import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LlmFactoryService } from './llm-factory.service';
import { TokenTrackingService } from './token-tracking.service';
import { TenantConfigCacheService } from '../tenant/tenant-config-cache.service';
import { ChatPromptTemplate, MessagesPlaceholder } from '@langchain/core/prompts';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { HumanMessage, AIMessage } from '@langchain/core/messages';

// Cuántos mensajes previos (pares user/assistant) se inyectan al LLM como contexto histórico.
const HISTORY_WINDOW = 6; // 3 pares de mensajes = 6 registros

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
   * Recupera o crea una sesión de chat para el par (tenantId, userId).
   * Si se provee un sessionId válido y pertenece al tenant, se reutiliza.
   * De lo contrario, se crea una sesión nueva.
   */
  private async findOrCreateSession(tenantId: string, userId: string, sessionId?: string): Promise<string> {
    if (sessionId) {
      const existing = await this.prisma.chatSession.findFirst({
        where: { id: sessionId, tenant_id: tenantId },
        select: { id: true },
      });
      if (existing) {
        this.logger.debug(`Reutilizando sesión existente: ${sessionId}`);
        return existing.id;
      }
    }

    // Crear sesión nueva si no existe o el ID no es válido para este tenant
    const newSession = await this.prisma.chatSession.create({
      data: { tenant_id: tenantId, user_id: userId },
      select: { id: true },
    });
    this.logger.log(`Nueva sesión creada: ${newSession.id} para tenant ${tenantId}`);
    return newSession.id;
  }

  /**
   * Carga los últimos N mensajes de una sesión y los convierte en
   * objetos LangChain (HumanMessage / AIMessage) para el MessagesPlaceholder.
   */
  private async loadHistory(sessionId: string): Promise<(HumanMessage | AIMessage)[]> {
    const records = await this.prisma.chatMessage.findMany({
      where: { session_id: sessionId },
      orderBy: { created_at: 'desc' },
      take: HISTORY_WINDOW,
      select: { role: true, content: true },
    });

    // Invertir para orden cronológico correcto
    return records.reverse().map(r =>
      r.role === 'user' ? new HumanMessage(r.content) : new AIMessage(r.content),
    );
  }

  /**
   * Flujo Central de RAG con Búsqueda Vectorial por pgvector,
   * Aislamiento de Tenant y Memoria de Conversación (RF-04).
   */
  async processChat(tenantId: string, userId: string, question: string, sessionId?: string) {
    this.logger.log(`Procesando consulta RAG para tenant ${tenantId}. Pregunta: "${question}"`);

    try {
      // 1. Resolver sesión activa (find-or-create)
      const activeSessionId = await this.findOrCreateSession(tenantId, userId, sessionId);

      // 2. Persistir el mensaje del usuario ANTES de invocar el LLM
      await this.prisma.chatMessage.create({
        data: { session_id: activeSessionId, role: 'user', content: question },
      });

      // 3. Obtener la configuración del Tenant y el modelo
      const config = await this.configCache.getConfig(tenantId);
      if (!config) throw new Error(`Configuración no encontrada para tenant ${tenantId}`);

      const chatModel = this.llmFactory.createChatModel(config);
      const embeddingModel = this.llmFactory.createEmbeddingModel();

      // 4. Generar embedding de la pregunta
      const queryVector = await embeddingModel.embedQuery(question);

      // 5. Búsqueda Vectorial en pgvector vía Prisma (SQL raw por mayor control)
      const chunks: any[] = await this.prisma.$queryRaw`
        SELECT dc.contenido_texto as content, d.titulo as source_title, (dc.embedding <=> ${queryVector}::vector) as distance
        FROM "document_chunks" dc
        JOIN "documents" d ON dc.document_id = d.id
        WHERE dc.tenant_id = ${tenantId}::uuid
        ORDER BY distance ASC
        LIMIT 5;
      `;

      // 6. Cargar historial previo de la sesión para el MessagesPlaceholder
      const chatHistory = await this.loadHistory(activeSessionId);
      // El historial incluye el mensaje del usuario recién guardado, así que lo removemos
      // del final para evitar duplicarlo (LangChain lo agregará vía {input})
      const historyForPrompt = chatHistory.slice(0, -1);

      // 7. Preparar contexto RAG (puede estar vacío si no hay chunks relevantes)
      // IMPORTANTE: Aunque no haya chunks, el LLM SIEMPRE se invoca para que pueda
      // responder preguntas de seguimiento usando el historial conversacional.
      const hasDocs = chunks.length > 0;
      const contextText = hasDocs
        ? chunks.map(c => c.content).join('\n\n--- SEGMENTO ---\n\n')
        : '';
      const sources = hasDocs
        ? Array.from(new Set(chunks.map(c => c.source_title || 'Documento en Base de Datos')))
        : [];

      // --- LOG DEBUG: Diagnóstico Vectorial Físico ---
      const fechaActual = new Date().toLocaleString('es-ES');
      let debugText = `================ DIAGNÓSTICO RAG ================\n`;
      debugText += `FECHA Y HORA : ${fechaActual}\n`;
      debugText += `TENANT ID    : ${tenantId}\n`;
      debugText += `SESSION ID   : ${activeSessionId}\n`;
      debugText += `MODO         : ${hasDocs ? 'RAG + Historial' : 'Solo Historial (sin chunks)'}\n`;
      debugText += `ARCHIVOS     : ${hasDocs ? sources.join(', ') : 'N/A - pregunta de seguimiento'}\n`;
      debugText += `HISTORIAL    : ${historyForPrompt.length} mensajes previos cargados\n`;
      debugText += `-------------------------------------------------\n`;
      debugText += `PREGUNTA     : ${question}\n`;
      debugText += `CHUNKS USADOS: ${chunks.length}\n=================================================\n\n`;

      chunks.forEach((c, idx) => {
        debugText += `[CHUNK ${idx + 1}] DISTANCIA VECTORIAL: ${c.distance.toFixed(4)}\n`;
        debugText += `(Mientras más cerca a 0.000, más perfecta es la similitud matemática)\n`;
        debugText += `EXTRACTO REAL ENVIADO A LA IA: \n"${c.content}"\n\n`;
      });

      try {
        require('fs').writeFileSync('rag_ultimo_diagnostico.txt', debugText);
      } catch (e) {}

      // 8. Construir el system prompt adaptado al modo (con o sin contexto RAG)
      const baseSystemPrompt = config.system_prompt
        ? config.system_prompt
        : 'Eres un asistente corporativo de la plataforma RM3 especializado en acreditación de personal.';

      const strictRules = hasDocs
        ? 'REGLA ESTRICTA: Responde a la pregunta del usuario utilizando UNICAMENTE la información del contexto proporcionado abajo. ' +
          'Si la información no está presente explícitamente en el contexto, debes decir con cortesía que no cuentas con esa información en los documentos de la plataforma. ' +
          'Puedes usar el historial de conversación para entender referencias como "eso que me dijiste antes" o "cuánto tiempo es eso". ' +
          'NO inventes ni asumas datos. Formula tu respuesta en Español.'
        : 'No encontraste documentos relevantes para esta pregunta específica. ' +
          'Sin embargo, puedes responder ÚNICAMENTE si la respuesta se puede deducir claramente del historial de conversación anterior. ' +
          'Si no puedes responderla con el historial, indícalo con cortesía pero SIN decir que no tienes documentos (ya lo sabe). ' +
          'NO inventes datos. Formula tu respuesta en Español.';

      const contextBlock = hasDocs
        ? `\n\n--- CONTEXTO RAG ---\n${contextText}`
        : '';

      const prompt = ChatPromptTemplate.fromMessages([
        ['system', `${baseSystemPrompt}\n\n${strictRules}${contextBlock}`],
        new MessagesPlaceholder('chat_history'),
        ['human', '{input}'],
      ]);

      // 9. Invocar el LLM siempre — con o sin chunks — para aprovechar el historial
      const chain = prompt.pipe(chatModel).pipe(new StringOutputParser());
      const responseText = await chain.invoke({
        context: contextText,
        chat_history: historyForPrompt,
        input: question,
      });

      // 10. Registro de métricas de tokens (asíncrono, fire-and-forget)
      const inTokens = Math.ceil((contextText.length + question.length) / 4);
      const outTokens = Math.ceil(responseText.length / 4);
      this.tokenTracking.trackUsage(tenantId, config.llm_provider, config.llm_model, inTokens, outTokens, 'chat');

      // 11. Persistir respuesta del asistente con las fuentes citadas
      await this.prisma.chatMessage.create({
        data: {
          session_id: activeSessionId,
          role: 'assistant',
          content: responseText,
          sources: sources as any,
        },
      });

      return {
        session_id: activeSessionId,
        message: responseText,
        sources,
      };

    } catch (error) {
      this.logger.error(`Error crítico en RAG Service: ${error.message}`, error.stack);
      throw error;
    }
  }
}
