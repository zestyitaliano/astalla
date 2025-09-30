import { Controller, Get, NotFoundException, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from '../common/jwt-auth.guard';
import { CurrentUser } from '../common/user.decorator';

@Controller('auth')
@UseGuards(JwtAuthGuard)
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get('me')
  async me(@CurrentUser() user: any) {
    const profile = await this.authService.getProfile(user.sub);
    if (!profile) {
      throw new NotFoundException('User not found');
    }
    return profile;
  }
}
