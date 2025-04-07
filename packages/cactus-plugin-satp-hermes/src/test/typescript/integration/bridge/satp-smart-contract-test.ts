import { expressConnectMiddleware } from "@connectrpc/connect-express";
import * as fs from "fs";

let testDirectoryPath = "./satp-smart-contract-test-temp-dir";

beforeAll(async() => {
  if (!fs.existsSync(testDirectoryPath)){
    const r1 = fs.mkdirSync(testDirectoryPath);
    expect(r1).not.toBeUndefined;
    expect(r1).not.toBeNull;
  }
  

});

describe("Smart Contract Deployment Json Test", () => {
  it("Should ")
});
