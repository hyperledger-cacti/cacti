import { NgModule } from "@angular/core";
import { PreloadAllModules, RouterModule, Routes } from "@angular/router";

const routes: Routes = [
  {
    path: "",
    redirectTo: "consortiums/inspector",
    pathMatch: "full",
  },
  {
    path: "consortiums/inspector",
    loadChildren: () =>
      import("./consortium-inspector/consortium-inspector.module").then(
        (m) => m.ConsortiumInspectorPageModule
      ),
  },
];

@NgModule({
  imports: [
    RouterModule.forRoot(routes, { preloadingStrategy: PreloadAllModules }),
  ],
  exports: [RouterModule],
})
export class AppRoutingModule {}
