import test, { Test } from "tape";
import { Strings } from "../../../../main/typescript/strings";

test("Strings#replaceAll() replaces strings", async (assert: Test) => {
  const originalString = "This is a original original string for a test";

  const replace = Strings.replaceAll(originalString, "original", "new");

  assert.equal(replace, "This is a new new string for a test");
  assert.end();
});
