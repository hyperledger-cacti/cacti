import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule, ReactiveFormsModule } from "@angular/forms";

import { IonicModule } from "@ionic/angular";

import { ShipmentPageRoutingModule } from "./shipment-routing.module";

import { ShipmentListPage } from "./shipment-list/shipment-list.page";
import { PageHeadingComponentModule } from "../common/page-heading/page-heading-component.module";
import { ShipmentDetailPage } from "./shipment-detail/shipment-detail.page";

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    IonicModule,
    ShipmentPageRoutingModule,
    PageHeadingComponentModule,
  ],
  declarations: [ShipmentDetailPage, ShipmentListPage],
})
export class ShipmentPageModule {}
