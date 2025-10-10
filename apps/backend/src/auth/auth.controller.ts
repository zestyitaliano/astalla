import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpException,
  HttpStatus,
  Logger,
  Post,
  Req,
  UseGuards
} from "@nestjs/common";
import type { Request } from "express";

import { AuthGuard } from "./auth.guard";
import { AuthService, AuthUser } from "./auth.service";
import { LoginDto } from "./dto/login.dto";
import { RegisterDto } from "./dto/register.dto";

type AuthenticatedRequest = Request & { user?: AuthUser };

@Controller("auth")
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(private readonly authService: AuthService) {}

  @Get("health")
  health() {
    return { ok: true };
  }

  @Post("register")
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post("basic-login")
  @HttpCode(HttpStatus.OK)
  async basicLogin(@Body() dto: LoginDto) {
    const identifier = typeof dto.identifier === "string" ? dto.identifier : undefined;
    const maskedEmail = maskEmail(identifier);
    const normalizedIdentifier = identifier?.trim();

    if (!normalizedIdentifier) {
      const error = new BadRequestException("identifier is required");
      this.logger.warn(`basic-login status=${error.getStatus()} email=${maskedEmail}`);
      throw error;
    }

    try {
      const result = await this.authService.login({ ...dto, identifier: normalizedIdentifier });
      this.logger.log(`basic-login status=200 email=${maskedEmail}`);
      return result;
    } catch (error) {
      const status =
        error instanceof HttpException ? error.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
      this.logger.log(`basic-login status=${status} email=${maskedEmail}`);
      throw error;
    }
  }

  @Get("me")
  @UseGuards(AuthGuard)
  getCurrentUser(@Req() req: AuthenticatedRequest) {
    return req.user;
  }
}

const MASKED_IDENTIFIER_PLACEHOLDER = "***";

function maskEmail(rawIdentifier?: string | null): string {
  if (typeof rawIdentifier !== "string") {
    return MASKED_IDENTIFIER_PLACEHOLDER;
  }

  const trimmed = rawIdentifier.trim().toLowerCase();

  if (!trimmed) {
    return MASKED_IDENTIFIER_PLACEHOLDER;
  }

  const [userPart, domain] = trimmed.split("@");

  if (!domain || !userPart) {
    return MASKED_IDENTIFIER_PLACEHOLDER;
  }

  const first = userPart[0];
  const last = userPart.length > 1 ? userPart[userPart.length - 1] : "";
  return `${first}***${last}@${domain}`;
}
