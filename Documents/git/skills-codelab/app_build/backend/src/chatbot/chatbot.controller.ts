import { Controller, Post, Body, Req, UseGuards, Res, HttpStatus } from '@nestjs/common';
import { ApiKeyGuard } from '../auth/api-key.guard';
import { RagService } from './rag.service';

@Controller('chatbot')
export class ChatbotController {
  constructor(private readonly ragService: RagService) {}

  @Post('query')
  @UseGuards(ApiKeyGuard)
  async query(
    @Body() body: { query: string; session_id?: string },
    @Req() req: any,
    @Res() res: any,
  ) {
    const { query, session_id } = body;
    const { tenant_id, user_id } = req;

    if (!query || !query.trim()) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        error: 'Query es requerida y no puede estar vacía.',
      });
    }

    try {
      const response = await this.ragService.processChat(
        tenant_id,
        user_id || 'anonymous',
        query.trim(),
        session_id, // Puede ser undefined si es la primera interacción
      );

      return res.status(HttpStatus.OK).json({
        session_id: response.session_id, // Frontend debe persistir esto
        respuesta: response.message,
        fuentes: response.sources,
      });
    } catch (error) {
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        error: 'Error interno al procesar la consulta de RAG.',
        detalles: error.message,
      });
    }
  }
}
