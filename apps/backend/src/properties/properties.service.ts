import { Injectable } from "@nestjs/common";

import { MockIntegrationsService } from "../providers/mock-integrations.service";

@Injectable()
export class PropertiesService {
  constructor(private readonly integrations: MockIntegrationsService) {}

  list() {
    return this.integrations.getProperties();
  }
}
