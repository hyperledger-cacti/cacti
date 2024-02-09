import * as apiSurface from "../../../main/typescript/public-api.js";
import "jest-extended";

test("Public API module can be loaded", () => {
  expect(apiSurface).toBeTruthy();
});
