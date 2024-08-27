import "jest-extended";

import { JWSGeneral } from "../../../../main/typescript/generated/openapi/typescript-axios/api";
import { createIsJwsGeneralTypeGuard } from "../../../../main/typescript/open-api/create-is-jws-general-type-guard";

describe("createIsJwsGeneralTypeGuard()", () => {
  it("creates JWSGeneral type-guards that work", () => {
    const isJwsGeneral = createIsJwsGeneralTypeGuard();

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
