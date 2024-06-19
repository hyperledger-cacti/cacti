/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import * as path from "path";
import satp_pb from "@hyperledger/cacti-weaver-protos-js/relay/satp_pb";
import satp_grpc_pb from "@hyperledger/cacti-weaver-protos-js/relay/satp_grpc_pb";
import driverPb from "@hyperledger/cacti-weaver-protos-js/driver/driver_pb";
import logger from "./logger";
import { credentials } from "@grpc/grpc-js";
import { SatpAssetManager } from "@hyperledger/cacti-weaver-sdk-fabric";
import fs from "fs";
import { Gateway, Network, Wallets, X509Identity } from "fabric-network";
import { getNetworkGateway } from "./fabric-code";
import { getDriverKeyCert } from "./walletSetup";

async function performLockHelper(
  performLockRequest: driverPb.PerformLockRequest,
  networkName: string,
) {
  // TODO: remove the hardcoded values
  const performLockRequest2 = {};
  performLockRequest2["target-network"] = "network1";
  performLockRequest2["timeout-duration"] = parseInt("3600");
  performLockRequest2["locker"] = "alice";
  performLockRequest2["recipient"] = "bob";
  performLockRequest2["lockerWalletPath"] = "../wallet-network1/alice.id";
  // HACK below; reading from temp file created by the relay SATP client; ideally, we shoudld get this info from the function parameter
  performLockRequest2["param"] = fs.existsSync("satp_info.txt")
    ? fs.readFileSync("satp_info.txt").toString()
    : "bond01:a05";
  if (performLockRequest2["param"].split(":").length === 1) {
    performLockRequest2["param"] = performLockRequest2["param"] + ":a05";
  }
  performLockRequest2["channel"] = "mychannel";
  performLockRequest2["chaincode-id"] = "satpsimpleasset";

  const recipient = performLockRequest2["recipient"];
  const channel = performLockRequest2["channel"];
  const chaincodeId = performLockRequest2["chaincode-id"];

  const gateway: Gateway = await getNetworkGateway(networkName);
  const network: Network = await gateway.getNetwork(channel);
  const contract = network.getContract(chaincodeId);

  const params = performLockRequest2["param"].split(":");

  try {
    logger.info(
      `Trying to lock asset <${params[0]}, ${params[1]}> for SATP to ${recipient}`,
    );
    const res = await SatpAssetManager.lockAsset(
      contract,
      params[0],
      params[1],
    );
    if (!res) {
      throw new Error();
    }
    logger.info(
      `Asset <${params[0]}, ${params[1]}> locked successfully for gateway`,
    );
  } catch (error) {
    logger.error(`Could not lock asset <${params[0]}, ${params[1]}>`);
  } finally {
    if (gateway) {
      await gateway.disconnect();
      logger.info("Gateway disconnected.");
    }
  }

  const client = getRelayClientForAssetStatusResponse();
  const request = new satp_pb.SendAssetStatusRequest();
  request.setSessionId(performLockRequest.getSessionId());
  request.setStatus("Locked");
  client.sendAssetStatus(request, relayCallback);
}

