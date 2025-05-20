import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule, ReactiveFormsModule } from "@angular/forms";
import { IonicModule } from "@ionic/angular";

import { ManufacturerDataPageRoutingModule } from "./manufacturer-data-routing.module";
import { ManufacturerDataListPage } from "./manufacturer-data-list/manufacturer-data-list.page";
import { ManufacturerDataDetailPage } from "./manufacturer-data-detail/manufacturer-data-detail.page";
import { PageHeadingComponentModule } from "../common/components/page-heading-component.module";

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    IonicModule,
    ManufacturerDataPageRoutingModule,
    PageHeadingComponentModule,
  ],
  declarations: [ManufacturerDataListPage, ManufacturerDataDetailPage],
})
export class ManufacturerDataModule {}
