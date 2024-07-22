import { IPolicy } from "./i-policy";

export interface PolicyCondition extends IPolicy {
  evaluate(...args: unknown[]): Promise<boolean>;
}
