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
  Shipment,
  Bookshelf,
  DefaultApi as SupplyChainApi,
} from "@hyperledger/cactus-example-supply-chain-business-logic-plugin";

import { Logger, LoggerProvider } from "@hyperledger/cactus-common";
import { XDAI_BESU_DEMO_LEDGER_ID } from "../../../constants";

import { AuthConfig } from "../../common/auth-config";
import { WalletService } from "../../common/services/wallet.service";

@Component({
  selector: "app-shipment-detail",
  templateUrl: "./shipment-detail.page.html",
  styleUrls: [],
})
export class ShipmentDetailPage implements OnInit {
  private readonly log: Logger;
  private _supplyChainApi: SupplyChainApi | undefined;
  public form: UntypedFormGroup;
  @Input()
  public shipment: Shipment;
  public bookshelves: Bookshelf[];
  public bookshelfIds: string[];
  private signedHeaders: { [key: string]: string } | null = null;

  constructor(
    private readonly baseClient: ApiClient,
    @Inject(XDAI_BESU_DEMO_LEDGER_ID) private readonly xdaiBesuLedgerId: string,
    public readonly modalController: ModalController,
    public readonly formBuilder: UntypedFormBuilder,
    private readonly walletService: WalletService,
  ) {
    this.log = LoggerProvider.getOrCreate({ label: "ShipmentDetailPage" });
  }

  public get supplyChainApi(): SupplyChainApi {
    if (!this._supplyChainApi) {
      throw new Error(`InvalidStateError: _supplyChainApi not initialized.`);
    } else {
      return this._supplyChainApi;
    }
  }

  async ngOnInit(): Promise<void> {
    this.log.debug("component initialized.", this.shipment);

    await this.initializeApiClient();

    if (!this.shipment) {
      this.shipment = {
        id: uuidv4(),
        bookshelfId: "",
      };
    }
    this.form = this.formBuilder.group({
      id: [this.shipment.id, Validators.required],
      bookshelfId: [this.shipment.bookshelfId, Validators.required],
    });

    await this.loadData();
  }

  private async initializeApiClient(): Promise<void> {
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
    this.signedHeaders = headers;

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
  }

  private async loadData(): Promise<void> {
    if (!this._supplyChainApi) {
      this.log.warn("API client not initialized");
      return;
    }

    try {
      const response = await this.supplyChainApi.listBookshelfV1({
        headers: this.signedHeaders || undefined,
      });

      const { data } = response;
      const { data: bookshelves } = data;
      this.bookshelves = bookshelves || [];
      this.log.debug(`Fetched Bookshelf data: %o`, bookshelves);
      this.bookshelfIds = this.bookshelves.map((bh) => bh.id);
      this.log.debug(`Bookshelf IDs: %o`, this.bookshelfIds);
    } catch (error) {
      this.log.error("Failed to load bookshelf data:", error);
    }
  }

  onClickFormSubmit(value: Shipment): void {
    this.log.debug("form submitted", value);
    this.shipment = value;
    this.modalController.dismiss(this.shipment);
  }

  onClickBtnCancel(): void {
    this.log.debug("form submission cancelled by user");
    this.modalController.dismiss();
  }
}
