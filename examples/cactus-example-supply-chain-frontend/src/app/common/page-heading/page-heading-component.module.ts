import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { ReactiveFormsModule, FormsModule } from "@angular/forms";

import { IonicModule } from "@ionic/angular";

import { PageHeadingComponent } from "./page-heading.component";

@NgModule({
  imports: [CommonModule, FormsModule, ReactiveFormsModule, IonicModule],
  declarations: [PageHeadingComponent],
  exports: [PageHeadingComponent],
})
export class PageHeadingComponentModule {}
