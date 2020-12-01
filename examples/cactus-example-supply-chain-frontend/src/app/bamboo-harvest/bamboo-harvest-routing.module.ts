import { NgModule } from "@angular/core";
import { Routes, RouterModule } from "@angular/router";

import { BambooHarvestListPage } from "./bamboo-harvest-list/bamboo-harvest-list.page";

const routes: Routes = [
  {
    path: "",
    component: BambooHarvestListPage,
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class BambooHarvestPageRoutingModule {}
