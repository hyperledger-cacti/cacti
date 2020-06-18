import "@angular/compiler";
import { NgModule, APP_INITIALIZER, InjectionToken } from "@angular/core";

import { HttpClientModule } from "@angular/common/http";
import { BrowserModule } from "@angular/platform-browser";
import { RouteReuseStrategy } from "@angular/router";

import { IonicModule, IonicRouteStrategy } from "@ionic/angular";
import { SplashScreen } from "@ionic-native/splash-screen/ngx";
import { StatusBar } from "@ionic-native/status-bar/ngx";

import { AppComponent } from "./app.component";
import { AppRoutingModule } from "./app-routing.module";
import { Logger, LoggerProvider } from "@hyperledger/cactus-common";
import { CACTUS_API_URL } from "src/constants";

LoggerProvider.setLogLevel("TRACE");

const log: Logger = LoggerProvider.getOrCreate({ label: "app-module" });

log.debug("Running AppModule...");
const cactusApiUrl = location.origin;
log.debug("CACTUS_API_URL=%o", cactusApiUrl);

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
  ],
  bootstrap: [AppComponent],
})
export class AppModule {}
