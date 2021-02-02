import { Component, Inject } from "@angular/core";

import { Platform } from "@ionic/angular";
import { SplashScreen } from "@ionic-native/splash-screen/ngx";
import { StatusBar } from "@ionic-native/status-bar/ngx";

import { LoggerProvider, Logger } from "@hyperledger/cactus-common";
import { CACTUS_API_URL } from "src/constants";

@Component({
  selector: "app-root",
  templateUrl: "app.component.html",
  styleUrls: ["app.component.scss"],
})
export class AppComponent {
  public selectedIndex = 0;
  public appPages = [
    {
      title: "Consortiums",
      url: "/consortiums-inspector",
      icon: "color-filter",
    },
  ];

  private readonly log: Logger;

  constructor(
    private readonly platform: Platform,
    private readonly splashScreen: SplashScreen,
    private readonly statusBar: StatusBar,
    @Inject(CACTUS_API_URL) public readonly cactusApiUrl: string,
  ) {
    this.log = LoggerProvider.getOrCreate({
      label: "app-component",
      level: "debug",
    });
    this.log.info("Initializing app...");
    this.initializeApp();
  }

  initializeApp(): void {
    this.platform.ready().then(() => {
      this.statusBar.styleDefault();
      this.splashScreen.hide();
      this.log.info("App initialized OK. Splashscreen was hidden.");
    });
  }
}
