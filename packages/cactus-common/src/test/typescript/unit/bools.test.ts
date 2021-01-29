import test, { Test } from "tape";

import { Bools } from "../../../main/typescript/public-api";

test("Bools", (tParent: Test) => {
  test("Checks#isBooleanStrict()", (t: Test) => {
    t.true(Bools.isBooleanStrict(true), "Strictly true recognized OK");
    t.true(Bools.isBooleanStrict(false), "Strictly false recognized OK");

    t.false(Bools.isBooleanStrict(0), "0 not strictly bool OK");
    t.false(Bools.isBooleanStrict(null), "null not strictly bool OK");
    t.false(Bools.isBooleanStrict(undefined), "undefined not strictly bool OK");
    t.false(Bools.isBooleanStrict([]), "array not strictly bool OK");
    t.false(Bools.isBooleanStrict({}), "object literal not strictly bool OK");
    t.false(Bools.isBooleanStrict(+0), "+0 not strictly bool OK");
    t.false(Bools.isBooleanStrict(-0), "-0 not strictly bool OK");

    t.end();
  });

  test("isBooleanStrict()", async (t: Test) => {
    t.true(Bools.isBooleanStrict(true));
    t.true(Bools.isBooleanStrict(false));

    t.false(Bools.isBooleanStrict(0));
    t.false(Bools.isBooleanStrict({}));
    t.false(Bools.isBooleanStrict([]));
    t.false(Bools.isBooleanStrict(null));
    t.false(Bools.isBooleanStrict(undefined));
    t.false(Bools.isBooleanStrict(-0));
    t.false(Bools.isBooleanStrict(+0));
    t.false(Bools.isBooleanStrict(new Date()));
    t.false(Bools.isBooleanStrict(""));
    t.false(Bools.isBooleanStrict(String("")));
    t.false(Bools.isBooleanStrict(Number("")));
    t.false(Bools.isBooleanStrict(Number(0)));
    t.false(Bools.isBooleanStrict(Infinity));
    t.false(Bools.isBooleanStrict(NaN));

    t.end();
  });

  tParent.end();
});
