import "jest-extended";
import Ajv from "ajv-draft-04";
import addFormats from "ajv-formats";

import * as OpenApiJson from "../../../../main/json/openapi.json";
import { JWSGeneral } from "../../../../main/typescript/generated/openapi/typescript-axios/api";
import { createAjvTypeGuard } from "../../../../main/typescript/open-api/create-ajv-type-guard";

describe("createAjvTypeGuard()", () => {
  it("creates Generic type-guards that work", () => {
    const ajv = new Ajv({ allErrors: true, strict: false });
    addFormats(ajv);
    ajv.addSchema(OpenApiJson, "core-api");

    const validator = ajv.compile<JWSGeneral>({
      $ref: "core-api#/components/schemas/JWSGeneral",
    });

    const isJwsGeneral = createAjvTypeGuard<JWSGeneral>(validator);

    const jwsGeneralGood1: JWSGeneral = { payload: "stuff", signatures: [] };
    const jwsGeneralBad1 = { payload: "stuff", signatures: {} } as JWSGeneral;
    const jwsGeneralBad2 = { payload: "", signatures: {} } as JWSGeneral;

    expect(isJwsGeneral(jwsGeneralGood1)).toBeTrue();
    expect(isJwsGeneral(jwsGeneralBad1)).toBeFalse();
    expect(isJwsGeneral(jwsGeneralBad2)).toBeFalse();

    // verify type-narrowing to be working
    const jwsGeneralGood2: unknown = { payload: "stuff", signatures: [] };
    if (!isJwsGeneral(jwsGeneralGood2)) {
      throw new Error("isJwsGeneral test misclassified valid JWSGeneral.");
    }
    expect(jwsGeneralGood2.payload).toEqual("stuff");
  });
});
