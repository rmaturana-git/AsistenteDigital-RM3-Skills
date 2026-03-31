import { Module } from '@nestjs/common';
import { TenantService } from './tenant.service';
import { TenantController } from './tenant.controller';
import { TenantConfigCacheService } from './tenant-config-cache.service';

@Module({
  controllers: [TenantController],
  providers: [TenantService, TenantConfigCacheService],
  exports: [TenantConfigCacheService], // Vital exportarlo para que DynamicThrottlerGuard lo inyecte
})
export class TenantModule {}
