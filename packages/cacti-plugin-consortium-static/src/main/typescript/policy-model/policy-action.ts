import { IPolicy } from "./i-policy";
export interface PolicyAction extends IPolicy {
  execute(...args: unknown[]): Promise<boolean>;
}
