import { CodedError } from "../../../main/typescript/coded-error";
import "jest-extended";

test("Error test", async () => {
  const oneMessage = "This is an error...";
  const oneCode = 1;

  const err = (message: string, code: string): boolean => {
    const e = new CodedError(message, code);
    return e.sameCode(e);
  };

  expect(err(oneMessage, `${oneCode}`)).toBe(true);
});