async function createAssetHelper(
  createAssetRequest: driverPb.CreateAssetRequest,
  networkName: string,
) {
  // TODO: remove the hardcoded values
  const createAssetRequest2 = {};
  createAssetRequest2["target-network"] = "network2";
  createAssetRequest2["timeout-duration"] = parseInt("3600");
  createAssetRequest2["owner"] = "admin";
  createAssetRequest2["type"] = "bond";
  // HACK below; reading from temp file created by the relay SATP client; ideally, we shoudld get this info from the function parameter
  const asset_info = fs.existsSync("satp_info.txt")
    ? fs.readFileSync("satp_info.txt").toString()
    : "bond01:a05";
  const asset_info_parts = asset_info.split(":");
  createAssetRequest2["assetType"] = asset_info_parts[0] + "_new";
  if (asset_info_parts.length === 1) {
    createAssetRequest2["id"] = "a05_new";
  } else {
    createAssetRequest2["id"] = asset_info_parts[1] + "_new";
  }
  createAssetRequest2["issuer"] = "admin";
  createAssetRequest2["facevalue"] = "300";
  createAssetRequest2["maturitydate"] = "05 May 48 00:00 MST";
  createAssetRequest2["channel"] = "mychannel";
  createAssetRequest2["chaincode-id"] = "satpsimpleasset";

  const owner = createAssetRequest2["owner"];
  const ccType = createAssetRequest2["type"];
  const assetType = createAssetRequest2["assetType"];
  const id = createAssetRequest2["id"];
  const issuer = createAssetRequest2["issuer"];
  const facevalue = createAssetRequest2["facevalue"];
  const maturitydate = createAssetRequest2["maturitydate"];
  const tokenassettype = createAssetRequest2["tokenassettype"];
  const numunits = createAssetRequest2["numunits"];
  const channel = createAssetRequest2["channel"];
  const chaincodeId = createAssetRequest2["chaincode-id"];

  const gateway: Gateway = await getNetworkGateway(networkName);
  const network: Network = await gateway.getNetwork(channel);

  try {
    const contract = network.getContract(chaincodeId);
    const currentQuery = {
      channel: channel,
      contractName: chaincodeId,
      ccFunc: "",
      args: [],
    };

    const driverkeyCert = await getDriverKeyCert();
    const certificate = Buffer.from(driverkeyCert.cert).toString("base64");

    if (ccType == "bond") {
      currentQuery.ccFunc = "CreateAsset";
      currentQuery.args = [
        ...currentQuery.args,
        assetType,
        id,
        certificate,
        issuer,
        facevalue,
        maturitydate,
      ];
    } else if (ccType == "token") {
      currentQuery.ccFunc = "IssueTokenAssets";
      currentQuery.args = [
        ...currentQuery.args,
        tokenassettype,
        numunits,
        certificate,
      ];
    } else {
      throw new Error(`Unrecognized asset category: ${ccType}`);
    }
    logger.info(currentQuery);

    logger.info(
      `Trying creating the asset: type: ${assetType}, id: ${id}, by: ${owner}, facevalue: ${facevalue}, maturitydate: ${maturitydate}`,
    );
    const read = await contract.submitTransaction(
      currentQuery.ccFunc,
      ...currentQuery.args,
    );
    const state = Buffer.from(read).toString();
    if (state) {
      logger.debug(`Response From Network: ${state}`);
      logger.info("Asset has been created successfully");
    } else {
      logger.debug("No Response from network");
    }
  } catch (error) {
    logger.error(`Failed to submit transaction: ${error}`);
    throw new Error(error);
  } finally {
    if (gateway) {
      await gateway.disconnect();
      logger.info("Gateway disconnected.");
    }
  }

  const client = getRelayClientForAssetStatusResponse();
  const request = new satp_pb.SendAssetStatusRequest();
  request.setSessionId(createAssetRequest.getSessionId());
  request.setStatus("Created");
  client.sendAssetStatus(request, relayCallback);
}

async function extinguishHelper(
  extinguishRequest: driverPb.ExtinguishRequest,
  networkName: string,
) {
  const channel = "mychannel";
  const chaincodeId = "satpsimpleasset";
  const gateway: Gateway = await getNetworkGateway(networkName);
  const network: Network = await gateway.getNetwork(channel);
  const contract = network.getContract(chaincodeId);

  // HACK below; reading from temp file created by the relay SATP client; ideally, we shoudld get this info from the function parameter
  const asset_info = fs.existsSync("satp_info.txt")
    ? fs.readFileSync("satp_info.txt").toString()
    : "bond01:a05";
  const asset_info_parts = asset_info.split(":");
  const assetType = asset_info_parts[0];
  let assetId;
  if (asset_info_parts.length === 1) {
    assetId = "a05";
  } else {
    assetId = asset_info_parts[1];
  }

  try {
    logger.info(
      `Trying to extinguish asset <${assetType}, ${assetId}> for SATP completion`,
    );
    const res = await SatpAssetManager.extinguishAsset(
      contract,
      assetType,
      assetId,
    );
    if (!res) {
      throw new Error();
    }
    logger.info(
      `Asset <${assetType}, ${assetId}> extinguished successfully by gateway`,
    );
  } catch (error) {
    logger.error(`Could not extinguish asset <${assetType}, ${assetId}>`);
  } finally {
    if (gateway) {
      await gateway.disconnect();
      logger.info("Gateway disconnected.");
    }
  }

  const client = getRelayClientForAssetStatusResponse();
  const request = new satp_pb.SendAssetStatusRequest();
  request.setSessionId(extinguishRequest.getSessionId());
  request.setStatus("Extinguished");
  client.sendAssetStatus(request, relayCallback);
}

