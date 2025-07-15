import { Component, OnInit } from "@angular/core";
import { Platform } from "@ionic/angular";
import { SplashScreen } from "@ionic-native/splash-screen/ngx";
import { StatusBar } from "@ionic-native/status-bar/ngx";
import { WalletService } from "./common/services/wallet.service";
import { Logger, LoggerProvider } from "@hyperledger/cactus-common";

// Define window.ethereum interface
declare global {
  interface Window {
    ethereum?: any;
  }
}

@Component({
  selector: "app-root",
  templateUrl: "app.component.html",
  styleUrls: ["app.component.scss"],
})
export class AppComponent implements OnInit {
  public selectedIndex = 0;
  public appPages = [
    {
      title: "Bamboo Harvests",
      url: "/bamboo-harvest-list",
      icon: "leaf",
    },
    {
      title: "Bookshelves",
      url: "/bookshelf-list",
      icon: "book",
    },
    // {
    //   title: "Shipment",
    //   url: "/shipment-list",
    //   icon: "cube",
    // },
    {
      title: "Manufacturer Data",
      url: "/manufacturer-data-list",
      icon: "business",
    },
    {
      title: "Role Manager",
      url: "/role-manager",
      icon: "people",
    },
    {
      title: "Payments",
      url: "/payment",
      icon: "cash",
    },
  ];

  walletAddress: string | null = null;
  isAdmin: boolean = false;
  walletConnected: boolean = false;
  private readonly log: Logger;

  constructor(
    private platform: Platform,
    private splashScreen: SplashScreen,
    private statusBar: StatusBar,
    private walletService: WalletService,
  ) {
    this.log = LoggerProvider.getOrCreate({
      label: "AppComponent",
      level: "DEBUG",
    });
    this.log.debug("AppComponent initialized");
    this.initializeApp();
  }

  async ngOnInit(): Promise<void> {
    this.log.debug("App initialization started");

    this.walletService.walletAddress$.subscribe((address) => {
      this.walletAddress = address;
      this.log.debug(
        `Wallet connection changed: ${address ? "connected" : "disconnected"}`,
      );
      this.walletConnected = !!address;
    });

    this.walletService.isAdmin$.subscribe((isAdmin) => {
      this.isAdmin = isAdmin;
    });

    // Try to connect wallet on startup - helpful for testing
    try {
      this.log.debug("Attempting to connect wallet on startup");
      await this.connectWallet();
    } catch (error) {
      this.log.warn("Initial wallet connection attempt failed:", error);
    }
  }

  initializeApp(): void {
    this.platform.ready().then(() => {
      this.statusBar.styleDefault();
      this.splashScreen.hide();
    });
  }

  async connectWallet(): Promise<void> {
    try {
      this.log.debug("Connecting wallet...");
      const connected = await this.walletService.connectWallet();
      if (connected) {
        this.log.info("Wallet connected successfully");
      } else {
        this.log.warn("Wallet connection returned false");
      }
    } catch (error) {
      this.log.error("Error connecting wallet:", error);
      throw error;
    }
  }

  async disconnectWallet() {
    await this.walletService.disconnectWallet();
  }

  getShortenedAddress(address: string): string {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  }

  async testMetaMaskSigning(): Promise<boolean> {
    try {
      // Test 1: Check if MetaMask is available
      if (!window.ethereum || !window.ethereum.isMetaMask) {
        alert("MetaMask not detected. Please install MetaMask extension.");
        return false;
      }

      console.log(
        "MetaMask version:",
        window.ethereum.isMetaMask ? "Installed" : "Not detected",
      );

      // Test 2: Request accounts
      try {
        console.log("Requesting accounts...");
        const accounts = await window.ethereum.request({
          method: "eth_requestAccounts",
        });
        console.log("Connected accounts:", accounts);

        // Get chain ID
        const chainId = await window.ethereum.request({
          method: "eth_chainId",
        });
        console.log("Chain ID:", chainId);
        alert(`Connected to chain ID: ${chainId}`);

        // Test 3: Simple signing (minimal params)
        console.log("Attempting to sign message...");
        alert(
          "Please check for a MetaMask popup to sign a message.\n\nIf you don't see it, check if it's hidden behind windows or minimized.",
        );

        // Give time for the alert to be dismissed
        await new Promise((resolve) => setTimeout(resolve, 1000));

        const simpleMessage =
          "Hello from Supply Chain App: " + new Date().toISOString();
        console.log("Message to sign:", simpleMessage);

        // Use the basic form with minimal parameters
        const signResult = await window.ethereum.request({
          method: "personal_sign",
          params: [simpleMessage, accounts[0]],
        });

        console.log("SIGNING SUCCESSFUL:", signResult);
        alert(
          "Signing successful!\n\nSignature: " +
            signResult.substring(0, 10) +
            "...",
        );
        return true;
      } catch (error) {
        console.error("MetaMask interaction failed:", error);
        alert(`MetaMask interaction failed: ${error.message || error}`);
        return false;
      }
    } catch (error) {
      console.error("=== METAMASK TEST FAILED ===", error);
      alert(`MetaMask test failed: ${error.message || error}`);
      return false;
    }
  }
}
