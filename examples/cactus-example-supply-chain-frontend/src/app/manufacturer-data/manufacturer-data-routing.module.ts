import { NgModule } from "@angular/core";
import { Routes, RouterModule } from "@angular/router";

import { ManufacturerDataListPage } from "./manufacturer-data-list/manufacturer-data-list.page";

const routes: Routes = [
  {
    path: "",
    component: ManufacturerDataListPage,
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class ManufacturerDataPageRoutingModule {}
