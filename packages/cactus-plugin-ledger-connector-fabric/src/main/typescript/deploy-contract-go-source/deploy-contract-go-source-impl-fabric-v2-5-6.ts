import path from "path";
import temp from "temp";
import fs from "fs/promises";

import {
  Config as SshConfig,
  NodeSSH,
  SSHExecCommandOptions,
  SSHExecCommandResponse,
} from "node-ssh";

import { Checks, Logger } from "@hyperledger/cactus-common";

import type {
  DeployContractGoSourceV1Request,
  DeployContractGoSourceV1Response,
} from "../generated/openapi/typescript-axios/api";
import type { IPluginLedgerConnectorFabricOptions } from "../plugin-ledger-connector-fabric";
import { sshExec } from "../common/ssh-exec";
import { findAndReplaceFabricLoggingSpec } from "../common/find-and-replace-fabric-logging-spec";
import type { IQueryInstalledResponse } from "../peer/i-query-installed-response";
import { isSshExecOk } from "../common/is-ssh-exec-ok";
import type { IQueryCommittedResponse } from "../peer/i-query-committed-response";

const FABRIC_25_LTS_FABRIC_SAMPLES__ORDERER_TLS_ROOTCERT_FILE_ORG_1 =
  "/opt/gopath/src/github.com/hyperledger/fabric/peer/organizations/ordererOrganizations/example.com/tlsca/tlsca.example.com-cert.pem";

/**
 * Constant value holding the default $GOPATH in the Fabric CLI container as
 * observed on fabric deployments that are produced by the official examples
 * found in the https://github.com/hyperledger/fabric-samples repository.
 */
export const K_DEFAULT_CLI_CONTAINER_GO_PATH = "/opt/gopath/";

export interface IDeployContractGoSourceImplFabricV256Context {
  readonly log: Logger;
  readonly className: string;
  readonly dockerBinary: string;
  readonly sshConfig: SshConfig;
  readonly opts: IPluginLedgerConnectorFabricOptions;
}

/**
 * @param req The object containing all the necessary metadata and parameters
 * in order to have the contract deployed.
 */
