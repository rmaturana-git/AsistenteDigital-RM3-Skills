import { Module } from '@nestjs/common';
import { ChatbotController } from './chatbot.controller';
import { RagService } from './rag.service';
import { LlmFactoryService } from './llm-factory.service';
import { TokenTrackingService } from './token-tracking.service';
import { PrismaModule } from '../prisma/prisma.module';
import { TenantModule } from '../tenant/tenant.module';
import { ApiKeyGuard } from '../auth/api-key.guard';

@Module({
  imports: [PrismaModule, TenantModule],
  controllers: [ChatbotController],
  providers: [
    RagService,
    LlmFactoryService,
    TokenTrackingService,
    ApiKeyGuard,
  ],
  exports: [RagService],
})
export class ChatbotModule {}
