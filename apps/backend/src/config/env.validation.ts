import { plainToInstance } from 'class-transformer';
import { IsBooleanString, IsOptional, IsString, validateSync } from 'class-validator';

class EnvironmentVariables {
  @IsString()
  DATABASE_URL!: string;

  @IsString()
  REDIS_URL!: string;

  @IsString()
  JWT_SECRET!: string;

  @IsString()
  FRONTEND_ORIGIN!: string;

  @IsString()
  WP_PROXY_SHARED_SECRET!: string;

  @IsOptional()
  @IsString()
  ENTRATA_API_BASE?: string;

  @IsOptional()
  @IsString()
  ENTRATA_API_KEY?: string;

  @IsOptional()
  @IsString()
  GOOGLE_ADS_DEVELOPER_TOKEN?: string;

  @IsOptional()
  @IsString()
  GA4_MEASUREMENT_ID?: string;

  @IsOptional()
  @IsString()
  GA4_API_SECRET?: string;

  @IsOptional()
  @IsString()
  GBP_API_KEY?: string;

  @IsOptional()
  @IsString()
  ALLOWED_GOOGLE_OAUTH_DOMAINS?: string;

  @IsOptional()
  @IsBooleanString()
  MOCK_MODE?: string;
}

export function validate(config: Record<string, unknown>) {
  const validatedConfig = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validatedConfig, { skipMissingProperties: false });
  if (errors.length > 0) {
    throw new Error(errors.toString());
  }
  return validatedConfig;
}
