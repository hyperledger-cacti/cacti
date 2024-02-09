import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule, ReactiveFormsModule } from "@angular/forms";

import { IonicModule } from "@ionic/angular";

import { BookshelfPageRoutingModule } from "./bookshelf-routing.module.js";

import { BookshelfListPage } from "./bookshelf-list/bookshelf-list.page.js";
import { PageHeadingComponentModule } from "../common/page-heading/page-heading-component.module.js";
import { BookshelfDetailPage } from "./bookshelf-detail/bookshelf-detail.page.js";

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
