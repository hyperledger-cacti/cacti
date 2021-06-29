import * as apiSurface from "../../../main/typescript/public-api";

test("Library can be loaded", async () => {
  expect(apiSurface).toBeTruthy();
});
