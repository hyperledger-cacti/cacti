import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule, ReactiveFormsModule } from "@angular/forms";
import { IonicModule } from "@ionic/angular";
import { RouterModule } from "@angular/router";

import { PaymentListPage } from "./payment-list.page";
import { PageHeadingComponentModule } from "../../common/components/page-heading-component.module";

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    IonicModule,
    RouterModule.forChild([{ path: "", component: PaymentListPage }]),
    PageHeadingComponentModule,
  ],
  declarations: [PaymentListPage],
})
export class PaymentListPageModule {}
