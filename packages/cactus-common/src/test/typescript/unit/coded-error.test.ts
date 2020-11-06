import test, { Test } from "tape";
import { CodedError } from "../../../main/typescript/coded-error";

test("Error test", async (assert: Test) => {
  const oneMessage = "This is a error...";
  const oneCode = 1;

  const err = (message: string, code: string): boolean => {
    const e = new CodedError(message, code);
    return e.sameCode(e);
  };

  assert.true(err(oneMessage, `${oneCode}`));
  assert.end();
});
