import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule, ReactiveFormsModule } from "@angular/forms";
import { IonicModule } from "@ionic/angular";
import { RouterModule } from "@angular/router";
import { HttpClientModule } from "@angular/common/http";
import { ClipboardModule } from "@angular/cdk/clipboard";

import { PaymentDetailPage } from "./payment-detail.page";
import { PageHeadingComponentModule } from "../../common/components/page-heading-component.module";

// Material imports
import { MatCommonModule } from "@angular/material/core";
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
    RouterModule.forChild([{ path: "", component: PaymentDetailPage }]),
    PageHeadingComponentModule,
    HttpClientModule,
    ClipboardModule,
    // Material modules
    MatCommonModule,
    MatCardModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatButtonModule,
    MatInputModule,
    MatFormFieldModule,
    MatTooltipModule,
  ],
  declarations: [PaymentDetailPage],
})
export class PaymentDetailPageModule {}
