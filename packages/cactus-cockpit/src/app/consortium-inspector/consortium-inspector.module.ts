import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";

import { IonicModule } from "@ionic/angular";

import { ConsortiumInspectorPageRoutingModule } from "./consortium-inspector-routing.module";

import { ConsortiumInspectorPage } from "./consortium-inspector.page";

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    ConsortiumInspectorPageRoutingModule,
  ],
  declarations: [ConsortiumInspectorPage],
})
export class ConsortiumInspectorPageModule {}
