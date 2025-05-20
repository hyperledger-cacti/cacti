import { NgModule } from "@angular/core";
import { BrowserModule } from "@angular/platform-browser";
import { BrowserAnimationsModule } from "@angular/platform-browser/animations";
import { RouteReuseStrategy } from "@angular/router";
import { HttpClientModule } from "@angular/common/http";
import { IonicModule, IonicRouteStrategy } from "@ionic/angular";
import { SplashScreen } from "@ionic-native/splash-screen/ngx";
import { StatusBar } from "@ionic-native/status-bar/ngx";

import { AppComponent } from "./app.component";
import { AppRoutingModule } from "./app-routing.module";
import { Logger, LoggerProvider } from "@hyperledger/cactus-common";
import { Configuration } from "@hyperledger/cactus-core-api";
import {
  BESU_DEMO_LEDGER_ID,
  CACTUS_API_URL,
  XDAI_BESU_DEMO_LEDGER_ID,
  FABRIC_DEMO_LEDGER_ID,
} from "../constants";
import { ApiClient } from "@hyperledger/cactus-api-client";
import { AuthConfig } from "./common/auth-config";
import { WalletService } from "./common/services/wallet.service";
import { ProductStatusService } from "./common/services/product-status.service";

LoggerProvider.setLogLevel("TRACE");

const log: Logger = LoggerProvider.getOrCreate({ label: "app-module" });

// No token required - skip JWT authentication
log.info("JWT authentication bypassed");

log.info("Running AppModule...");
const cactusApiUrl = location.origin;
log.info("Instantiating ApiClient with CACTUS_API_URL=%o", cactusApiUrl);
const configuration = new Configuration({
  basePath: cactusApiUrl,
  // No authorization header
});
const apiClient = new ApiClient(configuration);

@NgModule({
  declarations: [AppComponent],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    IonicModule.forRoot(),
    AppRoutingModule,
    HttpClientModule,
  ],
  providers: [
    StatusBar,
    SplashScreen,
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
    {
      provide: CACTUS_API_URL,
      useValue: cactusApiUrl,
    },
    {
      provide: XDAI_BESU_DEMO_LEDGER_ID,
      // This has to match the ledger ID defined in supply-chain-app.ts
      useValue: "XdaiBesuDemoLedger",
    },
    {
      provide: BESU_DEMO_LEDGER_ID,
      // This has to match the ledger ID defined in supply-chain-app.ts
      useValue: "BesuDemoLedger",
    },
    {
      provide: FABRIC_DEMO_LEDGER_ID,
      // This has to match the ledger ID defined in supply-chain-app.ts
      useValue: "FabricDemoLedger",
    },
    { provide: ApiClient, useValue: apiClient },
    WalletService,
    ProductStatusService,
  ],
  bootstrap: [AppComponent],
})
export class AppModule {}
