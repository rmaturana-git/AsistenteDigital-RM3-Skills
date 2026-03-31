import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTenantDto } from './dto/create-tenant.dto';
import * as crypto from 'crypto';

@Injectable()
export class TenantService {
  private readonly logger = new Logger(TenantService.name);

  constructor(private readonly prisma: PrismaService) {}

  async createTenant(dto: CreateTenantDto) {
    // 1. Emisión de Cripto Llave "Limpia" temporal (formato parecido a 'rm3_axT71h...')
    const rawApiKey = `rm3_${crypto.randomBytes(24).toString('hex')}`;
    
    // 2. Transmutar en firma SHA-256 de una dirección (Indescifrable en fuga BD)
    const apiHash = crypto.createHash('sha256').update(rawApiKey).digest('hex');

    // 3. Empujar Transaccionalmente a Prisma (Si falla una, aborta ambas inserciones)
    const result = await this.prisma.$transaction(async (tx) => {
      
      const newTenant = await tx.tenant.create({
        data: {
          mandante_code: dto.mandante_code.toUpperCase(),
          proyecto_code: dto.proyecto_code.toUpperCase(),
          nombre: dto.nombre,
          activo: true,
        },
      });

      await tx.tenantConfig.create({
        data: {
          tenant_id: newTenant.id,
          api_key_hash: apiHash,
          llm_provider: dto.llm_provider || 'openai',
          llm_model: dto.llm_model || 'gpt-4o-mini',
          // Temperature, limits y Context Tokens asumen el Default del schema automáticamente
        },
      });

      return newTenant;
    });

    this.logger.log(`Empresa Arrendataria Creada: ${result.nombre}`);

    return {
      message: 'Tenant registrado de forma segura. GUARDE ESTA CREDENCIAL Y NO LA PIERDA.',
      tenant_id: result.id,
      cleartext_api_key: rawApiKey,
    };
  }
}
