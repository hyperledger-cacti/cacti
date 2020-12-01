import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule, ReactiveFormsModule } from "@angular/forms";

import { IonicModule } from "@ionic/angular";

import { BookshelfPageRoutingModule } from "./bookshelf-routing.module";

import { BookshelfListPage } from "./bookshelf-list/bookshelf-list.page";
import { PageHeadingComponentModule } from "../common/page-heading/page-heading-component.module";
import { BookshelfDetailPage } from "./bookshelf-detail/bookshelf-detail.page";

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    IonicModule,
    BookshelfPageRoutingModule,
    PageHeadingComponentModule,
  ],
  declarations: [BookshelfDetailPage, BookshelfListPage],
})
export class BookshelfPageModule {}
