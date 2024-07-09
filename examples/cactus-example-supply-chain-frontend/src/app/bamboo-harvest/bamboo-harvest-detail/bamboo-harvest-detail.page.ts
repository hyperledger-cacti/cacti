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
import { BambooHarvest } from "@hyperledger/cactus-example-supply-chain-business-logic-plugin";
import { Logger, LoggerProvider } from "@hyperledger/cactus-common";

import { XDAI_BESU_DEMO_LEDGER_ID } from "../../../constants";
import { isBambooHarvest } from "../is-bamboo-harvest";

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

  constructor(
    private readonly baseClient: ApiClient,
    public readonly modalController: ModalController,
    public readonly formBuilder: UntypedFormBuilder,
    @Inject(XDAI_BESU_DEMO_LEDGER_ID) private readonly xdaiBesuLedgerId: string,
  ) {
    this.log = LoggerProvider.getOrCreate({ label: "BambooHarvestDetailPage" });
  }

  async ngOnInit(): Promise<void> {
    this.log.debug("component initialized.", this.bambooHarvest);

    if (!this.bambooHarvest) {
      this.bambooHarvest = {
        id: uuidv4(),
        harvester: "Captain Lumberjack Logging Corporation",
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
    });
  }

  public onClickFormSubmit(value: unknown): void {
    this.log.debug("form submitted", value);
    if (!isBambooHarvest(value)) {
      const errMsg = `Expected the value to be of type BambooHarvest`;
      throw new RuntimeError(errMsg);
    }
    this.bambooHarvest = value;
    this.modalController.dismiss(this.bambooHarvest);
  }

  public onClickBtnCancel(): void {
    this.log.debug("form submission cancelled by user");
    this.modalController.dismiss();
  }
}
