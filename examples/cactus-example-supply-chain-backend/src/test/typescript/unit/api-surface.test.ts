import * as apiSurface from "../../../main/typescript/public-api";
import "jest-extended";

test("Public API module can be loaded", () => {
  expect(apiSurface).toBeTruthy();
});
