import { Controller, Post, Body } from '@nestjs/common';
import { TenantService } from './tenant.service';
import { CreateTenantDto } from './dto/create-tenant.dto';

// Nota sobre MVP: Este control queda expuesto intencionalmente. (En prod iría bajo un @UseGuards(AdminRole)).
@Controller('tenants')
export class TenantController {
  constructor(private readonly tenantService: TenantService) {}

  @Post()
  async registerTenant(@Body() dto: CreateTenantDto) {
    return this.tenantService.createTenant(dto);
  }
}
