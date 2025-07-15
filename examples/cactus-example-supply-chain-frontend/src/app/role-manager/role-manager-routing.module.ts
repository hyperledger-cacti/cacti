import { NgModule } from "@angular/core";
import { RouterModule, Routes } from "@angular/router";
import { RoleManagerComponent } from "./role-manager/role-manager.component";

const routes: Routes = [
  {
    path: "",
    component: RoleManagerComponent,
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class RoleManagerRoutingModule {}
