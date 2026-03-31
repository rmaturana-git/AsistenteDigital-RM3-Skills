import { IsString, IsNotEmpty, IsOptional, MaxLength } from 'class-validator';

export class CreateTenantDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  mandante_code: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  proyecto_code: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  nombre: string;

  @IsString()
  @IsOptional()
  llm_provider?: string;

  @IsString()
  @IsOptional()
  llm_model?: string;
}
