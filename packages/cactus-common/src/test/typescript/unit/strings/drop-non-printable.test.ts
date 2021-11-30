import { Strings } from "../../../../main/typescript/strings";
import "jest-extended";

test("Strings#dropNonPrintable()", async () => {
  const thisIsAString = "This is a phrase.";

  const nonDrop = Strings.dropNonPrintable(thisIsAString);
  const drop = Strings.dropNonPrintable("");

  expect(nonDrop).toEqual(thisIsAString);
  expect(drop).toEqual("");
});
