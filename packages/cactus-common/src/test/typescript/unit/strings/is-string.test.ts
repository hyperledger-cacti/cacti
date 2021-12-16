import { Strings } from "../../../../main/typescript/strings";
import "jest-extended";

test("Strings#isString()", async () => {
  const thisIsAString = "This is a original string for a test";
  const thisIsANumber = 10;
  const thisIsABool = true;

  const testForString = Strings.isString(thisIsAString);
  const testForNotString1 = Strings.isString(thisIsANumber);
  const testForNotString2 = Strings.isString(thisIsABool);

  expect(testForString).toBe(true);
  expect(testForNotString1).not.toBe(true);
  expect(testForNotString2).not.toBe(true);
});
