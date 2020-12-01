import { NgModule } from "@angular/core";
import { BrowserModule } from "@angular/platform-browser";
import { RouteReuseStrategy } from "@angular/router";

import { IonicModule, IonicRouteStrategy } from "@ionic/angular";
import { SplashScreen } from "@ionic-native/splash-screen/ngx";
import { StatusBar } from "@ionic-native/status-bar/ngx";

import { AppComponent } from "./app.component";
import { AppRoutingModule } from "./app-routing.module";
import { Logger, LoggerProvider } from "@hyperledger/cactus-common";
import {
  BESU_DEMO_LEDGER_ID,
  CACTUS_API_URL,
  QUORUM_DEMO_LEDGER_ID,
} from "src/constants";
import { ApiClient } from "@hyperledger/cactus-api-client";

LoggerProvider.setLogLevel("TRACE");

const log: Logger = LoggerProvider.getOrCreate({ label: "app-module" });

log.info("Running AppModule...");
const cactusApiUrl = location.origin;
log.info("Instantiating ApiClient with CACTUS_API_URL=%o", cactusApiUrl);
const apiClient = new ApiClient({ basePath: cactusApiUrl });

@NgModule({
  declarations: [AppComponent],
  entryComponents: [],
  imports: [BrowserModule, IonicModule.forRoot(), AppRoutingModule],
  providers: [
    StatusBar,
    SplashScreen,
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
    {
      provide: CACTUS_API_URL,
      useValue: cactusApiUrl,
    },
    {
      provide: QUORUM_DEMO_LEDGER_ID,
      // This has to match the ledger ID defined in supply-chain-app.ts
      useValue: "QuorumDemoLedger",
    },
    {
      provide: BESU_DEMO_LEDGER_ID,
      // This has to match the ledger ID defined in supply-chain-app.ts
      useValue: "BesuDemoLedger",
    },
    { provide: ApiClient, useValue: apiClient },
  ],
  bootstrap: [AppComponent],
})
export class AppModule {}
