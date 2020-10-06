import fs from "fs";

import test, { Test } from "tape";

import {
  ChainCodeCompiler,
  ICompilationOptions,
} from "../../../main/typescript/public-api";

import { HELLO_WORLD_CONTRACT_GO_SOURCE } from "../fixtures/go/hello-world-contract-fabric-v14/hello-world-contract-go-source";

test("compiles chaincode straight from go source code", async (t: Test) => {
  const compiler = new ChainCodeCompiler({ logLevel: "TRACE" });

  const opts: ICompilationOptions = {
    fileName: "hello-world-contract.go",
    moduleName: "hello-world-contract",
    pinnedDeps: ["github.com/hyperledger/fabric@v1.4.8"],
    sourceCode: HELLO_WORLD_CONTRACT_GO_SOURCE,
  };

  const result = await compiler.compile(opts);
  t.ok(result, "result OK");
  t.ok(result.binaryPath, "result.binaryPath OK");
  t.ok(result.goVersionInfo, "result.goVersionInfo OK");
  t.comment(result.goVersionInfo);

  const exists = fs.existsSync(result.binaryPath);
  t.true(exists, `Binary exists at path ${result.binaryPath}`);
});
