import fs from "fs";
import path from "path";

import { Express, Request, Response } from "express";
import temp from "temp";
import { NodeSSH, Config as SshConfig, SSHExecCommandOptions } from "node-ssh";

import {
  Logger,
  LoggerProvider,
  LogLevelDesc,
  Checks,
} from "@hyperledger/cactus-common";

import {
  IWebServiceEndpoint,
  IExpressRequestHandler,
} from "@hyperledger/cactus-core-api";

import { registerWebServiceEndpoint } from "@hyperledger/cactus-core";

import { ISigningIdentity } from "./i-fabric-signing-identity";
import { DeployContractGoBinEndpointV1 as Constants } from "./deploy-contract-go-bin-endpoint-constants";

export interface IDeployContractGoBinEndpointV1Options {
  logLevel?: LogLevelDesc;
  path: string;
  corePeerAddress?: string;
  coreChaincodeIdName?: string;
  sshConfig: SshConfig;
  connectionProfile: any;
  adminSigningIdentity: ISigningIdentity;
}

export class DeployContractGoBinEndpointV1 implements IWebServiceEndpoint {
  private readonly log: Logger;

  constructor(public readonly opts: IDeployContractGoBinEndpointV1Options) {
    const fnTag = "DeployContractGoBinEndpointV1#constructor()";

    Checks.truthy(opts, `${fnTag} options`);
    Checks.truthy(opts.path, `${fnTag} options.path`);
    Checks.truthy(opts.sshConfig, `${fnTag} options.sshConfig`);
    Checks.truthy(opts.connectionProfile, `${fnTag} options.connectionProfile`);

    this.log = LoggerProvider.getOrCreate({
      label: "deploy-contract-go-bin-endpoint-v1",
      level: opts.logLevel || "INFO",
    });
  }

  public getExpressRequestHandler(): IExpressRequestHandler {
    return this.handleRequest.bind(this);
  }

  getPath(): string {
    return Constants.HTTP_PATH;
  }

  getVerbLowerCase(): string {
    return Constants.HTTP_VERB_LOWER_CASE;
  }

  registerExpress(app: Express): IWebServiceEndpoint {
    registerWebServiceEndpoint(app, this);
    return this;
  }

  async handleRequest(req: Request, res: Response): Promise<void> {
    const fnTag = "DeployContractGoBinEndpointV1#handleRequest()";
    this.log.debug(`POST ${this.getPath()}`);

    try {
      const body = await this.doDeploy(req);
      res.status(200);
      res.json(body);
    } catch (ex) {
      this.log.error(`${fnTag} failed to serve request`, ex);
      res.status(500);
      res.statusMessage = ex.message;
      res.json({ error: ex.stack });
    }
  }

  private async doDeploy(req: Request): Promise<any> {
    const fnTag = "DeployContractGoBinEndpointV1#doDeploy()";

    this.log.debug(`ENTER doDeploy()`);
    try {
      const { sshConfig, connectionProfile, adminSigningIdentity } = this.opts;
      if (!Array.isArray(req.files)) {
        throw new TypeError(`${fnTag} expected req.files to be an array`);
      }
      const goSourceFile = req.files.find((f) =>
        f.originalname.endsWith(".go")
      );
      if (!goSourceFile) {
        throw new Error(`${fnTag} .go source file not among uploaded files`);
      }
      const goPath = "/root/go/";
      const ccName = path.basename(goSourceFile.originalname, ".go");
      const remoteDirPath = path.join(goPath, "src/", ccName);

      temp.track();
      const tmpDirPath = temp.mkdirSync("deploy-contract-go-bin-endpoint-v1");

      const ssh = new NodeSSH();
      await ssh.connect(sshConfig);
      this.log.debug(`SSH connection OK`);

      if (Array.isArray(req.files)) {
        for (const aFile of req.files) {
          const localFilePath = path.join(tmpDirPath, aFile.originalname);
          fs.writeFileSync(localFilePath, aFile.buffer, "binary");

          const remoteFilePath = path.join(remoteDirPath, aFile.originalname);

          this.log.debug(`SCP from/to %o => %o`, localFilePath, remoteFilePath);
          await ssh.putFile(localFilePath, remoteFilePath);
          this.log.debug(`SCP OK %o`, remoteFilePath);
        }
      } else {
        throw new TypeError(`${fnTag} expected req.files to be an array`);
      }

      const env = {
        CORE_PEER_ADDRESS: "localhost:7051",
        CORE_PEER_LOCALMSPID: "Org1MSP",
        CORE_VM_DOCKER_ATTACHSTDOUT: "true",
        FABRIC_LOGGING_SPEC: "DEBUG",
        CORE_PEER_MSPCONFIGPATH:
          "/etc/hyperledger/fabric/peer/users/Admin@org1.cactus.stream/msp",

        // CORE_PEER_ADDRESS: this.opts.corePeerAddress || "localhost:7051",
        CORE_CHAINCODE_ID_NAME: this.opts.coreChaincodeIdName || "mycc:0",
      };
      const sshCmdOptions: SSHExecCommandOptions = {
        execOptions: {
          pty: true,
        },
        cwd: remoteDirPath,
      };

      const cmdEnv = Object.entries(env)
        .map(([key, value]) => `${key}=${value}`)
        .join(" ");

      const ccVersion = "1.0.0";
      const ccBinPath = ccName;
      const cmdArgs = `--name ${ccName} --version ${ccVersion} -p ${ccBinPath}`;
      const installCmd = `${cmdEnv} peer chaincode install ${cmdArgs}`;

      this.log.debug(`Install CMD: %o`, installCmd);
      const installCmdRes = await ssh.execCommand(installCmd, sshCmdOptions);
      this.log.debug(`Install CMD Response: %o`, installCmdRes);
      let success = true;
      success = success && installCmdRes.code === null;

      const ordererEndpoint = "localhost:7050";
      const instantiateCmd = `${cmdEnv} peer chaincode instantiate --name ${ccName} --version ${ccVersion} --ctor '{"Args":["john","99"]}' --channelID mychannel --logging-level=DEBUG --lang golang --orderer=${ordererEndpoint}`;
      this.log.debug(`Instantiate CMD: %o`, instantiateCmd);
      const instantiateCmdRes = await ssh.execCommand(
        instantiateCmd,
        sshCmdOptions
      );
      this.log.debug(`Instantiate CMD Response: %o`, instantiateCmdRes);
      success = success && instantiateCmdRes.code === null;

      // fs.unlinkSync(localFilePath);
      fs.rmdirSync(tmpDirPath, { recursive: true });

      this.log.debug(`EXIT doDeploy()`);
      return { success, installCmdRes, instantiateCmdRes };
    } finally {
      temp.cleanup();
    }
  }
}
