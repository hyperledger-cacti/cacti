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
      import("./bamboo-harvest/bamboo-harvest.module").then(
        (m) => m.BambooHarvestPageModule,
      ),
  },
  {
    path: "bookshelf-list",
    loadChildren: () =>
      import("./bookshelf/bookshelf.module").then((m) => m.BookshelfPageModule),
  },
  {
    path: "shipment-list",
    loadChildren: () =>
      import("./shipment/shipment.module").then((m) => m.ShipmentPageModule),
  },
  {
    path: "manufacturer-data-list",
    loadChildren: () =>
      import("./manufacturer-data/manufacturer-data.module").then(
        (m) => m.ManufacturerDataModule,
      ),
  },
  {
    path: "role-manager",
    loadChildren: () =>
      import("./role-manager/role-manager.module").then(
        (m) => m.RoleManagerPageModule,
      ),
  },
  {
    path: "payment",
    loadChildren: () =>
      import("./payment/payment.module").then((m) => m.PaymentModule),
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
