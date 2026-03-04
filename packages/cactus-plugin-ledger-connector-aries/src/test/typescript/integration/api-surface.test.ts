import * as apiSurface from "../../../main/typescript/public-api";
//TODO: Upgrade aries connector to Credo packages
test.skip("Library can be loaded", async () => {
  expect(apiSurface).toBeTruthy();
});
