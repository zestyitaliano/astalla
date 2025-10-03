import { Module } from "@nestjs/common";

import { EntrataProvider } from "./entrata.provider";
import { Ga4Provider } from "./ga4.provider";
import { GoogleBusinessProvider } from "./gbp.provider";
import { GoogleAdsProvider } from "./google-ads.provider";
import { MockIntegrationsService } from "./mock-integrations.service";
import { WordPressProxyService } from "./wordpress-proxy.service";

@Module({
  providers: [
    MockIntegrationsService,
    EntrataProvider,
    GoogleAdsProvider,
    Ga4Provider,
    GoogleBusinessProvider,
    WordPressProxyService
  ],
  exports: [
    MockIntegrationsService,
    EntrataProvider,
    GoogleAdsProvider,
    Ga4Provider,
    GoogleBusinessProvider,
    WordPressProxyService
  ]
})
export class ProvidersModule {}
