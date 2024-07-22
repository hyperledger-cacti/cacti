import { IPolicy } from "./i-policy";
import { Checks } from "@hyperledger/cactus-common";
export interface IPolicyItemOptions {
  name: string;
  caption: string;
  description: string;
  id: string;
}
export class PolicyItem implements IPolicy {
  name: string;
  caption: string;
  description: string;
  id: string;

  constructor(options: IPolicyItemOptions) {
    Checks.nonBlankString(options.name);
    Checks.nonBlankString(options.caption);
    Checks.nonBlankString(options.description);
    Checks.nonBlankString(options.id);
    this.name = options.name;
    this.caption = options.caption;
    this.description = options.description;
    this.id = options.id;
  }

  public getName(): string {
    return this.name;
  }
  public getCaption(): string {
    return this.caption;
  }
  public getDescription(): string {
    return this.description;
  }
  public getId(): string {
    return this.id;
  }

  public asIPolicy(): IPolicy {
    return {
      name: this.getName(),
      caption: this.getCaption(),
      description: this.getDescription(),
      id: this.getId(),
    };
  }
}
