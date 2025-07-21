import { Component, Inject, OnInit } from "@angular/core";

import { Logger, LoggerProvider } from "@hyperledger/cactus-common";
import { ApiClient } from "@hyperledger/cactus-api-client";
import {
  Shipment,
  DefaultApi as SupplyChainApi,
} from "@hyperledger/cactus-example-supply-chain-business-logic-plugin";

import { BESU_DEMO_LEDGER_ID } from "../../../constants";
import { ShipmentDetailPage } from "../shipment-detail/shipment-detail.page";
import { ModalController } from "@ionic/angular";

import { AuthConfig } from "../../common/auth-config";
import { WalletService } from "../../common/services/wallet.service";

@Component({
  selector: "app-shipment-list",
  templateUrl: "./shipment-list.page.html",
  styleUrls: [],
})
export class ShipmentListPage implements OnInit {
  private readonly log: Logger;
  public shipments: Shipment[];
  private _supplyChainApi: SupplyChainApi | undefined;
  public isWalletConnected = false;
  public isLoading = false;
  public signedHeaders: { [key: string]: string } | null = {};

  constructor(
    private readonly baseClient: ApiClient,
    private readonly modalController: ModalController,
    private readonly walletService: WalletService,
    @Inject(BESU_DEMO_LEDGER_ID) private readonly ledgerId: string,
  ) {
    this.shipments = [];
    this.log = LoggerProvider.getOrCreate({ label: "ShipmentListPage" });
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
        this.log.warn("No signed headers available");
        return;
      }

      this.log.info("Loading shipment data...");
      const response = await this.supplyChainApi.listShipmentV1();

      const {
        data: { data: shipments },
      } = response;
      this.shipments = shipments || [];
      this.log.debug(`Fetched Shipment data: %o`, this.shipments);
      this.log.info(`Loaded ${this.shipments.length} shipments`);
    } catch (error) {
      this.log.error("Failed to load shipment data:", error);
      alert(
        "Failed to load shipment data. Please check the console for details.",
      );
    }
  }

  async clickShowDetail(shipment: Shipment): Promise<void> {
    if (!this._supplyChainApi) {
      alert("Please connect your wallet first");
      return;
    }

    this.log.debug("clickShowDetail()", shipment);

    const modal = await this.modalController.create({
      component: ShipmentDetailPage,
      componentProps: {
        shipment,
      },
    });
    modal.present();
    const overlayEventDetail = await modal.onDidDismiss();
    const shipment2 = overlayEventDetail.data as Shipment;
    this.log.debug("clickShowDetail() detail presented OK", shipment2);

    if (shipment2) {
      this.log.warn(`Upserting Shipment not yet implemented. Skipping.`);
      // TODO: Implement upsert method on the Solidity contract.
    }
  }

  async clickAddNew(): Promise<void> {
    if (!this._supplyChainApi) {
      alert("Please connect your wallet first");
      return;
    }

    this.log.debug(`clickAddNew()`);
    const modal = await this.modalController.create({
      component: ShipmentDetailPage,
    });
    modal.present();
    const overlayEventDetail = await modal.onDidDismiss();
    const shipment = overlayEventDetail.data as Shipment;
    this.log.debug("clickAddNew() detail presented OK", shipment);
    if (shipment) {
      const res = await this.supplyChainApi.insertShipmentV1({
        shipment,
      });
      this.log.debug(`New Shipment inserted OK`, res);
      await this.loadData();
    }
  }
}
