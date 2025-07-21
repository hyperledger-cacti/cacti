import { Component, Inject, OnInit } from "@angular/core";

import { Logger, LoggerProvider } from "@hyperledger/cactus-common";
import { ApiClient } from "@hyperledger/cactus-api-client";
import {
  ManufacturerData,
  DefaultApi as SupplyChainApi,
} from "@hyperledger/cactus-example-supply-chain-business-logic-plugin";

import { FABRIC_DEMO_LEDGER_ID } from "../../../constants";
import { ManufacturerDataDetailPage } from "../manufacturer-data-detail/manufacturer-data-detail.page";
import { ModalController, AlertController } from "@ionic/angular";

import { AuthConfig } from "../../common/auth-config";
import { WalletService } from "../../common/services/wallet.service";

@Component({
  selector: "app-manufacturer-data-list",
  templateUrl: "./manufacturer-data-list.page.html",
  styleUrls: [],
})
export class ManufacturerDataListPage implements OnInit {
  private readonly log: Logger;
  public manufacturerData: ManufacturerData[];
  private _supplyChainApi: SupplyChainApi | undefined;
  public isWalletConnected = false;
  public isLoading = false;
  public signedHeaders: { [key: string]: string } | null = {};
  public isManufacturer = false;

  constructor(
    private readonly baseClient: ApiClient,
    private readonly modalController: ModalController,
    private readonly walletService: WalletService,
    private readonly alertController: AlertController,
    @Inject(FABRIC_DEMO_LEDGER_ID) private readonly ledgerId: string,
  ) {
    this.manufacturerData = [];
    this.log = LoggerProvider.getOrCreate({
      label: "ManufacturerDataListPage",
    });
  }

  get supplyChainApi(): SupplyChainApi {
    if (!this._supplyChainApi) {
      throw new Error(
        "SupplyChainApi not initialized - did you call ngOnInit()?",
      );
    }
    return this._supplyChainApi;
  }

