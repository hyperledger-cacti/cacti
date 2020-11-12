import test, { Test } from "tape";

import { Bools } from "../../../main/typescript/public-api";

test("Bools", (t: Test) => {
  test("Checks#isBooleanStrict()", (t2: Test) => {
    t2.true(Bools.isBooleanStrict(true), "Strictly true recognized OK");
    t2.true(Bools.isBooleanStrict(false), "Strictly false recognized OK");

    t2.false(Bools.isBooleanStrict(0), "0 not strictly bool OK");
    t2.false(Bools.isBooleanStrict(null), "null not strictly bool OK");
    t2.false(
      Bools.isBooleanStrict(undefined),
      "undefined not strictly bool OK"
    );
    t2.false(Bools.isBooleanStrict([]), "array not strictly bool OK");
    t2.false(Bools.isBooleanStrict({}), "object literal not strictly bool OK");
    t2.false(Bools.isBooleanStrict(+0), "+0 not strictly bool OK");
    t2.false(Bools.isBooleanStrict(-0), "-0 not strictly bool OK");

    t2.end();
  });

  t.end();
});
