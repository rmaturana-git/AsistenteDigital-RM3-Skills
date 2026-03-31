import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { TenantModule } from './tenant/tenant.module';
import { ThrottlerModule } from '@nestjs/throttler';

@Module({
  imports: [
    PrismaModule,
    TenantModule,
    ThrottlerModule.forRoot([{
      ttl: Number(process.env.THROTTLE_TTL_MS) || 60000,
      limit: Number(process.env.THROTTLE_USER_LIMIT) || 30, // Patrón global fallback exigido por la librería aunque lo subroguemos dinámicamente
    }]),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
