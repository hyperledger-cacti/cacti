import { NgModule } from "@angular/core";
import { Routes, RouterModule } from "@angular/router";

import { ConsortiumInspectorPage } from "./consortium-inspector.page";

const routes: Routes = [
  {
    path: "",
    component: ConsortiumInspectorPage,
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class ConsortiumInspectorPageRoutingModule {}
