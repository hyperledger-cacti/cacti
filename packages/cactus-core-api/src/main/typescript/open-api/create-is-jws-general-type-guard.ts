import Ajv from "ajv-draft-04";
import addFormats from "ajv-formats";

import * as OpenApiJson from "../../json/openapi.json";
import { JWSGeneral } from "../generated/openapi/typescript-axios/api";
import { createAjvTypeGuard } from "./create-ajv-type-guard";

/**
 *
 * @example
 *
 * ```typescript
 * import { JWSGeneral } from "@hyperledger/cactus-core-api";
 * import { createIsJwsGeneralTypeGuard } from "@hyperledger/cactus-core-api";
 *
 * export class PluginConsortiumManual {
 *   private readonly isJwsGeneral: (x: unknown) => x is JWSGeneral;
 *
 *   constructor() {
 *     // Creating the type-guard function is relatively costly due to the Ajv schema
 *     // compilation that needs to happen as part of it so it is good practice to
 *     // cache the type-guard function as much as possible, for example by adding it
 *     // as a class member on a long-lived object such as a plugin instance which is
 *     // expected to match the life-cycle of the API server NodeJS process itself.
 *     // The specific anti-pattern would be to create a new type-guard function
 *     // for each request received by a plugin as this would affect performance
 *     // negatively.
 *     this.isJwsGeneral = createIsJwsGeneralTypeGuard();
 *   }
 *
 *   public async getNodeJws(): Promise<JWSGeneral> {
 *     // rest of the implementation that produces a JWS ...
 *     const jws = await joseGeneralSign.sign();
 *
 *     if (!this.isJwsGeneral(jws)) {
 *       throw new TypeError("Jose GeneralSign.sign() gave non-JWSGeneral type");
 *     }
 *     return jws;
 *   }
 * }
 *
 * ```
 *
 * @returns A user-defined Typescript type-guard (which is just another function)
 * that is primed to do type-narrowing and runtime type-checking as well.
 *
 * @see {createAjvTypeGuard()}
 * @see https://www.typescriptlang.org/docs/handbook/2/narrowing.html
 * @see https://www.typescriptlang.org/docs/handbook/2/narrowing.html#using-type-predicates
 */
export function createIsJwsGeneralTypeGuard(): (x: unknown) => x is JWSGeneral {
  const ajv = new Ajv({ allErrors: true, strict: false });
  addFormats(ajv);
  ajv.addSchema(OpenApiJson, "core-api");

  const validator = ajv.compile<JWSGeneral>({
    $ref: "core-api#/components/schemas/JWSGeneral",
  });

  return createAjvTypeGuard<JWSGeneral>(validator);
}