  async ngOnInit(): Promise<void> {
    // Check if wallet is already connected
    this.isWalletConnected = this.walletService.isWalletConnected();
    if (this.isWalletConnected) {
      // Check if user is a manufacturer
      try {
        this.isManufacturer = await this.walletService.checkManufacturerRole();
        this.log.info(`User is a manufacturer: ${this.isManufacturer}`);
      } catch (error) {
        this.log.error("Error checking manufacturer role:", error);
        this.isManufacturer = false; // Default to false for security
      }

      await this.initializeApiAndLoadData();
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
        this.log.warn("No signed headers available");
        return;
      }

      this.log.info("Loading manufacturer data...");
      // Pass headers to ensure role-based filtering on the backend
      const response = await this.supplyChainApi.listManufacturerDataV1({
        headers: this.signedHeaders,
      });

      const {
        data: { data: manufacturerDataArray },
      } = response;

      this.log.debug("Raw manufacturer data from API:", manufacturerDataArray);

      // Create a Map to deduplicate entries by ID
      const uniqueManufacturerData = new Map<string, ManufacturerData>();

      // For manufacturers, we need special handling of duplicate IDs
      if (this.isManufacturer && manufacturerDataArray) {
        // Group data by ID
        const groupedById = new Map<string, ManufacturerData[]>();

        manufacturerDataArray.forEach((item) => {
          if (!groupedById.has(item.id)) {
            groupedById.set(item.id, []);
          }
          groupedById.get(item.id)?.push(item);
        });

        // For each ID, find the record with real data (not placeholder text)
        groupedById.forEach((items, id) => {
          if (items.length > 1) {
            // Find the item that doesn't have placeholder text
            const realDataItem = items.find(
              (item) =>
                item.supplierInfo !== "Contact manufacturer for details" &&
                item.supplierInfo !== "Available to manufacturers only",
            );

            if (realDataItem) {
              // Ensure numbers are properly typed
              const enhancedItem: ManufacturerData = {
                ...realDataItem,
                costPrice:
                  typeof realDataItem.costPrice === "number"
                    ? realDataItem.costPrice
                    : parseFloat(realDataItem.costPrice as any) || 0,
                inventory:
                  typeof realDataItem.inventory === "number"
                    ? realDataItem.inventory
                    : parseFloat(realDataItem.inventory as any) || 0,
              };

              uniqueManufacturerData.set(id, enhancedItem);
              this.log.debug(`Using real data for ID ${id}:`, enhancedItem);
            } else {
              // If no real data found, use the first one (shouldn't happen for manufacturers)
              uniqueManufacturerData.set(id, items[0]);
              this.log.warn(
                `No real data found for ID ${id}, using first record`,
              );
            }
          } else if (items.length === 1) {
            // Only one item, just ensure numbers are properly typed
            const enhancedItem: ManufacturerData = {
              ...items[0],
              costPrice:
                typeof items[0].costPrice === "number"
                  ? items[0].costPrice
                  : parseFloat(items[0].costPrice as any) || 0,
              inventory:
                typeof items[0].inventory === "number"
                  ? items[0].inventory
                  : parseFloat(items[0].inventory as any) || 0,
            };

            uniqueManufacturerData.set(id, enhancedItem);
          }
        });
      } else {
        // Process the data array as before for non-manufacturers
        manufacturerDataArray?.forEach((item) => {
          // For customers, sanitize the private data to provide a simplified view
          if (!this.isManufacturer) {
            // Create a simplified version with limited information
            const publicData: ManufacturerData = {
              id: item.id,
              name: item.name,
              costPrice: 0, // Hide actual cost price for customers
              inventory: 0, // Hide actual inventory for customers
              supplierInfo: "Available to manufacturers only", // Hide supplier info
              shippingAddress: item.shippingAddress || "",
              customerContact: item.customerContact || "",
              shipmentId: item.shipmentId, // Keep shipment ID reference
              privateNotes: "Private data available to manufacturers only",
            };
            // Only add if not already in the map
            if (!uniqueManufacturerData.has(item.id)) {
              uniqueManufacturerData.set(item.id, publicData);
            }
          } else {
            // This section is for manufacturers but is not used due to the special handling above
            // Keeping for backwards compatibility
            const enhancedItem: ManufacturerData = {
              ...item,
              // Ensure numbers are properly typed
              costPrice:
                typeof item.costPrice === "number"
                  ? item.costPrice
                  : parseFloat(item.costPrice as any) || 0,
              inventory:
                typeof item.inventory === "number"
                  ? item.inventory
                  : parseFloat(item.inventory as any) || 0,
            };

            // Only add if not already in the map
            if (!uniqueManufacturerData.has(item.id)) {
              uniqueManufacturerData.set(item.id, enhancedItem);
            }
          }
        });
      }

      // Convert Map back to array
      this.manufacturerData = Array.from(uniqueManufacturerData.values());

      this.log.debug(`Processed manufacturer data:`, this.manufacturerData);
      this.log.info(
        `Loaded ${this.manufacturerData.length} unique manufacturer data items (Role: ${this.isManufacturer ? "Manufacturer" : "Customer"})`,
      );
    } catch (error) {
      this.log.error("Failed to load manufacturer data:", error);
      this.showAlert(
        "Data Loading Error",
        "Failed to load manufacturer data. Please check the console for details.",
      );
    }
  }

  async clickShowDetail(manufacturerData: ManufacturerData): Promise<void> {
    if (!this._supplyChainApi) {
      this.showAlert("Access Denied", "Please connect your wallet first");
      return;
    }

    // Log the data we're about to display
    this.log.debug("Original manufacturer data for modal:", manufacturerData);

    // Check if user is a manufacturer when trying to edit details
    if (!this.isManufacturer) {
      this.showAlert(
        "View Only",
        "As a customer, you can only view public manufacturer data",
      );
    } else {
      // For manufacturers, ensure we're not sending placeholder data to the modal
      // Sometimes the data in the list may have placeholder text even for manufacturers
      // Let's make another API call to get the fresh, complete data
      try {
        const response = await this.supplyChainApi.listManufacturerDataV1({
          headers: this.signedHeaders,
        });

        const {
          data: { data: allManufacturerData },
        } = response;

        if (allManufacturerData && allManufacturerData.length > 0) {
          // Find all records with the same ID
          const matchingRecords = allManufacturerData.filter(
            (item) => item.id === manufacturerData.id,
          );

          // Find the record that has real data (not placeholder text)
          const realDataRecord = matchingRecords.find(
            (item) =>
              item.supplierInfo !== "Contact manufacturer for details" &&
              item.supplierInfo !== "Available to manufacturers only",
          );

          if (realDataRecord) {
            // Use the real data instead of the placeholder text
            manufacturerData = {
              ...realDataRecord,
              // Ensure numbers are properly typed
              costPrice:
                typeof realDataRecord.costPrice === "number"
                  ? realDataRecord.costPrice
                  : parseFloat(realDataRecord.costPrice as any) || 0,
              inventory:
                typeof realDataRecord.inventory === "number"
                  ? realDataRecord.inventory
                  : parseFloat(realDataRecord.inventory as any) || 0,
            };

            this.log.debug(
              "Found real manufacturer data for modal:",
              manufacturerData,
            );
          } else if (matchingRecords.length > 0) {
            // If no real data found, log a warning
            this.log.warn(
              "Could not find real data in manufacturer records, using first match",
            );
          }
        }
      } catch (error) {
        this.log.error("Failed to refresh manufacturer data for modal:", error);
        // Continue with the existing data anyway
      }
    }

    this.log.debug("Opening modal with data:", manufacturerData);

    const modal = await this.modalController.create({
      component: ManufacturerDataDetailPage,
      componentProps: {
        manufacturerData,
        isReadOnly: !this.isManufacturer, // Make it read-only for customers
      },
    });
    modal.present();
    const overlayEventDetail = await modal.onDidDismiss();
    const updatedData = overlayEventDetail.data as ManufacturerData;
    this.log.debug("clickShowDetail() detail presented OK", updatedData);

    if (updatedData) {
      await this.loadData(); // Refresh the list
    }
  }

  async clickAddNew(): Promise<void> {
    if (!this._supplyChainApi) {
      this.showAlert("Access Denied", "Please connect your wallet first");
      return;
    }

    // Only manufacturers can add new data
    if (!this.isManufacturer) {
      this.showAlert("Access Denied", "Only manufacturers can add new data");
      return;
    }

    this.log.debug(`clickAddNew()`);
    const modal = await this.modalController.create({
      component: ManufacturerDataDetailPage,
    });
    modal.present();
    const overlayEventDetail = await modal.onDidDismiss();
    const manufacturerData = overlayEventDetail.data as ManufacturerData;
    this.log.debug("clickAddNew() detail presented OK", manufacturerData);
    if (manufacturerData) {
      try {
        const res = await this.supplyChainApi.insertManufacturerDataV1(
          {
            manufacturerData,
          },
          {
            headers: this.signedHeaders, // Headers as separate param
          },
        );
        this.log.debug(`New ManufacturerData inserted OK`, res);
        await this.loadData();
      } catch (error) {
        this.log.error("Failed to insert manufacturer data:", error);
        this.showAlert(
          "Insert Error",
          "Failed to insert manufacturer data. Please check the console for details.",
        );
      }
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
        },
      ],
    });
    await alert.present();
  }
}
