import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { IonicModule } from "@ionic/angular";

import { TransactionReceiptModalPage } from "./transaction-receipt-modal.page";
import { TransactionReceiptModule } from "../transaction-receipt/transaction-receipt.module";

// Material imports
import { MatCommonModule } from "@angular/material/core";
import { MatCardModule } from "@angular/material/card";
import { MatIconModule } from "@angular/material/icon";
import { MatButtonModule } from "@angular/material/button";
import { MatProgressSpinnerModule } from "@angular/material/progress-spinner";

@NgModule({
  imports: [
    CommonModule,
    IonicModule,
    TransactionReceiptModule, // Include the transaction-receipt module
    // Material modules
    MatCommonModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatProgressSpinnerModule,
  ],
  declarations: [TransactionReceiptModalPage],
  exports: [TransactionReceiptModalPage],
})
export class TransactionReceiptModalModule {}
