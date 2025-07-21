import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { IonicModule } from "@ionic/angular";
import { ClipboardModule } from "@angular/cdk/clipboard";
import { HttpClientModule } from "@angular/common/http";

import { TransactionReceiptComponent } from "./transaction-receipt.component";

// Material imports
import { MatCommonModule } from "@angular/material/core";
import { MatCardModule } from "@angular/material/card";
import { MatIconModule } from "@angular/material/icon";
import { MatButtonModule } from "@angular/material/button";
import { MatSnackBarModule } from "@angular/material/snack-bar";
import { MatProgressSpinnerModule } from "@angular/material/progress-spinner";
import { MatTooltipModule } from "@angular/material/tooltip";

@NgModule({
  imports: [
    CommonModule,
    IonicModule,
    HttpClientModule,
    ClipboardModule,
    // Material modules
    MatCommonModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
  ],
  declarations: [TransactionReceiptComponent],
  exports: [TransactionReceiptComponent],
})
export class TransactionReceiptModule {}
