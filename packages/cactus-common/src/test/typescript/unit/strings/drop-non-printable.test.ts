import test, { Test } from "tape";
import { Strings } from "../../../../main/typescript/strings";

test("Strings#dropNonPrintable()", async (assert: Test) => {
  const thisIsAString = "This is a phrase.";

  const nonDrop = Strings.dropNonPrintable(thisIsAString);
  const drop = Strings.dropNonPrintable("");

  assert.equal(nonDrop, thisIsAString);
  assert.equal(drop, "");
  assert.end();
});
