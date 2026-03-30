import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TokenTrackingService {
  private readonly logger = new Logger(TokenTrackingService.name);

  constructor(private readonly prisma: PrismaService) {}

  /** 
   * Fire-and-forget: El guardado se suelta a base de datos de manera
   * asíncrona para no detener sub-segundos del tiempo de respuesta del chatbot al cliente.
   */
  async trackUsage(
    tenantId: string,
    provider: string,
    model: string,
    inTokens: number,
    outTokens: number,
    operationType: 'chat' | 'embedding' = 'chat',
  ) {
    try {
      await this.prisma.tokenUsage.create({
        data: {
          tenant_id: tenantId,
          llm_provider: provider,
          llm_model: model,
          tokens_input: inTokens || 0,
          tokens_output: outTokens || 0,
          tokens_total: (inTokens || 0) + (outTokens || 0),
          operation_type: operationType,
        },
      });

      this.logger.debug(
        `✓ Interceptación -> Tokens ${provider.toUpperCase()}: Env ${inTokens} + Rec ${outTokens} = ${inTokens + outTokens} (Tenant: ${tenantId})`
      );
    } catch (e) {
      this.logger.error(`Error Tracking de Tokens (Tenant ${tenantId})`, e.stack);
    }
  }
}
