import { UserRole } from "@prisma/client";
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength
} from "class-validator";

const USERNAME_REGEX = /^[a-zA-Z0-9._-]+$/;

export class RegisterDto {
  @IsEmail()
  email!: string;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(32)
  @Matches(USERNAME_REGEX, {
    message: "Username may only include letters, numbers, dots, underscores, or hyphens"
  })
  username?: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsOptional()
  @IsString()
  orgName?: string;

  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;
}
