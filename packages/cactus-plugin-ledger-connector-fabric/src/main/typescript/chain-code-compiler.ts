import fs from "fs";
import path from "path";

import temp from "temp";

import {
  Bools,
  Logger,
  Checks,
  LogLevelDesc,
  LoggerProvider,
} from "@hyperledger/cactus-common";

export interface IChainCodeCompilerOptions {
  logLevel?: LogLevelDesc;
}

export interface ICompilationOptions {
  /**
   * The go source code to be compiled
   */
  sourceCode: string;

  /**
   * The file name that `sourceCode` belongs to (e.g. the contents of)
   */
  fileName: string;

  /**
   * The go module name that will be used when running `go mod init $MOD_NAME`
   */
  moduleName?: string;

  /**
   * A list of strings that will be fed to `go get ...` in order to ensure the
   * dependencies are pinned to the version specified here. For example to
   * compile chaincode with Fabric 1.4 you need to pin this by adding it to the
   * array:
   * `github.com/hyperledger/fabric@v1.4.8`
   */
  pinnedDeps?: string[];

  /**
   * When set to `true` instructs the compiler to skip vendoring and building
   * which significantly speeds up the processing and will result in only the
   * go.mod file being generated with the indirect dependencies populated.
   * This is enough for the case when you are deploying to a Fabric peer which
   * will do the installation itself (which includes building the go binary).
   *
   * Note that when this flag is set to `true` the `binaryPath` in the result
   * will be null since there was no binary produced.
   */
  modTidyOnly?: boolean;
}

export interface ICompilationResult {
  binaryPath: string;
  goVersionInfo: string;
  sourceFilePath: string;
  goModFilePath: string;
}

export class ChainCodeCompiler {
  private readonly log: Logger;

  constructor(public readonly options: IChainCodeCompilerOptions) {
    const fnTag = "ChainCodeCompiler#constructor()";
    Checks.truthy(options, `${fnTag} arg options`);

    const level = this.options.logLevel || "INFO";
    const label = "chain-code-compiler";
    this.log = LoggerProvider.getOrCreate({ level, label });
  }

  public async compile(
    options: ICompilationOptions
  ): Promise<ICompilationResult> {
    const fnTag = "ChainCodeCompiler#compile()";
    Checks.truthy(options, `${fnTag} options`);
    options.pinnedDeps = options.pinnedDeps || [];
    options.moduleName = options.moduleName || "cactus-chaincode-go-module";

    let modTidyOnly;
    if (Bools.isBooleanStrict(options.modTidyOnly)) {
      modTidyOnly = options.modTidyOnly;
    } else {
      modTidyOnly = false; // default value for this parameter is `false`
    }

    // Automatically track and cleanup files at exit
    temp.track();

    const dirPath = temp.mkdirSync("cactus-chain-code-compiler");
    this.log.debug(`Temporary directory for compilation: ${dirPath}`);

    const ngoOptions = {
      useLocal: true, // use locally downloaded Go binaries)
      update: false, // update local install to latest
      installDeps: false, // attempt to install missing packages
      env: {
        // environment vars to set for the Go command
        GO111MODULE: "on", // ensures go.mod file is used
      },
    };

    const sourceFilePath = path.join(dirPath, options.fileName);
    const goModFilePath = path.join(dirPath, "go.mod");
    fs.writeFileSync(sourceFilePath, options.sourceCode);

    const ngo = require("ngo")(ngoOptions);

    // {
    //   command: "/.../cactus-plugin-ledger-connector-fabric/node_modules/ngo/vendor/go/bin/go mod init cactus-chaincode-go-module",
    //   exitCode: 0,
    //   stdout: "",
    //   stderr: "go: creating new go.mod: module cactus-chaincode-go-module",
    //   all: undefined,
    //   failed: false,
    //   timedOut: false,
    //   isCanceled: false,
    //   killed: false,
    // }

    const { stdout: goVersionInfo } = await ngo(["version"], { cwd: dirPath });
    try {
      {
        const cmdArgs = ["mod", "init", options.moduleName];
        const proc = await ngo(cmdArgs, { cwd: dirPath });
        Checks.truthy(proc.exitCode === 0, `0 exit code of go mod init`);
      }

      for (const dep of options.pinnedDeps) {
        const proc = await ngo(["get", dep], { cwd: dirPath });
        Checks.truthy(proc.exitCode === 0, `0 exit code of go get ${dep}`);
      }

      {
        const cmdArgs = ["mod", "tidy"];
        const proc = await ngo(cmdArgs, { cwd: dirPath });
        Checks.truthy(proc.exitCode === 0, `0 exit code of go mod tidy`);
      }

      {
        const cmdArgs = ["mod", "vendor"];
        const proc = await ngo(cmdArgs, { cwd: dirPath });
        Checks.truthy(proc.exitCode === 0, `0 exit code of go mod vendor`);
      }

      {
        this.log.debug(`Running go process...`);
        const proc = await ngo(["build"], { cwd: dirPath });
        Checks.truthy(proc.exitCode === 0, `0 exit code of go build`);
        this.log.debug(`Ran go process OK %o`, proc);
      }

      const binaryPath = path.join(dirPath, options.moduleName);
      return {
        binaryPath,
        goVersionInfo,
        sourceFilePath,
        goModFilePath,
      };
    } finally {
      temp.cleanup();
    }
  }
}
