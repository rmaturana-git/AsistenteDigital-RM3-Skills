import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TenantConfig } from '@prisma/client';

@Injectable()
export class TenantConfigCacheService implements OnModuleInit {
  private readonly logger = new Logger(TenantConfigCacheService.name);
  private cache = new Map<string, { config: TenantConfig; timestamp: number }>();
  private readonly CACHE_TTL_MS = Number(process.env.CACHE_TTL_MS) || 300000; // 5 min default

  constructor(private readonly prisma: PrismaService) {}

  onModuleInit() {
    this.logger.log(`Inicializado con TTL de Caché: ${this.CACHE_TTL_MS}ms`);
  }

  async getConfig(tenantId: string): Promise<TenantConfig | null> {
    const cached = this.cache.get(tenantId);
    const now = Date.now();

    // Retorna si está en memoria y no expiró
    if (cached && now - cached.timestamp < this.CACHE_TTL_MS) {
      return cached.config;
    }

    // Cache miss - Consultar Base de Datos
    const config = await this.prisma.tenantConfig.findUnique({
      where: { tenant_id: tenantId },
    });

    if (config) {
      this.cache.set(tenantId, { config, timestamp: now });
    }

    return config;
  }

  /** Invalida explícitamente el caché de un tenant (usar en PUT /config) */
  invalidate(tenantId: string) {
    this.cache.delete(tenantId);
    this.logger.debug(`Caché purgado explícitamente para Tenant ${tenantId}`);
  }
}
