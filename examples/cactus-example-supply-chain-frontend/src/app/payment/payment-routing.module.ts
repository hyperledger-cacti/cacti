import { NgModule } from "@angular/core";
import { Routes, RouterModule } from "@angular/router";

const routes: Routes = [
  {
    path: "",
    loadChildren: () =>
      import("./payment-list/payment-list.module").then(
        (m) => m.PaymentListPageModule,
      ),
  },
  {
    path: "detail/:id",
    loadChildren: () =>
      import("./payment-detail/payment-detail.module").then(
        (m) => m.PaymentDetailPageModule,
      ),
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class PaymentRoutingModule {}
