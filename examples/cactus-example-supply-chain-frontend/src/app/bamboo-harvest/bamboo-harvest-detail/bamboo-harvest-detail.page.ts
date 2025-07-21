import { v4 as uuidv4 } from "uuid";
import { RuntimeError } from "run-time-error";

import { Component, Inject, Input, OnInit } from "@angular/core";
import {
  UntypedFormGroup,
  UntypedFormBuilder,
  Validators,
} from "@angular/forms";
import { ModalController } from "@ionic/angular";

import { ApiClient } from "@hyperledger/cactus-api-client";
import {
  BambooHarvest,
  ManufacturerData,
  DefaultApi as SupplyChainApi,
} from "@hyperledger/cactus-example-supply-chain-business-logic-plugin";
import { Logger, LoggerProvider } from "@hyperledger/cactus-common";

import { XDAI_BESU_DEMO_LEDGER_ID } from "../../../constants";
import { isBambooHarvest } from "../is-bamboo-harvest";
import { WalletService } from "../../common/services/wallet.service";
import { AuthConfig } from "../../common/auth-config";

@Component({
  selector: "app-bamboo-harvest-detail",
  templateUrl: "./bamboo-harvest-detail.page.html",
  styleUrls: [],
})
export class BambooHarvestDetailPage implements OnInit {
  private readonly log: Logger;
  public form: UntypedFormGroup;
  @Input()
  public bambooHarvest: BambooHarvest;
  public manufacturerDataList: ManufacturerData[] = [];
  public selectedManufacturerId: string = "";
  private _supplyChainApi: SupplyChainApi | undefined;

  constructor(
    private readonly baseClient: ApiClient,
    public readonly modalController: ModalController,
    public readonly formBuilder: UntypedFormBuilder,
    private readonly walletService: WalletService,
    @Inject(XDAI_BESU_DEMO_LEDGER_ID) private readonly xdaiBesuLedgerId: string,
  ) {
    this.log = LoggerProvider.getOrCreate({ label: "BambooHarvestDetailPage" });
  }

  public get supplyChainApi(): SupplyChainApi {
    if (!this._supplyChainApi) {
      throw new Error(`InvalidStateError: _supplyChainApi not initialized.`);
    } else {
      return this._supplyChainApi;
    }
  }

  async ngOnInit(): Promise<void> {
    this.log.debug("component initialized.", this.bambooHarvest);

    if (!this.bambooHarvest) {
      this.bambooHarvest = {
        id: uuidv4(),
        harvester: "", // Will be set from selected manufacturer
        location: "London, NW1 2DB, United Kingdom",
        startedAt: new Date(2020, 6, 10, 7, 0, 0, 0).toJSON(),
        endedAt: new Date(2020, 6, 10, 16, 0, 0, 0).toJSON(),
      };
    }

    this.form = this.formBuilder.group({
      id: [this.bambooHarvest.id, Validators.required],
      location: [this.bambooHarvest.location, Validators.required],
      startedAt: [this.bambooHarvest.startedAt, Validators.required],
      endedAt: [this.bambooHarvest.endedAt, Validators.required],
      harvester: [this.bambooHarvest.harvester, Validators.required],
      manufacturerDataId: [this.selectedManufacturerId, Validators.required],
    });

    await this.initializeApiAndLoadManufacturerData();
  }

  private async initializeApiAndLoadManufacturerData(): Promise<void> {
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

      // Add signature to headers
      headers["x-signature"] = signResult.signature;

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

      // Load manufacturer data
      await this.loadManufacturerData(headers);
    } catch (error) {
      this.log.error("Failed to initialize API client:", error);
      alert(
        "Failed to initialize API client. Please check the console for details.",
      );
    }
  }

  private async loadManufacturerData(headers: {
    [key: string]: string;
  }): Promise<void> {
    try {
      if (!this._supplyChainApi) {
        this.log.warn(
          "API client not initialized, cannot load manufacturer data",
        );
        return;
      }

      this.log.info("Loading manufacturer data...");
      const response = await this.supplyChainApi.listManufacturerDataV1({
        headers: headers,
      });

      const { data } = response;
      const { data: manufacturerData } = data;

      this.manufacturerDataList = manufacturerData || [];
      this.log.info(
        `Loaded ${this.manufacturerDataList.length} manufacturer data records`,
      );

      // If we have manufacturer data and the form exists, update the dropdown
      if (this.manufacturerDataList.length > 0 && this.form) {
        // Pre-select the first manufacturer if none selected
        if (!this.selectedManufacturerId) {
          this.selectedManufacturerId = this.manufacturerDataList[0].id;
          this.form.patchValue({
            manufacturerDataId: this.selectedManufacturerId,
            harvester: this.getManufacturerName(this.selectedManufacturerId),
          });
        }
      }
    } catch (error) {
      this.log.error("Failed to load manufacturer data:", error);
      alert(
        "Failed to load manufacturer data. Please check the console for details.",
      );
    }
  }

  // Helper to get manufacturer name by ID
  getManufacturerName(id: string): string {
    const manufacturer = this.manufacturerDataList.find((m) => m.id === id);
    return manufacturer ? manufacturer.name : "";
  }

  // Handle manufacturer selection change
  onManufacturerChange(event: any): void {
    const manufacturerId = event.detail.value;
    this.selectedManufacturerId = manufacturerId;

    // Update the harvester field with the manufacturer name
    const manufacturerName = this.getManufacturerName(manufacturerId);
    this.form.patchValue({ harvester: manufacturerName });
  }

  public onClickFormSubmit(value: unknown): void {
    this.log.debug("form submitted", value);
    if (!isBambooHarvest(value)) {
      const errMsg = `Expected the value to be of type BambooHarvest`;
      throw new RuntimeError(errMsg);
    }

    // Add the manufacturer data ID to the bamboo harvest
    const formData = value as any;
    const bambooHarvestWithManufacturer = {
      ...formData,
      manufacturerDataId: this.selectedManufacturerId,
    };

    this.bambooHarvest = formData;
    this.modalController.dismiss(bambooHarvestWithManufacturer);
  }

  public onClickBtnCancel(): void {
    this.log.debug("form submission cancelled by user");
    this.modalController.dismiss();
  }
}
