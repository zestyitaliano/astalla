import { Injectable } from "@nestjs/common";

import { MockIntegrationsService } from "../providers/mock-integrations.service";

@Injectable()
export class AuthService {
  constructor(private readonly integrations: MockIntegrationsService) {}

  getCurrentUser() {
    return this.integrations.getCurrentUser();
  }
}
