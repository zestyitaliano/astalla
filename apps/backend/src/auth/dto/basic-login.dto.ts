import { IsString, MinLength } from "class-validator";

export class BasicLoginDto {
  @IsString()
  @MinLength(1)
  identifier!: string;

  @IsString()
  @MinLength(1)
  password!: string;
}
