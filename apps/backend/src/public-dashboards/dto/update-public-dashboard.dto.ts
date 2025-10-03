import { IsBoolean, IsOptional, IsString } from "class-validator";

export class UpdatePublicDashboardDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  subdomain?: string;

  @IsOptional()
  @IsString()
  orgId?: string;

  @IsOptional()
  @IsString()
  propertyId?: string | null;

  @IsOptional()
  config?: unknown;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
