import path from "path";
import "jest-extended";
import temp from "temp";
import fs from "fs-extra";
import { LogLevelDesc } from "@hyperledger/cactus-common";
import {
  Containers,
  RustcBuildCmd,
  RustcContainer,
} from "../../../../main/typescript/public-api";
const testCase = "compiles Rust code to NodeJS targeted .wasm";
describe(testCase, () => {
  type HelloWorldExports = {
    hello_world: () => string;
    say_hello: (name: string) => string;
  };

  const logLevel: LogLevelDesc = "TRACE";

  let rustcContainer: RustcContainer;

  beforeAll(async () => {
    rustcContainer = new RustcContainer({ logLevel });
  });

  afterAll(async () => await rustcContainer.stop());
  afterAll(async () => await temp.cleanup());

  test(testCase, async () => {
    const tmpDirAffix = "cactus-test-tooling-rustc-container-test";
    temp.track();
    const hostSourceDir = await temp.mkdir(tmpDirAffix);

    const srcDir = path.join(hostSourceDir, "./src/");
    await fs.mkdir(srcDir);

    expect(rustcContainer).toBeTruthy();

    const dockerodeContainer = await rustcContainer.start();
    expect(dockerodeContainer).toBeTruthy();

    const containerPkDir = path.join(rustcContainer.cwd, "./pkg/");

    const cargoTomlHostDir = path.join(
      __dirname,
      "../../../rust/fixtures/wasm-hello-world/",
    );
    const putCargoTomlRes = await Containers.putFile({
      containerOrId: dockerodeContainer,
      dstFileDir: rustcContainer.cwd,
      dstFileName: "Cargo.toml",
      srcFileDir: cargoTomlHostDir,
      srcFileName: "Cargo.toml",
    });
    expect(putCargoTomlRes);
    expect(putCargoTomlRes.statusCode);
    expect(putCargoTomlRes.statusCode).toEqual(200);

    const containerSrcDir = path.join(rustcContainer.cwd, "./src/");
    await Containers.exec(dockerodeContainer, ["mkdir", containerSrcDir]);

    const libRsHostDir = path.join(
      __dirname,
      "../../../rust/fixtures/wasm-hello-world/src/",
    );
    const putLibRsRes = await Containers.putFile({
      containerOrId: dockerodeContainer,
      dstFileDir: containerSrcDir,
      dstFileName: "lib.rs",
      srcFileDir: libRsHostDir,
      srcFileName: "lib.rs",
    });
    expect(putLibRsRes).toBeTruthy();
    expect(putLibRsRes.statusCode).toBeTruthy();
    expect(putLibRsRes.statusCode).toEqual(200);

    const wasmPackBuildOut = await Containers.exec(
      dockerodeContainer,
      RustcBuildCmd.WASM_PACK_BUILD_NODEJS,
    );
    expect(wasmPackBuildOut).toBeTruthy();

    // The list of files the wasm-pack NodeJS target produces
    const expectedFiles = [
      ".gitignore",
      "hello_world.d.ts",
      "hello_world.js",
      "hello_world_bg.wasm",
      "hello_world_bg.wasm.d.ts",
      "package.json",
    ];

    const filesOnFs = await Containers.ls(dockerodeContainer, containerPkDir);
    expect(filesOnFs).toBeTruthy();
    expect(Array.isArray(filesOnFs)).toBe(true);
    expect(filesOnFs).toEqual(expectedFiles);

    const fileChecks = filesOnFs.map(async (fileName) => {
      const containerFilePath = path.join(containerPkDir, fileName);
      const hostFilePath = path.join(hostSourceDir, fileName);
      const contentsBuffer = await Containers.pullBinaryFile(
        dockerodeContainer,
        containerFilePath,
      );
      await fs.writeFile(hostFilePath, contentsBuffer);
      const { size } = await fs.stat(hostFilePath);
      return { contentsBuffer, size };
    });

    const fileChecksPromise = Promise.all(fileChecks);
    expect(fileChecksPromise).toBeTruthy();
    expect(fileChecksPromise).toResolve();

    const fileChecksResults = await fileChecksPromise;
    expect(fileChecksResults).toBeTruthy();
    expect(fileChecksResults).toBeArrayOfSize(filesOnFs.length);

    fileChecksResults.forEach(({ contentsBuffer, size }) => {
      expect(contentsBuffer).toBeTruthy();
      expect(contentsBuffer.length > 0).toBe(true);
      // expect(isFile).toBe(true);
      expect(size).toBeGreaterThan(0);
    });

    const wasmHostPath = path.join(hostSourceDir, "./hello_world.js");
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const wasmModule = require(wasmHostPath) as HelloWorldExports;
    const helloWorldOut = wasmModule.hello_world();
    expect(helloWorldOut).toBeTruthy();
    expect(helloWorldOut).toEqual("Hello World!");

    const greeting = wasmModule.say_hello("Peter");
    expect(greeting).toBeTruthy();
    expect(greeting).toEqual("Hello Peter!");
  });
});
