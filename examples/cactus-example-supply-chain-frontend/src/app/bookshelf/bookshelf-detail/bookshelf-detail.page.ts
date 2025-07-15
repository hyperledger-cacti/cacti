import { v4 as uuidv4 } from "uuid";

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
  Bookshelf,
  DefaultApi as SupplyChainApi,
} from "@hyperledger/cactus-example-supply-chain-business-logic-plugin";

import { Logger, LoggerProvider } from "@hyperledger/cactus-common";
import { XDAI_BESU_DEMO_LEDGER_ID } from "../../../constants";
import { WalletService } from "../../common/services/wallet.service";
import { AuthConfig } from "../../common/auth-config";

@Component({
  selector: "app-bookshelf-detail",
  templateUrl: "./bookshelf-detail.page.html",
  styleUrls: [],
})
export class BookshelfDetailPage implements OnInit {
  private readonly log: Logger;
  private _supplyChainApi: SupplyChainApi | undefined;
  public form: UntypedFormGroup;
  @Input()
  public bookshelf: Bookshelf;
  public bambooHarvests: BambooHarvest[];
  public bambooHarvestIds: string[];
  public isWalletConnected = false;
  public isLoading = false;

  constructor(
    private readonly baseClient: ApiClient,
    @Inject(XDAI_BESU_DEMO_LEDGER_ID) private readonly xdaiBesuLedgerId: string,
    public readonly modalController: ModalController,
    public readonly formBuilder: UntypedFormBuilder,
    private readonly walletService: WalletService,
  ) {
    this.log = LoggerProvider.getOrCreate({ label: "BookshelfDetailPage" });
  }

  public get supplyChainApi(): SupplyChainApi {
    if (!this._supplyChainApi) {
      throw new Error(`InvalidStateError: _supplyChainApi not initialized.`);
    } else {
      return this._supplyChainApi;
    }
  }

  async ngOnInit(): Promise<void> {
    this.log.debug("component initialized.", this.bookshelf);

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
      }
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

      // Add signature to headers
      headers["x-signature"] = signResult.signature;

      this._supplyChainApi = await this.baseClient.ofLedger(
        this.xdaiBesuLedgerId,
        SupplyChainApi,
        {
          baseOptions: {
            headers: {
              Authorization: `Bearer ${AuthConfig.authToken}`,
              ...headers,
            },
          },
        },
      );

      if (!this.bookshelf) {
        this.bookshelf = {
          id: uuidv4(),
          shelfCount: 5,
          bambooHarvestId: "",
        };
      }
      this.form = this.formBuilder.group({
        id: [this.bookshelf.id, Validators.required],
        shelfCount: [this.bookshelf.shelfCount, Validators.required],
        bambooHarvestId: [this.bookshelf.bambooHarvestId, Validators.required],
      });

      await this.loadData();
    } catch (error) {
      this.log.error("Failed to initialize API and load data:", error);
    }
  }

  private async loadData(): Promise<void> {
    try {
      // Get wallet headers
      const walletHeaders = this.walletService.getWalletHeaders();
      if (!walletHeaders) {
        this.log.warn("Wallet not connected");
        return;
      }

      // Sign the message
      const signResult = await this.walletService.signMessage(
        walletHeaders["x-message"],
      );
      if (!signResult) {
        this.log.warn("Failed to sign message");
        return;
      }

      // Add signature to headers
      walletHeaders["x-signature"] = signResult.signature;

      // Make sure all required headers are present
      const headers = {
        "x-wallet-address": walletHeaders["x-wallet-address"],
        "x-signature": walletHeaders["x-signature"],
        "x-message": walletHeaders["x-message"],
      };

      const { data } = await this.supplyChainApi.listBambooHarvestV1({
        headers: headers,
      });

      const { data: bambooHarvests } = data;
      this.bambooHarvests = bambooHarvests;
      this.log.debug(`Fetched BambooHarvest data: %o`, bambooHarvests);
      this.bambooHarvestIds = this.bambooHarvests.map((bh) => bh.id);
      this.log.debug(`BambooHarvest IDs: %o`, this.bambooHarvestIds);
    } catch (error) {
      this.log.error("Failed to load bamboo harvest data:", error);
    }
  }

  onClickFormSubmit(value: Bookshelf): void {
    this.log.debug("form submitted", value);
    this.bookshelf = value;
    this.modalController.dismiss(this.bookshelf);
  }

  onClickBtnCancel(): void {
    this.log.debug("form submission cancelled by user");
    this.modalController.dismiss();
  }
}
