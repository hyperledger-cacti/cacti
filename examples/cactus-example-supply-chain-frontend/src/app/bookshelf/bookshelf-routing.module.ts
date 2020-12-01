import { NgModule } from "@angular/core";
import { Routes, RouterModule } from "@angular/router";

import { BookshelfListPage } from "./bookshelf-list/bookshelf-list.page";

const routes: Routes = [
  {
    path: "",
    component: BookshelfListPage,
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class BookshelfPageRoutingModule {}
