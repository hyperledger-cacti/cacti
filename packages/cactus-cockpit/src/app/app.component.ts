import { Component, OnInit, Inject } from "@angular/core";

import { Platform } from "@ionic/angular";
import { SplashScreen } from "@ionic-native/splash-screen/ngx";
import { StatusBar } from "@ionic-native/status-bar/ngx";

import { LoggerProvider, Logger } from "@hyperledger/cactus-common";
import { DefaultApi as DefaultApiConsortium } from "@hyperledger/cactus-plugin-consortium-manual";
import { ApiClient, Configuration } from "@hyperledger/cactus-sdk";
import { CACTUS_API_URL } from "src/constants";

@Component({
  selector: "app-root",
  templateUrl: "app.component.html",
  styleUrls: ["app.component.scss"],
})
export class AppComponent implements OnInit {
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
    private platform: Platform,
    private splashScreen: SplashScreen,
    private statusBar: StatusBar,
    @Inject(CACTUS_API_URL) public readonly cactusApiUrl: string
  ) {
    this.log = LoggerProvider.getOrCreate({
      label: "app-component",
      level: "debug",
    });
    this.log.info("Initializing app...");
    this.initializeApp();
  }

  initializeApp() {
    this.platform.ready().then(() => {
      this.statusBar.styleDefault();
      this.splashScreen.hide();
      this.log.info("App initialized OK. Splashscreen was hidden.");
    });
  }

  ngOnInit() {
    this.testApi();
  }

  async testApi(): Promise<void> {
    const configuration = new Configuration({ basePath: this.cactusApiUrl });
    const apiClient = new ApiClient(configuration).extendWith(
      DefaultApiConsortium
    );
    const res = await apiClient.apiV1PluginsHyperledgerCactusPluginConsortiumManualNodeJwsGet();
    const resHealthCheck = await apiClient.apiV1ApiServerHealthcheckGet();
    this.log.info(`ConsortiumNodeJwtGet`, res.data);
    this.log.info(`ApiServer HealthCheck Get:`, resHealthCheck.data);
  }
}
