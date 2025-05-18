import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule, ReactiveFormsModule } from "@angular/forms";
import { IonicModule } from "@ionic/angular";
import { PaymentRoutingModule } from "./payment-routing.module";
import { PaymentListPage } from "./payment-list/payment-list.page";
import { PageHeadingComponentModule } from "../common/components/page-heading-component.module";
import { PaymentDetailPage } from "./payment-detail/payment-detail.page";
import { TransactionReceiptComponent } from "./transaction-receipt/transaction-receipt.component";
import { TransactionReceiptModalPage } from "./transaction-receipt-modal/transaction-receipt-modal.page";
import { HttpClientModule } from "@angular/common/http";
import { ClipboardModule } from "@angular/cdk/clipboard";

// Add Angular Material imports
import { MatCardModule } from "@angular/material/card";
import { MatIconModule } from "@angular/material/icon";
import { MatProgressSpinnerModule } from "@angular/material/progress-spinner";
import { MatButtonModule } from "@angular/material/button";
import { MatInputModule } from "@angular/material/input";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatTooltipModule } from "@angular/material/tooltip";

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    IonicModule,
    PaymentRoutingModule,
    PageHeadingComponentModule,
    HttpClientModule,
    ClipboardModule,
    // Add Angular Material modules
    MatCardModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatButtonModule,
    MatInputModule,
    MatFormFieldModule,
    MatTooltipModule,
  ],
  declarations: [
    PaymentDetailPage,
    PaymentListPage,
    TransactionReceiptComponent,
    TransactionReceiptModalPage,
  ],
})
export class PaymentModule {}
