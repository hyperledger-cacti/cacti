import test, { Test } from "tape";

import { v4 as uuidv4 } from "uuid";

import { Checks } from "../../../main/typescript";

test("Checks", (tParent: Test) => {
  test("Checks#nonBlankString()", (t: Test) => {
    const subject = uuidv4();
    const pattern = new RegExp(`${subject}`);

    t.throws(() => Checks.nonBlankString("", subject), pattern);
    t.throws(() => Checks.nonBlankString(" ", subject), pattern);
    t.throws(() => Checks.nonBlankString("\n", subject), pattern);
    t.throws(() => Checks.nonBlankString("\t", subject), pattern);
    t.throws(() => Checks.nonBlankString("\t\n", subject), pattern);
    t.throws(() => Checks.nonBlankString("\n\r", subject), pattern);

    t.doesNotThrow(() => Checks.nonBlankString("-"));
    t.doesNotThrow(() => Checks.nonBlankString(" a "));
    t.doesNotThrow(() => Checks.nonBlankString("\na\t"));

    t.end();
  });

  test("#truthy()", (t: Test) => {
    t.throws(() => Checks.truthy(false));
    t.throws(() => Checks.truthy(NaN));
    t.throws(() => Checks.truthy(null));
    t.throws(() => Checks.truthy(undefined));
    t.throws(() => Checks.truthy(0));
    t.throws(() => Checks.truthy(""));

    t.doesNotThrow(() => Checks.truthy({}));
    t.doesNotThrow(() => Checks.truthy([]));
    t.doesNotThrow(() => Checks.truthy("OK"));

    t.end();
  });

  tParent.end();
});
