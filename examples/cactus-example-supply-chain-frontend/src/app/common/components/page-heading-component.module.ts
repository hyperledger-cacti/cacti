import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { IonicModule } from "@ionic/angular";
import { PageHeadingComponent } from "./page-heading.component";

@NgModule({
  declarations: [PageHeadingComponent],
  exports: [PageHeadingComponent],
  imports: [CommonModule, IonicModule],
})
export class PageHeadingComponentModule {}
