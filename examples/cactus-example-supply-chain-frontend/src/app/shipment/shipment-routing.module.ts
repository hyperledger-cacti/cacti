import { NgModule } from "@angular/core";
import { Routes, RouterModule } from "@angular/router";

import { ShipmentListPage } from "./shipment-list/shipment-list.page";

const routes: Routes = [
  {
    path: "",
    component: ShipmentListPage,
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class ShipmentPageRoutingModule {}
