import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import jwt from 'jsonwebtoken';
import { AppRole, ROLE_HIERARCHY } from './roles';
import { ROLES_KEY } from './roles.decorator';

export interface JwtPayload {
  sub: string;
  email: string;
  role: AppRole;
  orgId: string;
  propertyIds?: string[];
}

export type AuthenticatedUser = JwtPayload;

interface RequestWithUser {
  headers: {
    authorization?: string;
  };
  user?: AuthenticatedUser;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly config: ConfigService, private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const token = this.extractToken(request);
    if (!token) {
      throw new UnauthorizedException('Missing token');
    }

    try {
      const payload = jwt.verify(token, this.config.get<string>('JWT_SECRET', '')) as JwtPayload;
      request.user = payload;
      const requiredRoles = this.reflector.getAllAndOverride<AppRole[]>(ROLES_KEY, [
        context.getHandler(),
        context.getClass(),
      ]);

      if (!requiredRoles || requiredRoles.length === 0) {
        return true;
      }

      const permitted = ROLE_HIERARCHY[payload.role] ?? [];
      return requiredRoles.some((role) => permitted.includes(role));
    } catch {
      throw new UnauthorizedException('Invalid token');
    }
  }

  private extractToken(request: RequestWithUser) {
    const auth = request.headers.authorization;
    if (!auth) return null;
    const [type, value] = auth.split(' ');
    if (type !== 'Bearer') return null;
    return value;
  }
}
