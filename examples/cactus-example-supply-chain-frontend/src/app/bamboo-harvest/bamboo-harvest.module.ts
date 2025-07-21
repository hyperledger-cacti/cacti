import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule, ReactiveFormsModule } from "@angular/forms";

import { IonicModule } from "@ionic/angular";

import { BambooHarvestPageRoutingModule } from "./bamboo-harvest-routing.module";
import { BambooHarvestListPage } from "./bamboo-harvest-list/bamboo-harvest-list.page";
import { BambooHarvestDetailPage } from "./bamboo-harvest-detail/bamboo-harvest-detail.page";
import { BambooHarvestViewModalComponent } from "./bamboo-harvest-view-modal/bamboo-harvest-view-modal.component";
import { PageHeadingComponentModule } from "../common/components/page-heading-component.module";

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    BambooHarvestPageRoutingModule,
    ReactiveFormsModule,
    PageHeadingComponentModule,
  ],
  declarations: [
    BambooHarvestListPage,
    BambooHarvestDetailPage,
    BambooHarvestViewModalComponent,
  ],
})
export class BambooHarvestPageModule {}
