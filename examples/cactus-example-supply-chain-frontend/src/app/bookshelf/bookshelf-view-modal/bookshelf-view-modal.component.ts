import { Component, Input, OnInit } from "@angular/core";
import { ModalController } from "@ionic/angular";
import { Bookshelf } from "@hyperledger/cactus-example-supply-chain-business-logic-plugin";
import { Logger, LoggerProvider } from "@hyperledger/cactus-common";

@Component({
  selector: "app-bookshelf-view-modal",
  templateUrl: "./bookshelf-view-modal.component.html",
  styleUrls: [],
})
export class BookshelfViewModalComponent implements OnInit {
  private readonly log: Logger;

  @Input() bookshelf: Bookshelf;

  constructor(public readonly modalController: ModalController) {
    this.log = LoggerProvider.getOrCreate({
      label: "BookshelfViewModalComponent",
    });
  }

  ngOnInit(): void {
    this.log.debug("View modal initialized with bookshelf:", this.bookshelf);
  }

  dismiss(): void {
    this.modalController.dismiss();
  }
}
