import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule, ReactiveFormsModule } from "@angular/forms";
import { IonicModule } from "@ionic/angular";
import { RoleManagerRoutingModule } from "./role-manager-routing.module";
import { RoleManagerComponent } from "./role-manager/role-manager.component";

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    IonicModule,
    RoleManagerRoutingModule,
  ],
  declarations: [RoleManagerComponent],
})
export class RoleManagerPageModule {}
