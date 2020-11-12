import test, { Test } from "tape";

import { v4 as uuidv4 } from "uuid";

import { Checks } from "../../../main/typescript";

test("Checks", (t: Test) => {
  test("Checks#nonBlankString()", (t2: Test) => {
    const subject = uuidv4();
    const pattern = new RegExp(`${subject}`);

    t2.throws(() => Checks.nonBlankString("", subject), pattern);
    t2.throws(() => Checks.nonBlankString(" ", subject), pattern);
    t2.throws(() => Checks.nonBlankString("\n", subject), pattern);
    t2.throws(() => Checks.nonBlankString("\t", subject), pattern);
    t2.throws(() => Checks.nonBlankString("\t\n", subject), pattern);
    t2.throws(() => Checks.nonBlankString("\n\r", subject), pattern);

    t2.doesNotThrow(() => Checks.nonBlankString("-"));
    t2.doesNotThrow(() => Checks.nonBlankString(" a "));
    t2.doesNotThrow(() => Checks.nonBlankString("\na\t"));

    t2.end();
  });

  t.end();
});
