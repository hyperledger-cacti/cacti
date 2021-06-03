import { Strings } from "@hyperledger/cactus-common";
import { Options } from "express-jwt";

export function isExpressJwtOptions(x: unknown): x is Options {
  return (
    !!x &&
    typeof x === "object" &&
    Array.isArray((x as Options).algorithms) &&
    Strings.isString((x as Options).secret)
  );
}
