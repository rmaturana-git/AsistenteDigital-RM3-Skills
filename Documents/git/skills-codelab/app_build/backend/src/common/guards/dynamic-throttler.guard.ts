import { ExecutionContext, Injectable } from '@nestjs/common';
import { ThrottlerGuard, ThrottlerException } from '@nestjs/throttler';
import { TenantConfigCacheService } from '../../tenant/tenant-config-cache.service';

@Injectable()
export class DynamicThrottlerGuard extends ThrottlerGuard {
  // Nota: en NestJS el guard es instanciado univaluadamente.
  // Obtendremos nuestro servicio de caché desde el contenedor de aplicación al vuelo.

  protected async handleRequest(
    context: ExecutionContext,
    limit: number,
    ttl: number,
    throttler: any,
  ): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const tenantId = req.tenant?.id;
    const userId = req.user?.id;

    // Si aún no pasó por el ApiKeyGuard o falló, omitimos aquí (el Guard fallará de todas formas)
    if (!tenantId || !userId) {
      return true;
    }

    // Resolviendo la dependencia de nuestro Cache de Configuración
    const tenantCache: TenantConfigCacheService = context
      .switchToHttp()
      .getRequest()
      .res.req.app?.get(TenantConfigCacheService);

    let userLimit = Number(process.env.THROTTLE_USER_LIMIT) || 30;
    let tenantLimit = Number(process.env.THROTTLE_TENANT_LIMIT) || 200;

    if (tenantCache) {
      const config = await tenantCache.getConfig(tenantId);
      if (config) {
        userLimit = config.rate_limit_user;
        tenantLimit = config.rate_limit_tenant;
      }
    }

    /* 
      1. Evaluación Independiente de Límite de Usuario
      2. Evaluación Independiente de Límite Global del Tenant
    */

    const userKey = this.generateKey(context, `${tenantId}:user:${userId}`, throttler.name);
    const tenantKey = this.generateKey(context, `tenant:${tenantId}`, throttler.name);

    const { totalHits: userHits } = await this.storageService.increment(userKey, ttl, userLimit, 0, throttler.name);
    if (userHits > userLimit) {
      throw new ThrottlerException('Límite de peticiones por usuario excedido (429)');
    }

    const { totalHits: tenantHits } = await this.storageService.increment(tenantKey, ttl, tenantLimit, 0, throttler.name);
    if (tenantHits > tenantLimit) {
      throw new ThrottlerException('Límite de peticiones del tenant bloqueado para evitar abuso (429)');
    }

    return true;
  }
}