async function assignAssetHelper(
  assignAssetRequest: driverPb.AssignAssetRequest,
  networkName: string,
) {
  // TODO: remove the hardcoded values
  const assignAssetRequest2 = {};
  assignAssetRequest2["target-network"] = "network2";
  assignAssetRequest2["timeout-duration"] = parseInt("3600");
  assignAssetRequest2["locker"] = "admin";
  assignAssetRequest2["recipient"] = "bob";
  // HACK below; reading from temp file created by the relay SATP client; ideally, we shoudld get this info from the function parameter
  const asset_info = fs.existsSync("satp_info.txt")
    ? fs.readFileSync("satp_info.txt").toString()
    : "bond01:a05";
  const asset_info_parts = asset_info.split(":");
  if (asset_info_parts.length === 1) {
    assignAssetRequest2["param"] = asset_info_parts[0] + "_new:a05_new";
  } else {
    assignAssetRequest2["param"] =
      asset_info_parts[0] + "_new:" + asset_info_parts[1] + "_new";
  }
  assignAssetRequest2["channel"] = "mychannel";
  assignAssetRequest2["chaincode-id"] = "satpsimpleasset";

  const recipient = assignAssetRequest2["recipient"];
  const channel = assignAssetRequest2["channel"];
  const chaincodeId = assignAssetRequest2["chaincode-id"];

  const gateway: Gateway = await getNetworkGateway(networkName);
  const network: Network = await gateway.getNetwork(channel);
  const contract = network.getContract(chaincodeId);

  const params = assignAssetRequest2["param"].split(":");
  // TODO: read the recipient's ID and certificate from service parameters
  //       instead of reading a manually copied wallet ID from the local filesystem
  const walletPath = process.env.WALLET_PATH
    ? process.env.WALLET_PATH
    : path.join(
        process.cwd(),
        `wallet-${process.env.NETWORK_NAME ? process.env.NETWORK_NAME : "network1"}`,
      );
  const wallet = await Wallets.newFileSystemWallet(walletPath);
  const recipientId = await wallet.get(recipient);
  const recipientCert = Buffer.from(
    (recipientId as X509Identity).credentials.certificate,
  ).toString("base64");

  try {
    logger.info(
      `Trying to assign asset <${params[0]}, ${params[1]}> from SATP to ${recipient}`,
    );
    const res = await SatpAssetManager.assignAsset(
      contract,
      params[0],
      params[1],
      recipientCert,
    );
    if (!res) {
      throw new Error();
    }
    logger.info(
      `Asset <${params[0]}, ${params[1]}> assigned successfully successfully by gateway to ${recipient}`,
    );
  } catch (error) {
    logger.error(
      `Could not assign asset <${params[0]}, ${params[1]}> to ${recipient}`,
    );
  } finally {
    if (gateway) {
      await gateway.disconnect();
      logger.info("Gateway disconnected.");
    }
  }

  const client = getRelayClientForAssetStatusResponse();
  const request = new satp_pb.SendAssetStatusRequest();
  request.setSessionId(assignAssetRequest.getSessionId());
  request.setStatus("Finalized");
  client.sendAssetStatus(request, relayCallback);
}

function getRelayClientForAssetStatusResponse() {
  let client: satp_grpc_pb.SATPClient;
  if (process.env.RELAY_TLS === "true") {
    if (
      !process.env.RELAY_TLSCA_CERT_PATH ||
      process.env.RELAY_TLSCA_CERT_PATH == ""
    ) {
      client = new satp_grpc_pb.SATPClient(
        process.env.RELAY_ENDPOINT,
        credentials.createSsl(),
      );
    } else {
      if (
        !(
          process.env.RELAY_TLSCA_CERT_PATH &&
          fs.existsSync(process.env.RELAY_TLSCA_CERT_PATH)
        )
      ) {
        throw new Error(
          "Missing or invalid RELAY_TLSCA_CERT_PATH: " +
            process.env.RELAY_TLSCA_CERT_PATH,
        );
      }
      const rootCert = fs.readFileSync(process.env.RELAY_TLSCA_CERT_PATH);
      client = new satp_grpc_pb.SATPClient(
        process.env.RELAY_ENDPOINT,
        credentials.createSsl(rootCert),
      );
    }
  } else {
    client = new satp_grpc_pb.SATPClient(
      process.env.RELAY_ENDPOINT,
      credentials.createInsecure(),
    );
  }
  return client;
}

// handle callback
function relayCallback(err: any, response: any) {
  if (response) {
    logger.info(
      `Relay Callback Response: ${JSON.stringify(response.toObject())}`,
    );
  } else if (err) {
    logger.error(`Relay Callback Error: ${err}`);
  }
}

export {
  performLockHelper,
  createAssetHelper,
  extinguishHelper,
  assignAssetHelper,
};
