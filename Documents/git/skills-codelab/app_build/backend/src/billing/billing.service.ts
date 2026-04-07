import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getUsageReport(startDate?: Date, endDate?: Date) {
    this.logger.log(`Obteniendo reporte de consumo. Fechas: ${startDate} - ${endDate}`);

    // Filtros de fecha si se proveen
    const whereClause: any = {};
    if (startDate || endDate) {
      whereClause.created_at = {};
      if (startDate) {
        whereClause.created_at.gte = startDate;
      }
      if (endDate) {
        whereClause.created_at.lte = endDate;
      }
    }

    // A nivel de Prisma, obtener todo aglomerado sería manual para agrupar nombre.
    // Usaremos un groupBy y luego enriqueceremos con el nombre del tenant
    const groupedUsage = await this.prisma.tokenUsage.groupBy({
      by: ['tenant_id'],
      _sum: {
        tokens_total: true,
      },
      where: whereClause,
    });

    // Enriquecer con el nombre del Tenant
    const by_tenant = await Promise.all(
      groupedUsage.map(async (group) => {
        const tenant = await this.prisma.tenant.findUnique({
          where: { id: group.tenant_id },
          select: { nombre: true },
        });

        return {
          tenant_nombre: tenant?.nombre || 'Desconocido',
          tokens_total: group._sum.tokens_total || 0,
        };
      })
    );

    const total_tokens = by_tenant.reduce((acc, curr) => acc + curr.tokens_total, 0);

    const by_tenant_enriched = by_tenant.map(t => ({
      ...t,
      usage_percentage: total_tokens > 0 ? Number(((t.tokens_total / total_tokens) * 100).toFixed(2)) : 0
    }));

    return {
      total_tokens,
      by_tenant: by_tenant_enriched,
    };
  }
}
