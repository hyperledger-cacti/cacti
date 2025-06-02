import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Logger, LoggerProvider } from "@hyperledger/cactus-common";
import { WalletService } from "./wallet.service";

@Injectable({
  providedIn: "root",
})
export class BambooService {
  private readonly log: Logger;

  constructor(
    private http: HttpClient,
    private walletService: WalletService,
  ) {
    this.log = LoggerProvider.getOrCreate({
      label: "BambooService",
      level: "INFO",
    });
  }

  /**
   * Get signed headers for API requests
   */
  private async getSignedHeaders(): Promise<any> {
    try {
      // Get wallet headers
      const headers = this.walletService.getWalletHeaders();
      if (!headers) {
        this.log.warn("Wallet not connected, cannot generate headers");
        return null;
      }

      // Get the message to sign
      const message = headers["x-message"];
      if (!message) {
        this.log.warn("No message to sign in the headers");
        return null;
      }

      // Sign the message
      const signResult = await this.walletService.signMessage(message);
      if (!signResult) {
        this.log.warn("Failed to sign message");
        return null;
      }

      // Return headers with signature
      return {
        ...headers,
        "x-signature": signResult.signature,
        "Content-Type": "application/json",
      };
    } catch (error) {
      this.log.error("Error getting signed headers:", error);
      return null;
    }
  }

  /**
   * Get a bamboo harvest by ID
   * @param bambooHarvestId The ID of the bamboo harvest to fetch
   * @returns Promise resolving to the bamboo harvest data
   */
  async getBambooHarvestById(bambooHarvestId: string): Promise<any> {
    try {
      // Check localStorage first for immediate status
      const localStatus = this.getBambooLocalStatus(bambooHarvestId);

      // Construct API URL
      const apiUrl = `${window.location.origin}/api/v1/plugins/@hyperledger/cactus-example-supply-chain-backend/bamboo-harvest/${bambooHarvestId}`;

      // Get signed headers
      const headers = await this.getSignedHeaders();
      if (!headers) {
        throw new Error("Failed to get authentication headers");
      }

      try {
        // Make API request
        const response = await this.http.get(apiUrl, { headers }).toPromise();

        if (response && response["success"] && response["data"]) {
          const bamboo = response["data"];

          // If localStorage has a different status, prefer it over the API response
          if (localStatus && localStatus !== bamboo.status) {
            this.log.debug(
              `Overriding API status "${bamboo.status}" with localStorage status "${localStatus}" for bamboo harvest ${bambooHarvestId}`,
            );
            bamboo.status = localStatus;
          }

          return bamboo;
        }
      } catch (apiError) {
        this.log.warn(
          `API call failed for bamboo harvest ${bambooHarvestId}:`,
          apiError,
        );
      }

      // If API call fails but we have a localStorage status, return a minimal bamboo object
      if (localStatus) {
        this.log.debug(
          `Creating bamboo harvest from localStorage for ${bambooHarvestId} with status ${localStatus}`,
        );
        return {
          id: bambooHarvestId,
          status: localStatus,
          type: "bamboo",
        };
      }

      // If no API data and no localStorage, create a minimal object with UNKNOWN status
      return {
        id: bambooHarvestId,
        status: "UNKNOWN",
        type: "bamboo",
      };
    } catch (error) {
      this.log.error("Error fetching bamboo harvest:", error);

      // As a fallback, check localStorage and return minimal data if available
      const localStatus = this.getBambooLocalStatus(bambooHarvestId);
      if (localStatus) {
        return {
          id: bambooHarvestId,
          status: localStatus,
          type: "bamboo",
        };
      }

      // Return minimal data even on error
      return {
        id: bambooHarvestId,
        status: "ERROR",
        type: "bamboo",
      };
    }
  }

  /**
   * Get bamboo harvest status from localStorage
   * @param bambooHarvestId The bamboo harvest ID to check
   * @returns The status from localStorage or null if not found
   */
  private getBambooLocalStatus(bambooHarvestId: string): string | null {
    try {
      // Check all possible localStorage key formats for bamboo status
      const possibleKeys = [
        `product_status_bamboo_${bambooHarvestId}`,
        `product_status_bambooharvest_${bambooHarvestId}`,
        `product_status_bamboo-harvest_${bambooHarvestId}`,
        `bamboo_${bambooHarvestId}_status`,
        `bambooharvest_${bambooHarvestId}_status`,
        `bambooharvestId_${bambooHarvestId}_status`,
        `bamboo_harvest_${bambooHarvestId}_status`,
        `bamboo-harvest_${bambooHarvestId}_status`,
      ];

      for (const key of possibleKeys) {
        const status = localStorage.getItem(key);
        if (status) {
          return status;
        }
      }

      return null;
    } catch (error) {
      this.log.error("Error reading bamboo status from localStorage:", error);
      return null;
    }
  }

  /**
   * Update a bamboo harvest status in localStorage
   * This is a local-only function to ensure UI consistency
   * @param bambooHarvestId The bamboo harvest ID
   * @param status The status to set
   */
  updateBambooLocalStatus(bambooHarvestId: string, status: string): void {
    try {
      // Set all possible localStorage key formats for bamboo
      const keyFormats = [
        `product_status_bamboo_${bambooHarvestId}`,
        `product_status_bambooharvest_${bambooHarvestId}`,
        `product_status_bamboo-harvest_${bambooHarvestId}`,
        `bamboo_${bambooHarvestId}_status`,
        `bambooharvest_${bambooHarvestId}_status`,
        `bambooharvestId_${bambooHarvestId}_status`,
        `bamboo_harvest_${bambooHarvestId}_status`,
        `bamboo-harvest_${bambooHarvestId}_status`,
      ];

      // Set each key format
      keyFormats.forEach((key) => {
        localStorage.setItem(key, status);
      });

      // Set global bamboo refresh flag
      localStorage.setItem("refresh_bamboo", "true");
      localStorage.setItem("refresh_all_products", Date.now().toString());

      this.log.debug(
        `Updated all localStorage keys for bamboo harvest ${bambooHarvestId} to ${status}`,
      );
    } catch (error) {
      this.log.error("Error updating bamboo localStorage:", error);
    }
  }
}
