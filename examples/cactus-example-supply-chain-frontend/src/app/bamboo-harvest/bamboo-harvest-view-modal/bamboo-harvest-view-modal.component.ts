import { Component, Input, OnInit } from "@angular/core";
import { ModalController } from "@ionic/angular";
import { BambooHarvest } from "@hyperledger/cactus-example-supply-chain-business-logic-plugin";
import { Logger, LoggerProvider } from "@hyperledger/cactus-common";

// Extended interface to include status
interface EnhancedBambooHarvest extends BambooHarvest {
  status?: string;
}

@Component({
  selector: "app-bamboo-harvest-view-modal",
  templateUrl: "./bamboo-harvest-view-modal.component.html",
  styleUrls: [],
})
export class BambooHarvestViewModalComponent implements OnInit {
  private readonly log: Logger;

  @Input() bambooHarvest: EnhancedBambooHarvest;

  constructor(public readonly modalController: ModalController) {
    this.log = LoggerProvider.getOrCreate({
      label: "BambooHarvestViewModalComponent",
    });
  }

  ngOnInit(): void {
    this.log.debug(
      "View modal initialized with bamboo harvest:",
      this.bambooHarvest,
    );

    this.checkLocalStorageForStatus();
  }

  /**
   * Check localStorage for any status updates for this bamboo harvest
   * This handles different key formats that might be used across the application
   */
  private checkLocalStorageForStatus(): void {
    if (this.bambooHarvest && this.bambooHarvest.id) {
      const id = this.bambooHarvest.id;

      // Check multiple possible key formats
      const keyFormats = [
        `product_status_bamboo_${id}`,
        `product_status_bambooharvest_${id}`,
        `product_status_bamboo-harvest_${id}`,
      ];

      // Find the first key with a value
      for (const key of keyFormats) {
        const status = localStorage.getItem(key);
        if (status) {
          this.log.info(`Found status in localStorage (${key}): ${status}`);

          // Update the bamboo harvest status
          this.bambooHarvest = {
            ...this.bambooHarvest,
            status: status,
          };

          // Break out of loop once we find a status
          break;
        }
      }
    }
  }

  dismiss(): void {
    this.modalController.dismiss();
  }
}
