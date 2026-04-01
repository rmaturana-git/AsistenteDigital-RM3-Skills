import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as jwt from 'jsonwebtoken';
import * as crypto from 'crypto';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  private readonly logger = new Logger(ApiKeyGuard.name);

  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;
    const xApiKey = request.headers['x-api-key'];

    let apiKey: string | null = null;
    let jwtToken: string | null = null;

    // 1. Prioridad: X-API-Key header
    if (xApiKey) {
      apiKey = Array.isArray(xApiKey) ? xApiKey[0] : xApiKey;
    }

    // 2. Authorization Header (Bearer)
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      // Si parece un JWT (3 partes separadas por puntos), lo tratamos como tal
      if (token.split('.').length === 3) {
        jwtToken = token;
      } else if (!apiKey) {
        // Si no es JWT y no tenemos apiKey aún, asumimos que enviaron la apiKey aquí (compatibilidad frontend)
        apiKey = token;
      }
    }

    // 3. Validación de API Key si existe
    if (apiKey) {
      const hash = crypto.createHash('sha256').update(apiKey).digest('hex');
      const tenantConfig = await this.prisma.tenantConfig.findFirst({
        where: { api_key_hash: hash },
        select: { tenant_id: true },
      });

      if (tenantConfig) {
        request.tenant_id = tenantConfig.tenant_id;
        this.logger.debug(`Tenant identificado vía API Key: ${request.tenant_id}`);
      } else {
        this.logger.warn(`API Key inválida proporcionada: ${apiKey.substring(0, 8)}...`);
        throw new UnauthorizedException('API Key no válida.');
      }
    }

    // 4. Procesamiento de JWT (Decodificación sin validación para el MVP)
    if (jwtToken) {
      try {
        const decoded = jwt.decode(jwtToken) as any;
        if (decoded) {
          request.user_id = decoded.sub || decoded.user_id;
          // Si el JWT trae tenant_id y no lo obtuvimos de la API Key, lo usamos
          if (!request.tenant_id && decoded.tenant_id) {
            request.tenant_id = decoded.tenant_id;
          }
        }
      } catch (err) {
        this.logger.error(`Error al decodificar JWT: ${err.message}`);
      }
    }

    // 5. Verificación final de identidad
    if (!request.tenant_id) {
      this.logger.warn('Petición rechazada: No se pudo identificar el Tenant (Falta API Key o JWT válido).');
      throw new UnauthorizedException('Identificación de Tenant requerida.');
    }

    return true;
  }
}
