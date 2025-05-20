import { NgModule } from "@angular/core";
import { Routes, RouterModule } from "@angular/router";

import { PaymentListPage } from "./payment-list.page";

const routes: Routes = [
  {
    path: "",
    component: PaymentListPage,
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class PaymentListPageRoutingModule {}
