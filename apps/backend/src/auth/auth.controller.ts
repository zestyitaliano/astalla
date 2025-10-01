import { Body, Controller, Get, HttpCode, HttpStatus, Post } from "@nestjs/common";

import { AuthService } from "./auth.service";
import { BasicLoginDto } from "./dto/basic-login.dto";
import { RegisterDto } from "./dto/register.dto";

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get("me")
  getCurrentUser() {
    return this.authService.getCurrentUser();
  }

  @Post("register")
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post("basic-login")
  @HttpCode(HttpStatus.OK)
  basicLogin(@Body() dto: BasicLoginDto) {
    return this.authService.basicLogin(dto);
  }
}
