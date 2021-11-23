import test, { Test } from "tape";
import { Strings } from "../../../../main/typescript/strings";

test("Strings#isString()", async (assert: Test) => {
  const thisIsAString = "This is a original string for a test";
  const thisIsANumber = 10;
  const thisIsABool = true;

  const testForString = Strings.isString(thisIsAString);
  const testForNotString1 = Strings.isString(thisIsANumber);
  const testForNotString2 = Strings.isString(thisIsABool);

  assert.true(testForString);
  assert.false(testForNotString1);
  assert.false(testForNotString2);

  assert.end();
});
