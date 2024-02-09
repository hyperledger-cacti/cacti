import * as apiSurface from "../../../main/typescript/public-api.js";

test("Library can be loaded", async () => {
  expect(apiSurface).toBeTruthy();
});
