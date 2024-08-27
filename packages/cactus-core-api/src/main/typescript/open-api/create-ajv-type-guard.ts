import type { ValidateFunction } from "ajv";

/**
 * Creates a TypeScript type guard based on an `ajv` validator.
 *
 * @template T The type of the data that the validator expects. This can be
 * one of the data model types that we generate from the OpenAPI specifications.
 * It could also be a schema that you defined in your code directly, but that is
 * not recommended since if you are going to define a schema then it's best to
 * do so within the Open API specification file(s) (`openapi.tpl.json` files).
 *
 * @param {ValidateFunction<T>} validator An `ajv` validator that validates data against a specific JSON schema.
 * You must make sure that this parameter was indeed constructed to validate the
 * specific `T` type that you are intending it for. See the example below for
 * further details on this.
 * @returns {(x: unknown) => x is T} A user-defined TypeScript type guard that
 * checks if an unknown value matches the schema defined in the validator and
 * also performs the ever-useful type-narrowing which helps writing less buggy
 * code and enhance the compiler's ability to catch issues during development.
 *
 * @example
 *
 * ### Define a validator for the `JWSGeneral` type from the openapi.json
 *
 * ```typescript
 * import Ajv from "ajv";
 *
 * import * as OpenApiJson from "../../json/openapi.json";
 * import { JWSGeneral } from "../generated/openapi/typescript-axios/api";
 * import { createAjvTypeGuard } from "./create-ajv-type-guard";
 *
 * export function createIsJwsGeneral(): (x: unknown) => x is JWSGeneral {
 *   const ajv = new Ajv();
 *   const validator = ajv.compile<JWSGeneral>(
 *     OpenApiJson.components.schemas.JWSGeneral,
 *   );
 *   return createAjvTypeGuard<JWSGeneral>(validator);
 * }
 * ```
 *
 * ### Then use it elsewhere in the code for validation & type-narrowing
 *
 * ```typescript
 * // make sure to cache the validator you created here because it's costly to
 * // re-create it (in terms of hardware resources such as CPU time)
 * const isJWSGeneral = createAjvTypeGuard<JWSGeneral>(validateJWSGeneral);
 *
 * const data: unknown = { payload: "some-payload" };
 *
 * if (!isJWSGeneral(data)) {
 *   throw new TypeError('Data is not a JWSGeneral object');
 * }
 * // Now you can safely access properties of data as a JWSGeneral object
 * // **without** having to perform unsafe type casting such as `as JWSGeneral`
 * console.log(data.payload);
 * console.log(data.signatures);
 * ```
 *
 */
export function createAjvTypeGuard<T>(
  validator: ValidateFunction<T>,
): (x: unknown) => x is T {
  return (x: unknown): x is T => {
    return validator(x);
  };
}
