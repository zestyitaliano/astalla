import { Body, Controller, Get, Headers, HttpCode, HttpStatus, Post } from "@nestjs/common";

import { AuthService } from "./auth.service";
import { BasicLoginDto } from "./dto/basic-login.dto";
import { RegisterDto } from "./dto/register.dto";

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get("me")
  getCurrentUser(@Headers("x-mock-mode") mockHeader?: string) {
    return this.authService.getCurrentUser(this.shouldUseMock(mockHeader));
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

  private shouldUseMock(header?: string) {
    return header?.toLowerCase() === "true";
  }
}
