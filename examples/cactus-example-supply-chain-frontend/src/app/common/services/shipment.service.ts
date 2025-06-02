import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Logger, LoggerProvider } from "@hyperledger/cactus-common";
import { WalletService } from "./wallet.service";

@Injectable({
  providedIn: "root",
})
export class ShipmentService {
  private readonly log: Logger;

  constructor(
    private http: HttpClient,
    private walletService: WalletService,
  ) {
    this.log = LoggerProvider.getOrCreate({
      label: "ShipmentService",
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
   * Get a shipment by ID
   * @param shipmentId The ID of the shipment to fetch
   * @returns Promise resolving to the shipment data
   */
  async getShipmentById(shipmentId: string): Promise<any> {
    try {
      // Check localStorage first for immediate status
      const localStatus = this.getShipmentLocalStatus(shipmentId);

      // Construct API URL
      const apiUrl = `${window.location.origin}/api/v1/plugins/@hyperledger/cactus-example-supply-chain-backend/shipment/${shipmentId}`;

      // Get signed headers
      const headers = await this.getSignedHeaders();
      if (!headers) {
        throw new Error("Failed to get authentication headers");
      }

      // Make API request
      const response = await this.http.get(apiUrl, { headers }).toPromise();

      if (response && response["success"] && response["data"]) {
        const shipment = response["data"];

        // If localStorage has a different status, prefer it over the API response
        if (localStatus && localStatus !== shipment.status) {
          this.log.debug(
            `Overriding API status "${shipment.status}" with localStorage status "${localStatus}" for shipment ${shipmentId}`,
          );
          shipment.status = localStatus;
        }

        return shipment;
      }

      // If API call fails but we have a localStorage status, return a minimal shipment object
      if (!response && localStatus) {
        this.log.debug(
          `API call failed, creating shipment from localStorage for ${shipmentId} with status ${localStatus}`,
        );
        return {
          id: shipmentId,
          status: localStatus,
        };
      }

      throw new Error("Failed to get shipment data");
    } catch (error) {
      this.log.error("Error fetching shipment:", error);

      // As a fallback, check localStorage and return minimal data if available
      const localStatus = this.getShipmentLocalStatus(shipmentId);
      if (localStatus) {
        return {
          id: shipmentId,
          status: localStatus,
        };
      }

      throw error;
    }
  }

  /**
   * Get shipment status from localStorage
   * @param shipmentId The shipment ID to check
   * @returns The status from localStorage or null if not found
   */
  private getShipmentLocalStatus(shipmentId: string): string | null {
    try {
      // Check all possible localStorage keys for shipment status
      const possibleKeys = [
        `product_status_shipment_${shipmentId}`,
        `shipment_${shipmentId}_status`,
      ];

      for (const key of possibleKeys) {
        const status = localStorage.getItem(key);
        if (status) {
          return status;
        }
      }

      return null;
    } catch (error) {
      this.log.error("Error reading shipment status from localStorage:", error);
      return null;
    }
  }
}
