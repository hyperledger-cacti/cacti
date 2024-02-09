import type { GetObjectRequestV1 } from "./../../generated/openapi/typescript-axios/index.js";
import type { GetObjectResponseV1 } from "./../../generated/openapi/typescript-axios/index.js";
import type { HasObjectRequestV1 } from "./../../generated/openapi/typescript-axios/index.js";
import type { SetObjectRequestV1 } from "./../../generated/openapi/typescript-axios/index.js";
import type { SetObjectResponseV1 } from "./../../generated/openapi/typescript-axios/index.js";
import type { HasObjectResponseV1 } from "./../../generated/openapi/typescript-axios/index.js";
import type { ICactusPlugin } from "../i-cactus-plugin.js";
import type { IPluginWebService } from "../web-service/i-plugin-web-service.js";

/**
 * Common interface to be implemented by classes that act as plugins behind
 * object stores.
 */
export interface IPluginObjectStore extends ICactusPlugin, IPluginWebService {
  has(req: HasObjectRequestV1): Promise<HasObjectResponseV1>;
  get(req: GetObjectRequestV1): Promise<GetObjectResponseV1>;
  set(req: SetObjectRequestV1): Promise<SetObjectResponseV1>;
}
