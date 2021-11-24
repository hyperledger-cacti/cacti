import { Strings } from "../../../../main/typescript/strings";
import "jest-extended";

test("Strings#replaceAll() replaces strings", async () => {
  const originalString = "This is a original original string for a test";

  const replace = Strings.replaceAll(originalString, "original", "new");

  expect(replace).toEqual("This is a new new string for a test");
});
