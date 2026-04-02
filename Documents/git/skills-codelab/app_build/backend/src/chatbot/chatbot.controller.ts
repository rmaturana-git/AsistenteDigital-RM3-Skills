import { Controller, Post, Body, Req, UseGuards, Res, HttpStatus } from '@nestjs/common';
import { ApiKeyGuard } from '../auth/api-key.guard';
import { RagService } from './rag.service';

@Controller('chatbot')
export class ChatbotController {
  constructor(private readonly ragService: RagService) {}

  @Post('query')
  @UseGuards(ApiKeyGuard)
  async query(@Body() body: { query: string }, @Req() req: any, @Res() res: any) {
    const { query } = body;
    const { tenant_id, user_id } = req;

    if (!query) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        error: 'Query es requerida.',
      });
    }

    try {
      const response = await this.ragService.processChat(tenant_id, user_id || 'anonymous', query);
      return res.status(HttpStatus.OK).json({
        respuesta: response.message,
        fuentes: response.sources,
        tiempo_ms: 0, // Placeholder
      });
    } catch (error) {
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        error: 'Error interno al procesar la consulta de RAG.',
        detalles: error.message,
      });
    }
  }
}
