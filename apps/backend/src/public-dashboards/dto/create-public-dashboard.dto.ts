import { IsBoolean, IsNotEmpty, IsOptional, IsString } from "class-validator";

export class CreatePublicDashboardDto {
  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsString()
  @IsNotEmpty()
  subdomain!: string;

  @IsString()
  @IsNotEmpty()
  orgId!: string;

  @IsOptional()
  @IsString()
  propertyId?: string;

  @IsOptional()
  config?: unknown;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
