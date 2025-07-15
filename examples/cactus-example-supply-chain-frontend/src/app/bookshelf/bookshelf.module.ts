import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule, ReactiveFormsModule } from "@angular/forms";

import { IonicModule } from "@ionic/angular";

import { BookshelfPageRoutingModule } from "./bookshelf-routing.module";

import { BookshelfListPage } from "./bookshelf-list/bookshelf-list.page";
import { PageHeadingComponentModule } from "../common/components/page-heading-component.module";
import { BookshelfDetailPage } from "./bookshelf-detail/bookshelf-detail.page";
import { BookshelfViewModalComponent } from "./bookshelf-view-modal/bookshelf-view-modal.component";

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    IonicModule,
    BookshelfPageRoutingModule,
    PageHeadingComponentModule,
  ],
  declarations: [
    BookshelfListPage,
    BookshelfDetailPage,
    BookshelfViewModalComponent,
  ],
})
export class BookshelfPageModule {}
