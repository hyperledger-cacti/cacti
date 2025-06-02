import { Component, Input } from "@angular/core";

@Component({
  selector: "app-page-heading",
  templateUrl: "./page-heading.component.html",
})
export class PageHeadingComponent {
  @Input() title: string = "";
}
