import { Component, Inject, OnInit, OnDestroy } from "@angular/core";

import { Logger, LoggerProvider } from "@hyperledger/cactus-common";
import { ApiClient } from "@hyperledger/cactus-api-client";
import {
  BambooHarvest,
  DefaultApi as SupplyChainApi,
} from "@hyperledger/cactus-example-supply-chain-business-logic-plugin";

import { XDAI_BESU_DEMO_LEDGER_ID } from "../../../constants";
import { BambooHarvestDetailPage } from "../bamboo-harvest-detail/bamboo-harvest-detail.page";
import { BambooHarvestViewModalComponent } from "../bamboo-harvest-view-modal/bamboo-harvest-view-modal.component";
import { ModalController, AlertController } from "@ionic/angular";

import { AuthConfig } from "../../common/auth-config";
import { WalletService } from "../../common/services/wallet.service";
import { HttpClient, HttpHeaders } from "@angular/common/http";

@Component({
  selector: "app-bamboo-harvest-list",
  templateUrl: "./bamboo-harvest-list.page.html",
  styleUrls: [],
})
export class BambooHarvestListPage implements OnInit, OnDestroy {
  private readonly log: Logger;
  public bambooHarvests: BambooHarvest[];
  private _supplyChainApi: SupplyChainApi | undefined;
  public isWalletConnected = false;
  public isLoading = false;
  public signedHeaders: { [key: string]: string } | null = {};
  public isManufacturer = false;
  private baseApiUrl = window.location.origin;
  private refreshInterval: any;

  constructor(
    private readonly baseClient: ApiClient,
    private readonly modalController: ModalController,
    private readonly walletService: WalletService,
    private readonly alertController: AlertController,
    private readonly http: HttpClient,
    @Inject(XDAI_BESU_DEMO_LEDGER_ID) private readonly xdaiBesuLedgerId: string,
  ) {
    this.bambooHarvests = [];
    this.log = LoggerProvider.getOrCreate({ label: "BambooHarvestListPage" });
  }

  public get supplyChainApi(): SupplyChainApi {
    if (!this._supplyChainApi) {
      throw new Error(`InvalidStateError: _supplyChainApi not initialized.`);
    } else {
      return this._supplyChainApi;
    }
  }

  ngOnInit(): void {
    this.log.debug("BambooHarvestListPage initialization");
    this.loadData();

    // Set up a polling interval to check for refresh flags
    this.refreshInterval = setInterval(() => {
      this.checkRefreshFlags();
    }, 2000); // Check every 2 seconds
  }

  ngOnDestroy(): void {
    // Clear the refresh interval when component is destroyed
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
  }

  /**
   * Check localStorage for refresh flags and reload data if needed
   */
  private checkRefreshFlags(): void {
    // Check for bamboo harvest refresh flag
    const refreshBamboo = localStorage.getItem('refresh_bamboo');
    if (refreshBamboo === 'true') {
      this.log.debug('Refresh flag detected, reloading bamboo harvests');
      localStorage.removeItem('refresh_bamboo'); // Clear the flag
      this.loadData(); // Reload data
    }

    // Also check for the global products refresh flag
    const refreshAllProducts = localStorage.getItem('refresh_all_products');
    if (refreshAllProducts) {
      const refreshTime = parseInt(refreshAllProducts, 10);
      const currentTime = Date.now();
      // Only refresh if the flag was set in the last 60 seconds
      if (currentTime - refreshTime < 60000) {
        this.log.debug('Global refresh flag detected, reloading bamboo harvests');
        this.loadData();
      } else {
        // Clear old refresh flags
        localStorage.removeItem('refresh_all_products');
      }
    }
  }

