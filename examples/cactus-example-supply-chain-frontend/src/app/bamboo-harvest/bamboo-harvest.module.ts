import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule, ReactiveFormsModule } from "@angular/forms";

import { IonicModule } from "@ionic/angular";

import { BambooHarvestPageRoutingModule } from "./bamboo-harvest-routing.module";

import { BambooHarvestListPage } from "./bamboo-harvest-list/bamboo-harvest-list.page";
import { PageHeadingComponentModule } from "../common/page-heading/page-heading-component.module";
import { BambooHarvestDetailPage } from "./bamboo-harvest-detail/bamboo-harvest-detail.page";

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    IonicModule,
    BambooHarvestPageRoutingModule,
    PageHeadingComponentModule,
  ],
  declarations: [BambooHarvestDetailPage, BambooHarvestListPage],
})
export class BambooHarvestPageModule {}
