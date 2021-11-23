import "jest-extended";

import { Bools } from "../../../main/typescript/public-api";

describe("Bools", () => {
  test("Checks#isBooleanStrict()", () => {
    expect(Bools.isBooleanStrict(true)).toBe(true);
    expect(Bools.isBooleanStrict(false)).toBe(true);

    expect(Bools.isBooleanStrict(0)).not.toBe(true);
    expect(Bools.isBooleanStrict(null)).not.toBe(true);
    expect(Bools.isBooleanStrict(undefined)).not.toBe(true);
    expect(Bools.isBooleanStrict([])).not.toBe(true);
    expect(Bools.isBooleanStrict({})).not.toBe(true);
    expect(Bools.isBooleanStrict(+0)).not.toBe(true);
    expect(Bools.isBooleanStrict(-0)).not.toBe(true);
  });

  test("isBooleanStrict()", async () => {
    expect(Bools.isBooleanStrict(true)).toBe(true);
    expect(Bools.isBooleanStrict(false)).toBe(true);

    expect(Bools.isBooleanStrict(0));
    expect(Bools.isBooleanStrict({}));
    expect(Bools.isBooleanStrict([]));
    expect(Bools.isBooleanStrict(null));
    expect(Bools.isBooleanStrict(undefined));
    expect(Bools.isBooleanStrict(-0));
    expect(Bools.isBooleanStrict(+0));
    expect(Bools.isBooleanStrict(new Date()));
    expect(Bools.isBooleanStrict(""));
    expect(Bools.isBooleanStrict(String("")));
    expect(Bools.isBooleanStrict(Number("")));
    expect(Bools.isBooleanStrict(Number(0)));
    expect(Bools.isBooleanStrict(Infinity));
    expect(Bools.isBooleanStrict(NaN));
  });
});
