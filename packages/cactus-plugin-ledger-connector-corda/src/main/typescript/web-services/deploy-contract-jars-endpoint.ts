import fs from "fs";
import path from "path";

import { Express, Request, Response } from "express";
import temp from "temp";
import { NodeSSH, Config as SshConfig } from "node-ssh";

import {
  IWebServiceEndpoint,
  IExpressRequestHandler,
} from "@hyperledger/cactus-core-api";

import {
  Checks,
  Logger,
  LoggerProvider,
  LogLevelDesc,
} from "@hyperledger/cactus-common";

import {
  DeployContractJarsSuccessV1Response,
  DeployContractJarsV1Request,
} from "../generated/openapi/typescript-axios/api";

import OAS from "../../json/openapi.json";

export interface IDeployContractEndpointOptions {
  logLevel?: LogLevelDesc;
  sshConfigAdminShell: SshConfig;
  corDappsDir: string;
  cordaStartCmd?: string;
  cordaStopCmd?: string;
}

export class DeployContractJarsEndpoint implements IWebServiceEndpoint {
  public static readonly CLASS_NAME = "DeployContractJarsEndpoint";

  private readonly log: Logger;

  public get className() {
    return DeployContractJarsEndpoint.CLASS_NAME;
  }

  constructor(public readonly options: IDeployContractEndpointOptions) {
    const fnTag = `${this.className}#constructor()`;

    Checks.truthy(options, `${fnTag} options`);
    Checks.truthy(options.sshConfigAdminShell, `${fnTag} options.sshConfig`);

    const level = options.logLevel || "INFO";
    const label = "deploy-contract-jars-endpoint";
    this.log = LoggerProvider.getOrCreate({ level, label });
  }

  public get oasOperation() {
    return OAS.paths[
      "/api/v1/plugins/@hyperledger/cactus-plugin-ledger-connector-corda/deploy-contract-jars"
    ].post;
  }

  /**
   * Returns the `operationId` that connects this endpoint to it's definiton in
   * the openapi-spec.ts file.
   */
  public get operationId(): string {
    return this.oasOperation.operationId;
  }

  /**
   * Returns the endpoint path to be used when installing the endpoint into the
   * API server of Cactus.
   */
  public getPath(): string {
    return this.oasOperation["x-hyperledger-cactus"].http.path;
  }

  public getVerbLowerCase(): string {
    return this.oasOperation["x-hyperledger-cactus"].http.verbLowerCase;
  }

  public getExpressRequestHandler(): IExpressRequestHandler {
    return this.handleRequest.bind(this);
  }

  public registerExpress(expressApp: Express): IWebServiceEndpoint {
    const httpVerb = this.getVerbLowerCase();
    const httpPath = this.getPath();
    const handler = this.getExpressRequestHandler();

    (expressApp as any)[httpVerb](httpPath, handler);
    return this;
  }

  async handleRequest(req: Request, res: Response): Promise<void> {
    const fnTag = `${this.className}#handleRequest()`;

    const verb = this.getVerbLowerCase();
    const thePath = this.getPath();
    this.log.debug(`${verb} ${thePath} handleRequest()`);

    try {
      const body = await this.doDeploy(req.body);
      res.status(200);
      res.json(body);
    } catch (ex) {
      this.log.error(`${fnTag} failed to serve request`, ex);
      res.status(500);
      res.json({
        error: ex?.message,
        // FIXME do not include stack trace
        errorStack: ex?.stack,
      });
    }
  }

  private async doDeploy(
    reqBody: DeployContractJarsV1Request,
  ): Promise<DeployContractJarsSuccessV1Response> {
    const fnTag = `${this.className}#doDeploy()`;
    this.log.debug(`ENTER doDeploy()`);

    if (!Array.isArray(reqBody.jarFiles)) {
      throw new TypeError(`${fnTag} expected req.files to be an array`);
    }

    const { sshConfigAdminShell, corDappsDir: cordappDir } = this.options;
    const ssh = new NodeSSH();
    try {
      const resBody: DeployContractJarsSuccessV1Response = {
        deployedJarFiles: [],
      };

      temp.track();
      const prefix = `hyperledger-cactus-${this.className}`;
      const tmpDirPath = temp.mkdirSync(prefix);

      await ssh.connect(sshConfigAdminShell);

      await this.stopCordaNode(ssh);

      for (const aJarFile of reqBody.jarFiles) {
        const localFilePath = path.join(tmpDirPath, aJarFile.filename);
        const remoteFilePath = path.join(cordappDir, aJarFile.filename);

        fs.writeFileSync(localFilePath, aJarFile.contentBase64, "base64");

        this.log.debug(`SCP from/to %o => %o`, localFilePath, remoteFilePath);
        await ssh.putFile(localFilePath, remoteFilePath);
        this.log.debug(`SCP OK %o`, remoteFilePath);
      }

      await this.startCordaNode(ssh);

      fs.rmdirSync(tmpDirPath, { recursive: true });

      this.log.debug(`EXIT doDeploy()`);
      return resBody;
    } finally {
      ssh.dispose();
      temp.cleanup();
    }
  }

  private async stopCordaNode(ssh: NodeSSH): Promise<void> {
    const fnTag = `${this.className}#stopCordaNode()`;
    Checks.truthy(ssh.isConnected, `${fnTag} ssh.isConnected`);
    const cmd = this.options.cordaStopCmd || "sudo systemctl stop corda";
    try {
      const response = await ssh.execCommand(cmd);
      this.log.debug(`${fnTag} stopped Corda node OK `, response);
    } catch (ex) {
      this.log.error(`${fnTag} stopping of Corda node failed`, ex);
    }
  }

  private async startCordaNode(ssh: NodeSSH): Promise<void> {
    const fnTag = `${this.className}#startCordaNode()`;
    Checks.truthy(ssh.isConnected, `${fnTag} ssh.isConnected`);
    const cmd = this.options.cordaStartCmd || "sudo systemctl start corda";
    try {
      const response = await ssh.execCommand(cmd);
      this.log.debug(`${fnTag} started Corda node OK `, response);
    } catch (ex) {
      this.log.error(`${fnTag} starting of Corda node failed`, ex);
    }
  }
}
