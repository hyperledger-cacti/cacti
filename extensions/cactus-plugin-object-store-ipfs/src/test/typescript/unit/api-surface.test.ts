import * as apiSurface from "../../../main/typescript/public-api";
import "jest-extended";

test("Library can be loaded", async () => {
  expect(apiSurface).toBeTruthy();
});
