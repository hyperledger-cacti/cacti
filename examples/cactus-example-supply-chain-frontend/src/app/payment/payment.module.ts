import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule, ReactiveFormsModule } from "@angular/forms";
import { IonicModule } from "@ionic/angular";
import { PaymentRoutingModule } from "./payment-routing.module";
import { HttpClientModule } from "@angular/common/http";

// Import receipt modules instead of components
import { TransactionReceiptModule } from "./transaction-receipt/transaction-receipt.module";
import { TransactionReceiptModalModule } from "./transaction-receipt-modal/transaction-receipt-modal.module";

// Add Angular Material imports
import { MatCommonModule } from "@angular/material/core";
import { MatCardModule } from "@angular/material/card";
import { MatIconModule } from "@angular/material/icon";
import { MatProgressSpinnerModule } from "@angular/material/progress-spinner";
import { MatButtonModule } from "@angular/material/button";
import { MatInputModule } from "@angular/material/input";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatTooltipModule } from "@angular/material/tooltip";
import { PaymentService } from "../common/services/payment.service";
import { WalletService } from "../common/services/wallet.service";
import { ProductStatusService } from "../common/services/product-status.service";
import { BESU_DEMO_LEDGER_ID, CACTUS_API_URL } from "../../constants";

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    IonicModule,
    PaymentRoutingModule,
    HttpClientModule,
    // Import receipt modules
    TransactionReceiptModule,
    TransactionReceiptModalModule,
    // Add Angular Material modules
    MatCommonModule,
    MatCardModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatButtonModule,
    MatInputModule,
    MatFormFieldModule,
    MatTooltipModule,
  ],
  // No declarations needed as components are declared in their respective modules
  declarations: [],
  providers: [PaymentService, WalletService, ProductStatusService],
})
export class PaymentModule {}
