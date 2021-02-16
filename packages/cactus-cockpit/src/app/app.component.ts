import { Component, Inject } from "@angular/core";

import { Platform } from "@ionic/angular";
import { SplashScreen } from "@ionic-native/splash-screen/ngx";
import { StatusBar } from "@ionic-native/status-bar/ngx";

import { LoggerProvider, Logger } from "@hyperledger/cactus-common";
import {
  DefaultApi as DefaultApiConsortium,
  Configuration,
} from "@hyperledger/cactus-plugin-consortium-manual";
import { ApiClient } from "@hyperledger/cactus-api-client";
import { OidcSecurityService } from "angular-auth-oidc-client";
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
    public readonly oidcSecurityService: OidcSecurityService,
    @Inject(CACTUS_API_URL) public readonly cactusApiUrl: string,
  ) {
    this.log = LoggerProvider.getOrCreate({
      label: "app-component",
      level: "debug",
    });
    this.log.info("Initializing app...");
    this.initializeApp();
  }

  login() {
    this.oidcSecurityService.authorize();
  }

  logout() {
    this.oidcSecurityService.logoff();
  }

  initializeApp() {
    this.platform.ready().then(() => {
      this.statusBar.styleDefault();
      this.splashScreen.hide();
      this.log.info("App initialized OK. Splashscreen was hidden.");
    });
  }

  ngOnInit() {
    this.oidcSecurityService
      .checkAuth()
      .subscribe((isAuthenticated: boolean) => {
        this.log.info("isAuthenticated=", isAuthenticated);
        if (!isAuthenticated) {
          this.log.info("Starting authentication process...");
          this.login();
        } else {
          this.log.info("Already logged in, skipped authentication process.");
          const token = this.oidcSecurityService.getToken();
          this.log.info(`AccessToken:`, token);
        }
      });

    const path = window.location.pathname.split("folder/")[1];
    if (path !== undefined) {
      this.selectedIndex = this.appPages.findIndex(
        (page) => page.title.toLowerCase() === path.toLowerCase(),
      );
    }
    this.testApi();
  }

  async testApi(): Promise<void> {
    const configuration = new Configuration({ basePath: this.cactusApiUrl });
    const apiClient = new ApiClient(configuration).extendWith(
      DefaultApiConsortium,
    );
    const res = await apiClient.getNodeJws();
    this.log.info(`ConsortiumNodeJwtGet`, res.data);
  }
}
