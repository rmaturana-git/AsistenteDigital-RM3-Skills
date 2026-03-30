import { CanActivate, ExecutionContext, Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as jwt from 'jsonwebtoken';
import { createHash } from 'crypto';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  private readonly logger = new Logger(ApiKeyGuard.name);

  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const apiKey = request.headers['x-api-key'] as string;
    const authHeader = request.headers['authorization'] as string;

    if (!apiKey) {
      throw new UnauthorizedException('Missing X-API-Key header');
    }
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing or invalid Bearer JWT');
    }

    try {
      // 1. Validar Tenant via API Key (hasheada en BD con SHA256 para indexado rápido)
      const hashedKey = createHash('sha256').update(apiKey).digest('hex');
      
      const config = await this.prisma.tenantConfig.findFirst({
        where: { api_key_hash: hashedKey },
        include: { tenant: true }
      });

      if (!config || !config.tenant.activo) {
        throw new UnauthorizedException('Invalid API Key or Inactive Tenant');
      }

      // 2. Extraer user_id del JWT decodificado (Sin validar firma según MVP)
      const token = authHeader.split(' ')[1];
      const decodedJwt = jwt.decode(token) as { user_id?: string; sub?: string };
      
      const userId = decodedJwt?.user_id || decodedJwt?.sub;
      if (!userId) {
        throw new UnauthorizedException('JWT is missing user identity (user_id / sub)');
      }

      // 3. Inyectar identificación de Tenant y Usuario en el Request unificado
      request.tenant = {
        id: config.tenant_id,
        mandante_code: config.tenant.mandante_code,
        proyecto_code: config.tenant.proyecto_code
      };
      request.user = { id: userId };

      return true;
    } catch (error) {
      this.logger.error(`Authentication failed: ${error.message}`);
      throw new UnauthorizedException('Authentication failed');
    }
  }
}
