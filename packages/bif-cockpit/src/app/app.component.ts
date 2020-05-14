import { Component, OnInit } from '@angular/core';

import { Platform } from '@ionic/angular';
import { SplashScreen } from '@ionic-native/splash-screen/ngx';
import { StatusBar } from '@ionic-native/status-bar/ngx';

import { LoggerProvider, Logger } from '@hyperledger-labs/bif-common';
import { DefaultApi, Configuration } from '@hyperledger-labs/bif-sdk';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss']
})
export class AppComponent implements OnInit {
  public selectedIndex = 0;
  public appPages = [
    {
      title: 'Inbox',
      url: '/folder/Inbox',
      icon: 'mail'
    },
    {
      title: 'Outbox',
      url: '/folder/Outbox',
      icon: 'paper-plane'
    },
    {
      title: 'Favorites',
      url: '/folder/Favorites',
      icon: 'heart'
    },
    {
      title: 'Archived',
      url: '/folder/Archived',
      icon: 'archive'
    },
    {
      title: 'Trash',
      url: '/folder/Trash',
      icon: 'trash'
    },
    {
      title: 'Spam',
      url: '/folder/Spam',
      icon: 'warning'
    }
  ];
  public labels = ['Family', 'Friends', 'Notes', 'Work', 'Travel', 'Reminders'];

  private readonly logger: Logger;

  constructor(
    private platform: Platform,
    private splashScreen: SplashScreen,
    private statusBar: StatusBar
  ) {
    this.logger = LoggerProvider.getOrCreate({ label: 'app-component', level: 'debug' });
    this.logger.info('Initializing app...');
    this.initializeApp();
  }

  initializeApp() {
    this.platform.ready().then(() => {
      this.statusBar.styleDefault();
      this.splashScreen.hide();
      this.logger.info('App initialized OK. Splashscreen was hidden.');
    });
  }

  ngOnInit() {
    const path = window.location.pathname.split('folder/')[1];
    if (path !== undefined) {
      this.selectedIndex = this.appPages.findIndex(page => page.title.toLowerCase() === path.toLowerCase());
    }
    this.testApi();
  }

  async testApi(): Promise<void> {
    const BIF_API_HOST = 'http://localhost:4000';
    const configuration = new Configuration({ basePath: BIF_API_HOST,});
    const api = new DefaultApi(configuration);
    const response = await api.apiV1ConsortiumPost({
      configurationEndpoint: 'domain-and-an-http-endpoint',
      id: 'asdf',
      name: 'asdf',
      bifNodes: [
        {
          host: 'BIF-NODE-HOST-1', publicKey: 'FAKE-PUBLIC-KEY'
        }
      ]
    });
  }
}
