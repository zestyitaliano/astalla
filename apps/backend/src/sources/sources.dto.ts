import { IsBoolean, IsEnum, IsNotEmptyObject, IsObject, IsOptional, IsString } from "class-validator";

export enum SourceTypeDto {
  ENTRATA = "ENTRATA",
  GA4 = "GA4",
  ADS = "ADS",
  GBP = "GBP"
}

export class CreateSourceDto {
  @IsString()
  propertyId!: string;

  @IsEnum(SourceTypeDto)
  type!: SourceTypeDto;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsObject()
  @IsNotEmptyObject()
  credential!: Record<string, unknown>;
}

export class UpdateSourceDto {
  @IsOptional()
  @IsString()
  propertyId?: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsObject()
  @IsNotEmptyObject()
  credential?: Record<string, unknown>;
}

export type CredentialPayload = Record<string, unknown>;
