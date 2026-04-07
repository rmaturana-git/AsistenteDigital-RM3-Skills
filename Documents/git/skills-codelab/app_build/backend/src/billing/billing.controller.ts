import { Controller, Get, Query, Logger } from '@nestjs/common';
import { BillingService } from './billing.service';

@Controller('billing')
export class BillingController {
  private readonly logger = new Logger(BillingController.name);

  constructor(private readonly billingService: BillingService) {}

  @Get('usage/report')
  async getUsageReport(
    @Query('from') fromDate?: string,
    @Query('to') toDate?: string,
  ) {
    this.logger.log(`Solicitud de reporte de uso: desde ${fromDate} hasta ${toDate}`);
    
    // Parseo básico de fechas (yyyy-mm-dd)
    const startDate = fromDate ? new Date(fromDate) : undefined;
    const endDate = toDate ? new Date(toDate) : undefined;

    return this.billingService.getUsageReport(startDate, endDate);
  }
}
