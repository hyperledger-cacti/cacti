import { Component, Input } from "@angular/core";

@Component({
  selector: "app-page-heading",
  templateUrl: "page-heading.component.html",
  styleUrls: [],
})
export class PageHeadingComponent {
  @Input()
  public pageTitle: string;
}
