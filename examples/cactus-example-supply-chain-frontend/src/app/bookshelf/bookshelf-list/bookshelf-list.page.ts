import { Component, Inject, OnInit, OnDestroy } from "@angular/core";

import { Logger, LoggerProvider } from "@hyperledger/cactus-common";
import { ApiClient } from "@hyperledger/cactus-api-client";
import {
  Bookshelf,
  DefaultApi as SupplyChainApi,
} from "@hyperledger/cactus-example-supply-chain-business-logic-plugin";

import { BESU_DEMO_LEDGER_ID } from "../../../constants";
import { BookshelfDetailPage } from "../bookshelf-detail/bookshelf-detail.page";
import { BookshelfViewModalComponent } from "../bookshelf-view-modal/bookshelf-view-modal.component";
import { ModalController } from "@ionic/angular";

import { AuthConfig } from "../../common/auth-config";
import { WalletService } from "../../common/services/wallet.service";

@Component({
  selector: "app-bookshelf-list",
  templateUrl: "./bookshelf-list.page.html",
  styleUrls: [],
})
export class BookshelfListPage implements OnInit, OnDestroy {
  private readonly log: Logger;
  public bookshelves: Bookshelf[];
  private _supplyChainApi: SupplyChainApi | undefined;
  public isWalletConnected = false;
  public isLoading = false;
  public signedHeaders: { [key: string]: string } | null = {};
  private refreshInterval: any; // To store the interval reference

  constructor(
    private readonly baseClient: ApiClient,
    private readonly modalController: ModalController,
    private readonly walletService: WalletService,
    @Inject(BESU_DEMO_LEDGER_ID) private readonly ledgerId: string,
  ) {
    this.bookshelves = [];
    this.log = LoggerProvider.getOrCreate({ label: "BookshelfListPage" });
  }

  public get supplyChainApi(): SupplyChainApi {
    if (!this._supplyChainApi) {
      throw new Error(`InvalidStateError: _supplyChainApi not initialized.`);
    } else {
      return this._supplyChainApi;
    }
  }

  async ngOnInit(): Promise<void> {
    // Check if wallet is already connected
    this.isWalletConnected = this.walletService.isWalletConnected();
    if (this.isWalletConnected) {
      await this.initializeApiAndLoadData();
    } else {
      // If not connected, try connecting
      await this.connectWallet();
    }

    // Set up periodic refresh (every 5 seconds)
    this.refreshInterval = setInterval(() => {
      if (this.isWalletConnected && this._supplyChainApi) {
        this.loadData();
      }
    }, 5000);

    // Also check localStorage for refresh flag
    window.addEventListener("storage", (event) => {
      if (event.key === "refresh_bookshelves" && event.newValue === "true") {
        localStorage.removeItem("refresh_bookshelves");
        if (this.isWalletConnected && this._supplyChainApi) {
          this.loadData();
        }
      }
    });
  }

  ngOnDestroy(): void {
    // Clear the refresh interval when component is destroyed
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
  }

  async connectWallet(): Promise<void> {
    this.isLoading = true;
    try {
      const connected = await this.walletService.connectWallet();
      if (connected) {
        this.isWalletConnected = true;
        await this.initializeApiAndLoadData();
      } else {
        alert("Failed to connect wallet. Please try again.");
      }
    } catch (error) {
      this.log.error("Error connecting wallet:", error);
      alert("Error connecting wallet. Please check the console for details.");
    } finally {
      this.isLoading = false;
    }
  }

  private async initializeApiAndLoadData(): Promise<void> {
    try {
      // Get wallet headers
      const headers = this.walletService.getWalletHeaders();
      if (!headers) {
        this.log.warn("Wallet not connected");
        return;
      }

      // Sign the message
      const signResult = await this.walletService.signMessage(
        headers["x-message"],
      );
      if (!signResult) {
        this.log.warn("Failed to sign message");
        return;
      }

      // Add signature to headers and store them
      headers["x-signature"] = signResult.signature;
      this.signedHeaders = headers; // Store the signed headers

      this._supplyChainApi = await this.baseClient.ofLedger(
        this.ledgerId,
        SupplyChainApi,
        {
          baseOptions: {
            headers: {
              ...headers,
              Authorization: `Bearer ${AuthConfig.authToken}`,
            },
          },
        },
      );
      await this.loadData();
    } catch (error) {
      this.log.error("Failed to initialize API client:", error);
      alert(
        "Failed to initialize API client. Please check the console for details.",
      );
    }
  }

  private async loadData(): Promise<void> {
    try {
      if (!this._supplyChainApi) {
        this.log.warn("API client not initialized, cannot load data");
        return;
      }

      if (!this.signedHeaders) {
        // Check if we have signed headers
        this.log.warn("No signed headers available");
        return;
      }

      this.log.info("Loading bookshelf data...");
      const response = await this.supplyChainApi.listBookshelfV1({
        headers: this.signedHeaders, // Use the stored signed headers
      });

      const { data } = response;
      let { data: bookshelves } = data;

      // Check localStorage for any bookshelf status overrides
      bookshelves = bookshelves.map((bookshelf: Bookshelf) => {
        const statusKey = `product_status_bookshelf_${bookshelf.id}`;
        const storedStatus = localStorage.getItem(statusKey);
        if (storedStatus) {
          return { ...bookshelf, status: storedStatus };
        }
        return bookshelf;
      });

      // Filter out bookshelves that are already SOLD
      bookshelves = bookshelves.filter(
        (bookshelf: any) => !bookshelf.status || bookshelf.status !== "SOLD",
      );

      this.bookshelves = bookshelves;
      this.log.debug(`Loaded ${this.bookshelves.length} available bookshelves`);
    } catch (error) {
      this.log.error("Failed to load bookshelf data:", error);
      alert(
        "Failed to load bookshelf data. Please check the console for details.",
      );
    }
  }

  async clickShowDetail(bookshelf: Bookshelf): Promise<void> {
    if (!this._supplyChainApi) {
      alert("Please connect your wallet first");
      return;
    }

    this.log.debug("clickShowDetail()", bookshelf);

    const modal = await this.modalController.create({
      component: BookshelfViewModalComponent,
      componentProps: {
        bookshelf,
      },
    });

    await modal.present();
  }

  async clickAddNew(): Promise<void> {
    if (!this._supplyChainApi) {
      alert("Please connect your wallet first");
      return;
    }

    this.log.debug(`clickAddNew()`);
    const modal = await this.modalController.create({
      component: BookshelfDetailPage,
    });
    modal.present();
    const overlayEventDetail = await modal.onDidDismiss();
    const bookshelf = overlayEventDetail.data as Bookshelf;
    this.log.debug("clickAddNew() detail presented OK", bookshelf);
    if (bookshelf) {
      try {
        const res = await this.supplyChainApi.insertBookshelfV1(
          {
            bookshelf,
          },
          {
            headers: this.signedHeaders, // Headers as separate param
          },
        );
        this.log.debug(`New Bookshelf inserted OK`, res);
        await this.loadData();
      } catch (error) {
        this.log.error("Failed to insert bookshelf:", error);
        alert(
          "Failed to insert bookshelf. Please check the console for details.",
        );
      }
    }
  }
}
