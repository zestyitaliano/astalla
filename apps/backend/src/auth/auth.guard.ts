import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import type { Request } from "express";

import { AuthService, AuthUser } from "./auth.service";

type AuthenticatedRequest = Request & { user?: AuthUser };

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const authorization = request.headers["authorization"] ?? request.headers["Authorization"];

    let headerValue = authorization;

    if (Array.isArray(headerValue)) {
      if (headerValue.length === 0) {
        throw new UnauthorizedException("Missing authorization header");
      }

      headerValue = headerValue[0];
    }

    if (typeof headerValue !== "string") {
      throw new UnauthorizedException("Missing authorization header");
    }

    const token = this.extractToken(headerValue);

    const claims = this.authService.verifyToken(token);
    const user = await this.authService.getUserFromClaims(claims);

    if (!user) {
      throw new UnauthorizedException("Invalid token");
    }

    request.user = user;
    return true;
  }

  private extractToken(headerValue: string): string {
    const [scheme, token] = headerValue.trim().split(/\s+/);

    if (!token || scheme.toLowerCase() !== "bearer") {
      throw new UnauthorizedException("Invalid authorization header");
    }

    const trimmedToken = token.trim();

    if (!trimmedToken) {
      throw new UnauthorizedException("Invalid authorization header");
    }

    return trimmedToken;
  }
}
