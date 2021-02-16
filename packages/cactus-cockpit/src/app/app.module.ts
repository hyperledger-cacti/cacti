import "@angular/compiler";
import { NgModule } from "@angular/core";

import { BrowserModule } from "@angular/platform-browser";
import { RouteReuseStrategy } from "@angular/router";

import { IonicModule, IonicRouteStrategy } from "@ionic/angular";
import { SplashScreen } from "@ionic-native/splash-screen/ngx";
import { StatusBar } from "@ionic-native/status-bar/ngx";

import {
  AuthModule,
  LogLevel,
  OidcConfigService,
  OpenIdConfiguration,
} from "angular-auth-oidc-client";

import { AppComponent } from "./app.component";
import { AppRoutingModule } from "./app-routing.module";
import { Configuration, ApiClient } from "@hyperledger/cactus-api-client";
import { DefaultApi as ApiConsortium } from "@hyperledger/cactus-plugin-consortium-manual";
import { DefaultApi as ApiOidc } from "@hyperledger/cactus-plugin-web-service-oidc";
import { Logger, LoggerProvider } from "@hyperledger/cactus-common";
import { CACTUS_API_URL } from "src/constants";

LoggerProvider.setLogLevel("TRACE");

const log: Logger = LoggerProvider.getOrCreate({ label: "app-module" });

const cactusApiUrl = location.origin;

export function configureAuth(oidcConfigService: OidcConfigService) {
  return async () => {
    log.debug("Configuring OIDC...");
    const configuration = new Configuration({
      basePath: cactusApiUrl,
    });
    const api = new ApiClient(configuration)
      .extendWith(ApiOidc)
      .extendWith(ApiConsortium);

    const oidcConfigResp: any = await api.apiV1PluginsHyperledgerCactusPluginWebServiceOidcWellKnownOpenidConfigurationGet();
    log.debug("Received .well-known config: ", oidcConfigResp.data);

    const stsServer = `${cactusApiUrl}/api/v1/plugins/@hyperledger/cactus-plugin-web-service-oidc`;

    const config: OpenIdConfiguration = {
      stsServer,
      // authWellknownEndpoint: oidcConfigResp.config.url,
      redirectUrl: window.location.origin,
      postLogoutRedirectUri: window.location.origin,
      clientId: "oauth2-client-cactus-cockpit",
      scope: "openid profile email",
      responseType: "code",
      silentRenew: true,
      silentRenewUrl: `${window.location.origin}/silent-renew.html`,
      logLevel: LogLevel.Debug,
    };
    log.debug("Assembled configuration for client side OIDC lib: ", config);

    const service = await oidcConfigService.withConfig(config);
    log.debug("Configurd OIDC angular service OK", service);

    return service;
  };
}

@NgModule({
  declarations: [AppComponent],
  entryComponents: [],
  imports: [
    BrowserModule,
    IonicModule.forRoot(),
    AppRoutingModule,
    AuthModule.forRoot(),
  ],
  providers: [
    StatusBar,
    SplashScreen,
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
    OidcConfigService,
    {
      provide: APP_INITIALIZER,
      useFactory: configureAuth,
      deps: [OidcConfigService],
      multi: true,
    },
    {
      provide: CACTUS_API_URL,
      useValue: cactusApiUrl,
    },
  ],
  bootstrap: [AppComponent],
})
export class AppModule {}
