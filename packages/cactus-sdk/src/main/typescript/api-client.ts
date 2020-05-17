import { Objects } from "@hyperledger/cactus-common";
import {
  Configuration,
  DefaultApi,
} from "./generated/openapi/typescript-axios";

export class ApiClient extends DefaultApi {
  public extendWith<T extends {}>(
    ctor: new (configuration?: Configuration) => T
  ): T & this {
    const instance = new ctor(this.configuration) as any;
    const self = this as any;

    Objects.getAllMethodNames(instance).forEach(
      (method: string) => (self[method] = instance[method])
    );

    Objects.getAllFieldNames(instance).forEach(
      (field: string) => (self[field] = instance[field])
    );

    return this as T & this;
  }
}
