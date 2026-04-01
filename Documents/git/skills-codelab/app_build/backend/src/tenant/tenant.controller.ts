import { Controller, Post, Body, Get, Put, Param } from '@nestjs/common';
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

  @Get()
  async getAllTenants() {
    return this.tenantService.findAll();
  }

  @Get(':id')
  async getTenant(@Param('id') id: string) {
    return this.tenantService.findOne(id);
  }

  @Get(':id/config')
  async getTenantConfig(@Param('id') id: string) {
    return this.tenantService.getConfig(id);
  }

  @Put(':id/config')
  async updateTenantConfig(@Param('id') id: string, @Body() configData: any) {
    return this.tenantService.updateConfig(id, configData);
  }

  @Post(':id/regenerate-api-key')
  async regenerateApiKey(@Param('id') id: string) {
    return this.tenantService.regenerateApiKey(id);
  }
}
