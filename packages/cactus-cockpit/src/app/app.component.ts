import { Component, OnInit, Inject } from "@angular/core";

import { Platform } from "@ionic/angular";
import { SplashScreen } from "@ionic-native/splash-screen/ngx";
import { StatusBar } from "@ionic-native/status-bar/ngx";

import { LoggerProvider, Logger } from "@hyperledger/cactus-common";
import { DefaultApi as DefaultApiConsortium } from "@hyperledger/cactus-plugin-web-service-consortium";
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
      title: "Inbox",
      url: "/folder/Inbox",
      icon: "mail",
    },
    {
      title: "Outbox",
      url: "/folder/Outbox",
      icon: "paper-plane",
    },
    {
      title: "Favorites",
      url: "/folder/Favorites",
      icon: "heart",
    },
    {
      title: "Archived",
      url: "/folder/Archived",
      icon: "archive",
    },
    {
      title: "Trash",
      url: "/folder/Trash",
      icon: "trash",
    },
    {
      title: "Spam",
      url: "/folder/Spam",
      icon: "warning",
    },
  ];
  public labels = ["Family", "Friends", "Notes", "Work", "Travel", "Reminders"];

  private readonly logger: Logger;

  constructor(
    private platform: Platform,
    private splashScreen: SplashScreen,
    private statusBar: StatusBar,
    @Inject(CACTUS_API_URL) public readonly cactusApiUrl: string
  ) {
    this.logger = LoggerProvider.getOrCreate({
      label: "app-component",
      level: "debug",
    });
    this.logger.info("Initializing app...");
    this.initializeApp();
  }

  initializeApp() {
    this.platform.ready().then(() => {
      this.statusBar.styleDefault();
      this.splashScreen.hide();
      this.logger.info("App initialized OK. Splashscreen was hidden.");
    });
  }

  ngOnInit() {
    const path = window.location.pathname.split("folder/")[1];
    if (path !== undefined) {
      this.selectedIndex = this.appPages.findIndex(
        (page) => page.title.toLowerCase() === path.toLowerCase()
      );
    }
    this.testApi();
  }

  async testApi(): Promise<void> {
    const configuration = new Configuration({ basePath: this.cactusApiUrl });
    const apiClient = new ApiClient(configuration).extendWith(
      DefaultApiConsortium
    );
    const randomness = Math.random().toString(16);
    const dummyConsortium = {
      configurationEndpoint: "some-host" + randomness,
      id: "some-id" + randomness,
      name: "some-name" + randomness,
      cactusNodes: [
        {
          host: "some-host" + randomness,
          publicKey: "some-fake-public-key" + randomness,
        },
      ],
    };
    const createConsortiumResponse = await apiClient.apiV1PluginsHyperledgerCactusPluginWebServiceConsortiumConsortiumPost(
      dummyConsortium
    );
    const healthCheckResponse = await apiClient.apiV1ApiServerHealthcheckGet();
    this.logger.info(
      `apiV1PluginsHyperledgerCactusPluginWebServiceConsortiumConsortiumPost: `,
      createConsortiumResponse.data
    );
    this.logger.info(
      `apiV1ApiServerHealthcheckGet: `,
      healthCheckResponse.data
    );
  }
}
