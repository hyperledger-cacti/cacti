import { NgModule } from "@angular/core";
import { PreloadAllModules, RouterModule, Routes } from "@angular/router";

const routes: Routes = [
  {
    path: "",
    redirectTo: "bamboo-harvest-list",
    pathMatch: "full",
  },
  {
    path: "bamboo-harvest-list",
    loadChildren: () =>
      import("./bamboo-harvest/bamboo-harvest.module.js").then(
        (m) => m.BambooHarvestPageModule,
      ),
  },
  {
    path: "bookshelf-list",
    loadChildren: () =>
      import("./bookshelf/bookshelf.module.js").then(
        (m) => m.BookshelfPageModule,
      ),
  },
  {
    path: "shipment-list",
    loadChildren: () =>
      import("./shipment/shipment.module.js").then((m) => m.ShipmentPageModule),
  },
];

@NgModule({
  imports: [
    RouterModule.forRoot(routes, {
      preloadingStrategy: PreloadAllModules,
    }),
  ],
  exports: [RouterModule],
})
export class AppRoutingModule {}
