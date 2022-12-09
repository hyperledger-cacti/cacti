import { Strings } from "@hyperledger/cactus-common";
import { Params } from "express-jwt";

export function isExpressJwtOptions(x: unknown): x is Params {
  return (
    !!x &&
    typeof x === "object" &&
    Array.isArray((x as Params).algorithms) &&
    Strings.isString((x as Params).secret)
  );
}