export async function deployContractGoSourceImplFabricV256(
  ctx: IDeployContractGoSourceImplFabricV256Context,
  req: DeployContractGoSourceV1Request,
): Promise<DeployContractGoSourceV1Response> {
  const { log, className, dockerBinary } = ctx;
  const fnTag = `${className}#deployContractGoSourceImplFabricV256()`;

  const cliContainerGoPath =
    ctx.opts.cliContainerGoPath || K_DEFAULT_CLI_CONTAINER_GO_PATH;

  const ssh = new NodeSSH();
  await ssh.connect(ctx.sshConfig);
  log.debug(`SSH connection OK`);

  try {
    log.debug(`${fnTag} Deploying .go source: ${req.goSource.filename}`);

    Checks.truthy(req.goSource, `${fnTag}:req.goSource`);

    temp.track();
    const tmpDirPrefix = `hyperledger-cacti-${className}`;
    const tmpDirPath = temp.mkdirSync(tmpDirPrefix);

    // The module name of the chain-code, for example this will extract
    // ccName to be "hello-world" from a filename of "hello-world.go"
    const inferredModuleName = path.basename(req.goSource.filename, ".go");
    log.debug(`Inferred module name: ${inferredModuleName}`);
    const ccName = req.moduleName || inferredModuleName;
    log.debug(`Determined ChainCode name: ${ccName}`);

    const remoteDirPath = path.join(cliContainerGoPath, "src/", ccName);
    log.debug(`Remote dir path on CLI container: ${remoteDirPath}`);

    const localFilePath = path.join(tmpDirPath, req.goSource.filename);
    await fs.writeFile(localFilePath, req.goSource.body, "base64");

    const remoteFilePath = path.join(remoteDirPath, req.goSource.filename);

    log.debug(`SCP from/to %o => %o`, localFilePath, remoteFilePath);
    await ssh.putFile(localFilePath, remoteFilePath);
    log.debug(`SCP OK %o`, remoteFilePath);

    const sshOpts: SSHExecCommandOptions = {
      execOptions: {
        pty: true,
        env: {
          // just in case go modules would be otherwise disabled
          GO111MODULE: "on",
          FABRIC_LOGGING_SPEC: "DEBUG",
        },
      },
      cwd: remoteDirPath,
    };

    const dockerCliExecEnv = Object.entries(ctx.opts.cliContainerEnv)
      .map(([key, value]) => `--env ${key}=${value}`)
      .join(" ");

    const dockerBuildCmd =
      `${dockerBinary} exec ` +
      dockerCliExecEnv +
      ` --workdir=${remoteDirPath}` +
      ` cli `;

    await sshExec(
      ctx,
      `${dockerBinary} exec cli mkdir -p ${remoteDirPath}/`,
      "Create ChainCode project (go module) directory",
      ssh,
      sshOpts,
    );

    await sshExec(
      ctx,
      `${dockerBinary} exec cli go version`,
      "Print go version",
      ssh,
      sshOpts,
    );

    const copyToCliCmd = `${dockerBinary} cp ${remoteFilePath} cli:${remoteFilePath}`;
    log.debug(`Copy to CLI Container CMD: ${copyToCliCmd}`);
    const copyToCliRes = await ssh.execCommand(copyToCliCmd, sshOpts);
    log.debug(`Copy to CLI Container CMD Response: %o`, copyToCliRes);
    Checks.truthy(copyToCliRes.code === 0, `copyToCliRes.code === 0`);

    {
      const goModInitCmd = `${dockerBuildCmd} go mod init ${ccName}`;
      log.debug(`go mod init CMD: ${goModInitCmd}`);
      const goModInitRes = await ssh.execCommand(goModInitCmd, sshOpts);
      log.debug(`go mod init CMD Response: %o`, goModInitRes);
      Checks.truthy(goModInitRes.code === 0, `goModInitRes.code === 0`);
    }

    const pinnedDeps = req.pinnedDeps || [];
    for (const dep of pinnedDeps) {
      const goGetCmd = `${dockerBuildCmd} go get ${dep}`;
      log.debug(`go get CMD: ${goGetCmd}`);
      const goGetRes = await ssh.execCommand(goGetCmd, sshOpts);
      log.debug(`go get CMD Response: %o`, goGetRes);
      Checks.truthy(goGetRes.code === 0, `goGetRes.code === 0`);
    }

    {
      const goModTidyCmd = `${dockerBuildCmd} go mod tidy`;
      log.debug(`go mod tidy CMD: ${goModTidyCmd}`);
      const goModTidyRes = await ssh.execCommand(goModTidyCmd, sshOpts);
      log.debug(`go mod tidy CMD Response: %o`, goModTidyRes);
      Checks.truthy(goModTidyRes.code === 0, `goModTidyRes.code === 0`);
    }

    {
      const goVendorCmd = `${dockerBuildCmd} go mod vendor`;
      log.debug(`go mod vendor CMD: ${goVendorCmd}`);
      const goVendorRes = await ssh.execCommand(goVendorCmd, sshOpts);
      log.debug(`go mod vendor CMD Response: %o`, goVendorRes);
      Checks.truthy(goVendorRes.code === 0, `goVendorRes.code === 0`);
    }

    {
      const goBuildCmd = `${dockerBuildCmd} go build`;
      log.debug(`go build CMD: ${goBuildCmd}`);
      const goBuildRes = await ssh.execCommand(goBuildCmd, sshOpts);
      log.debug(`go build CMD Response: %o`, goBuildRes);
      Checks.truthy(goBuildRes.code === 0, `goBuildRes.code === 0`);
    }

    let success = true;

    const installationCommandResponses: SSHExecCommandResponse[] = [];
    const ccSequence = 1;
    const orderer = "orderer.example.com:7050";
    const ordererTLSHostnameOverride = "orderer.example.com";

    const ccPkgCmd =
      `${dockerBuildCmd} peer lifecycle chaincode package ${ccName}.tar.gz ` +
      ` --path ${remoteDirPath} ` +
      ` --label ${ccName} ` +
      ` --lang golang`;

    const ccPkgLabel = `packaging chain code`;
    const ccPkgRes = await sshExec(ctx, ccPkgCmd, ccPkgLabel, ssh, sshOpts);
    Checks.truthy(ccPkgRes.code === 0, `ccPkgRes.code === 0`);

    for (const org of req.targetOrganizations) {
      const dockerExecEnv = Object.entries(org)
        .map(([key, val]) => `--env ${key}=${val}`)
        .join(" ");

      const dockerExecCmd =
        `${dockerBinary} exec ` +
        dockerExecEnv +
        ` --env GO111MODULE=on` +
        ` --workdir=${remoteDirPath}` +
        ` cli `;

      const ccInstallLbl = `Install ChainCode in ${org.CORE_PEER_LOCALMSPID}`;
      const ccInstallCmd = `${dockerExecCmd} peer lifecycle chaincode install ${ccName}.tar.gz `;

      const anInstallCmdRes = await sshExec(
        ctx,
        ccInstallCmd,
        ccInstallLbl,
        ssh,
        sshOpts,
      );

      installationCommandResponses.push(anInstallCmdRes);

      // const ctorArgsJson = JSON.stringify(req.constructorArgs || {});

      // Need to make sure that the logging is turned off otherwise it
      // mangles the JSON syntax and makes the output invalid...
      const dockerExecCmdInfoLog = findAndReplaceFabricLoggingSpec(
        dockerExecCmd,
        "ERROR",
      );

      const instantiationCommandResponses = [];
      const cmdQueryInstalled = `${dockerExecCmdInfoLog} peer lifecycle chaincode queryinstalled --output json`;
      const lblQueryInstalled = `query installed contracts`;
      const resQueryInstalled = await sshExec(
        ctx,
        cmdQueryInstalled,
        lblQueryInstalled,
        ssh,
        sshOpts,
      );

      log.debug("Queries installed contracts OK.");
      Checks.truthy(resQueryInstalled.stdout.includes(ccName));
      log.debug("Validated that contract is in fact installed OK.");

      const json = resQueryInstalled.stdout;
      const qir = JSON.parse(json) as IQueryInstalledResponse;
      const icc = qir.installed_chaincodes.find(
        (chainCode) => chainCode.label === ccName,
      );

      ctx.log.debug(`Parsed list of installed contracts: %o`, qir);

      Checks.truthy(icc, "No installed chaincode with label: %o", ccName);

      if (!icc?.package_id) {
        throw new Error(`${fnTag}: package ID falsy. Something's wrong.`);
      }
      const packageId = icc?.package_id;
      ctx.log.debug(`Found package ID: ${packageId}`);

      const instantiateCmd =
        ` ${dockerExecCmd} peer lifecycle chaincode approveformyorg ` +
        `--orderer ${orderer} ` +
        `--ordererTLSHostnameOverride ${ordererTLSHostnameOverride} ` +
        `--tls ` +
        `--cafile ${FABRIC_25_LTS_FABRIC_SAMPLES__ORDERER_TLS_ROOTCERT_FILE_ORG_1} ` +
        `--channelID ${req.channelId} ` +
        `--name ${ccName} ` +
        `--version ${req.chainCodeVersion} ` +
        `--package-id ${packageId} ` +
        `--sequence ${ccSequence} ` +
        ``;

      const cmdLabel = `approveformyorg ChainCode in ${org.CORE_PEER_LOCALMSPID}`;
      log.debug(`ApproveForMyOrg CMD: %o`, instantiateCmd);

      const instantiationCmdRes = await sshExec(
        ctx,
        instantiateCmd,
        cmdLabel,
        ssh,
        sshOpts,
      );
      Checks.truthy(instantiationCmdRes.code === 0, `res.code === 0`);
      instantiationCommandResponses.push(instantiationCmdRes);

      log.debug(`ApproveForMyOrg CMD Response:%o`, instantiationCmdRes);
      success = success && isSshExecOk(instantiationCmdRes);
    }

    const commitCmd =
      `${dockerBuildCmd} peer lifecycle chaincode commit ` +
      ` --name ${ccName} ` +
      ` --version ${req.chainCodeVersion} ` +
      ` --channelID ${req.channelId} ` +
      ` --tls ` +
      ` --orderer ${orderer} ` +
      ` --ordererTLSHostnameOverride ${ordererTLSHostnameOverride} ` +
      ` --cafile ${FABRIC_25_LTS_FABRIC_SAMPLES__ORDERER_TLS_ROOTCERT_FILE_ORG_1} ` +
      ` --peerAddresses ${req.targetOrganizations[0].CORE_PEER_ADDRESS} ` +
      ` --tlsRootCertFiles ${req.targetOrganizations[0].CORE_PEER_TLS_ROOTCERT_FILE}` +
      ` --peerAddresses ${req.targetOrganizations[1].CORE_PEER_ADDRESS} ` +
      ` --tlsRootCertFiles ${req.targetOrganizations[1].CORE_PEER_TLS_ROOTCERT_FILE}` +
      ` --sequence=${ccSequence} `;

    const lblCcCommit = "peer lifecycle chaincode commit";

    const resCommit = await sshExec(ctx, commitCmd, lblCcCommit, ssh, sshOpts);

    success = success && isSshExecOk(resCommit);

    // Need to make sure that the logging is turned off otherwise it
    // mangles the JSON syntax and makes the output invalid...
    const dockerBuildCmdInfoLog = findAndReplaceFabricLoggingSpec(
      dockerBuildCmd,
      "ERROR",
    );

    const cmdQueryCommitted2 = `${dockerBuildCmdInfoLog} peer lifecycle chaincode querycommitted --channelID=${req.channelId} --output json`;
    const lblQueryCommitted2 = `peer lifecycle chaincode querycommitted --channelID=${req.channelId}`;

    log.debug(`${lblQueryCommitted2} CMD Response:%o`, cmdQueryCommitted2);

    const resQueryCommitted2 = await sshExec(
      ctx,
      cmdQueryCommitted2,
      lblQueryCommitted2,
      ssh,
      sshOpts,
    );

    Checks.truthy(
      resQueryCommitted2.stdout.includes(ccName),
      "stdout has contract name",
    );
    const committedCCsJson = resQueryCommitted2.stdout;
    const qcr2 = JSON.parse(committedCCsJson) as IQueryCommittedResponse;
    const ccd2 = qcr2.chaincode_definitions.find(
      (ccd) => ccd.name === ccName && ccd.version === req.chainCodeVersion,
    );

    ctx.log.debug(`Parsed list of installed contracts: %o`, qcr2);

    Checks.truthy(ccd2, "No installed chaincode with label: %o", ccName);

    log.debug(`EXIT doDeploy()`);
    const res: DeployContractGoSourceV1Response = {
      success,
      installationCommandResponses,
      instantiationCommandResponse: installationCommandResponses[0],
    };

    return res;
  } catch (ex) {
    ctx.log.debug(`${fnTag} crashed. Re-throwing...`, ex);
    throw ex;
  } finally {
    try {
      ssh.dispose();
    } finally {
      temp.cleanup();
    }
  }
}
