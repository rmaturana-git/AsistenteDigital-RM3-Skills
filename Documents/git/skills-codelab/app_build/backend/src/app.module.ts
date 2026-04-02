import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { TenantModule } from './tenant/tenant.module';
import { ThrottlerModule } from '@nestjs/throttler';
import { DocumentsModule } from './documents/documents.module';
import { ChatbotModule } from './chatbot/chatbot.module';

@Module({
  imports: [
    PrismaModule,
    TenantModule,
    DocumentsModule,
    ChatbotModule,
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot([{
      ttl: Number(process.env.THROTTLE_TTL_MS) || 60000,
      limit: Number(process.env.THROTTLE_USER_LIMIT) || 30, // Patrón global fallback
    }]),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