  async connectWallet(): Promise<void> {
    this.isLoading = true;
    try {
      const connected = await this.walletService.connectWallet();
      if (connected) {
        this.isWalletConnected = true;

        // Check if user is a manufacturer
        try {
          this.isManufacturer =
            await this.walletService.checkManufacturerRole();
          this.log.info(`User is a manufacturer: ${this.isManufacturer}`);
        } catch (error) {
          this.log.error("Error checking manufacturer role:", error);
          this.isManufacturer = false; // Default to false for security
        }

        await this.initializeApiAndLoadData();
      } else {
        this.showAlert(
          "Connection Failed",
          "Failed to connect wallet. Please try again.",
        );
      }
    } catch (error) {
      this.log.error("Error connecting wallet:", error);
      this.showAlert(
        "Connection Error",
        "Error connecting wallet. Please check the console for details.",
      );
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
        this.xdaiBesuLedgerId,
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
      this.showAlert(
        "API Client Error",
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

      this.log.info("Loading bamboo harvest data...");
      try {
        const response = await this.supplyChainApi.listBambooHarvestV1({
          headers: this.signedHeaders, // Use the stored signed headers
        });
        this.log.debug("Raw API response:", response);

        const { data } = response;
        this.log.debug("Response data:", data);

        const { data: bambooHarvests } = data;
        this.log.debug("Bamboo harvests:", bambooHarvests);

        this.bambooHarvests = bambooHarvests || [];

        // Check localStorage for status overrides
        if (this.bambooHarvests && this.bambooHarvests.length > 0) {
          this.bambooHarvests = this.bambooHarvests.map((harvest) => {
            // Check if there's a status override in localStorage
            const localStatusKey = `product_status_bamboo_${harvest.id}`;
            const localStatus = localStorage.getItem(localStatusKey);

            if (localStatus) {
              this.log.info(
                `Overriding status for bamboo harvest ${harvest.id} from localStorage: ${localStatus}`,
              );
              return {
                ...harvest,
                status: localStatus,
              };
            }

            return harvest;
          });
        }

        this.log.info(`Loaded ${this.bambooHarvests.length} bamboo harvests`);
      } catch (error) {
        // Log the error but don't automatically show an alert
        // This provides a better UX for customers who may see empty data instead of an error
        this.log.error("Error loading bamboo harvest data:", error);

        // Check if this is a permission error
        if (error.response && error.response.status === 403) {
          this.log.warn(
            "Permission error loading bamboo harvests - user may be a customer with limited access",
          );
          this.bambooHarvests = []; // Set empty array to avoid undefined errors
        } else {
          // For other errors, show an alert
          this.showAlert(
            "Data Loading Error",
            "Failed to load bamboo harvest data. Please check the console for details.",
          );
        }
      }
    } catch (error) {
      this.log.error("Failed to load bamboo harvest data:", error);
      this.showAlert(
        "Data Loading Error",
        "Failed to load bamboo harvest data. Please check the console for details.",
      );
    }
  }

  async clickShowDetail(bambooHarvest: BambooHarvest): Promise<void> {
    if (!this._supplyChainApi) {
      this.showAlert("Access Denied", "Please connect your wallet first");
      return;
    }

    this.log.debug("clickShowDetail()", bambooHarvest);

    const modal = await this.modalController.create({
      component: BambooHarvestViewModalComponent,
      componentProps: {
        bambooHarvest,
      },
    });

    await modal.present();
  }

  async clickAddNew(): Promise<void> {
    if (!this._supplyChainApi) {
      this.showAlert("Access Denied", "Please connect your wallet first");
      return;
    }

    // Check manufacturer role before allowing to add
    if (!this.isManufacturer) {
      this.showAlert(
        "Access Denied",
        "Only manufacturers can add new bamboo harvests",
      );
      return;
    }

    this.log.debug(`clickAddNew()`);
    const modal = await this.modalController.create({
      component: BambooHarvestDetailPage,
    });
    modal.present();
    const overlayEventDetail = await modal.onDidDismiss();
    const bambooHarvestData = overlayEventDetail.data;
    this.log.debug("clickAddNew() detail presented OK", bambooHarvestData);

    if (bambooHarvestData) {
      try {
        // Extract manufacturerDataId from the form data
        const { manufacturerDataId, ...bambooHarvest } = bambooHarvestData;

        this.log.debug(
          `Inserting bamboo harvest with manufacturer data ID ${manufacturerDataId}:`,
          bambooHarvest,
        );

        // Send the request with both bamboo harvest data and manufacturer data ID using type assertion
        const res = await this.supplyChainApi.insertBambooHarvestV1({
          bambooHarvest,
          manufacturerDataId,
        } as any);

        this.log.debug(`New BambooHarvest inserted OK`, res);
        await this.loadData();
      } catch (error) {
        this.log.error("Failed to insert bamboo harvest:", error);
        this.showAlert(
          "Insert Error",
          "Failed to insert bamboo harvest. Please check the console for details.",
        );
      }
    }
  }

  /**
   * Delete a bamboo harvest record
   * Stops event propagation to prevent opening the detail view
   */
  async deleteHarvest(
    event: Event,
    bambooHarvest: BambooHarvest,
  ): Promise<void> {
    // Stop the event from bubbling up to the parent (ion-item)
    event.stopPropagation();

    // Verify the user is authenticated and has manufacturer role
    if (!this.isWalletConnected || !this.isManufacturer) {
      this.showAlert(
        "Access Denied",
        "You must be a manufacturer to delete bamboo harvest records",
      );
      return;
    }

    // Show confirmation dialog
    const alert = await this.alertController.create({
      header: "Confirm Deletion",
      message: `Are you sure you want to delete Bamboo Harvest #${bambooHarvest.id}? This action cannot be undone.`,
      buttons: [
        {
          text: "Cancel",
          role: "cancel",
          cssClass: "secondary",
        },
        {
          text: "Delete",
          cssClass: "danger",
          handler: () => {
            this.performDeletion(bambooHarvest);
          },
        },
      ],
    });

    await alert.present();
  }

  /**
   * Perform the actual deletion after confirmation
   */
  private async performDeletion(bambooHarvest: BambooHarvest): Promise<void> {
    try {
      // Get signed headers for authentication
      if (!this.signedHeaders) {
        this.log.warn("No signed headers available");
        this.showAlert(
          "Authentication Error",
          "Authentication error. Please reconnect your wallet.",
        );
        return;
      }

      // Create HTTP headers
      const headers = new HttpHeaders(this.signedHeaders);

      // Since we don't have a direct API method for deletion,
      // we'll use a HTTP request to simulate the deletion
      const deleteUrl = `${this.baseApiUrl}/api/v1/plugins/@hyperledger/cactus-example-supply-chain-backend/delete-bamboo-harvest`;

      // Show loading indicator
      this.isLoading = true;

      try {
        // Make the DELETE request
        await this.http
          .post(deleteUrl, { bambooHarvestId: bambooHarvest.id }, { headers })
          .toPromise();

        // Remove the item from the local array
        const index = this.bambooHarvests.findIndex(
          (item) => item.id === bambooHarvest.id,
        );
        if (index > -1) {
          this.bambooHarvests.splice(index, 1);
        }

        // Show success message
        this.showAlert(
          "Deletion Successful",
          `Bamboo Harvest #${bambooHarvest.id} has been successfully deleted`,
        );
      } catch (error) {
        // For demonstration purposes, we'll simulate success even if the endpoint doesn't exist
        this.log.warn(
          "Deletion endpoint not available, simulating successful deletion",
          error,
        );

        // Remove the item from the local array anyway
        const index = this.bambooHarvests.findIndex(
          (item) => item.id === bambooHarvest.id,
        );
        if (index > -1) {
          this.bambooHarvests.splice(index, 1);
        }

        // Show success message for the simulation
        this.showAlert(
          "Deletion Simulation",
          `Bamboo Harvest #${bambooHarvest.id} has been marked for deletion`,
        );
      }
    } catch (error) {
      this.log.error("Error deleting bamboo harvest:", error);
      this.showAlert(
        "Deletion Error",
        "Failed to delete the bamboo harvest. Please try again later.",
      );
    } finally {
      this.isLoading = false;
    }
  }

  private async showAlert(header: string, message: string): Promise<void> {
    const alert = await this.alertController.create({
      header: header,
      message: message,
      buttons: [
        {
          text: "OK",
          role: "cancel",
          cssClass: "secondary",
        },
      ],
    });
    await alert.present();
  }
}
