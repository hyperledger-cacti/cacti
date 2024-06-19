/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * This file provides helper functions for interoperability operations.
 **/
/** End file docs */

import log4js from "log4js";
import * as helpers from "./helpers";
import { Contract } from "fabric-network";
const logger = log4js.getLogger("InteroperableHelper");

const lockAsset = async (
  contract: Contract,
  assetType: string,
  assetID: string,
  endorsingOrgs: Array<string> = [],
): Promise<any> => {
  if (!contract) {
    logger.error("Contract handle not supplied");
    return false;
  }
  if (!assetType) {
    logger.error("Asset type not supplied");
    return false;
  }
  if (!assetID) {
    logger.error("Asset ID not supplied");
    return false;
  }

  // Normal invoke function
  const tx = contract.createTransaction("LockAssetForSATP");
  const ccArgs = [assetType, assetID];
  if (endorsingOrgs && endorsingOrgs.length > 0) {
    tx.setEndorsingOrganizations(...endorsingOrgs);
  }
  const [result, submitError] = await helpers.handlePromise(
    tx.submit(...ccArgs),
  );
  if (submitError) {
    throw new Error(`LockAssetForSATP submitTransaction Error: ${submitError}`);
  }
  return result;
};

const extinguishAsset = async (
  contract: Contract,
  assetType: string,
  assetID: string,
  endorsingOrgs: Array<string> = [],
): Promise<any> => {
  if (!contract) {
    logger.error("Contract handle not supplied");
    return false;
  }
  if (!assetType) {
    logger.error("Asset type not supplied");
    return false;
  }
  if (!assetID) {
    logger.error("Asset ID not supplied");
    return false;
  }

  // Normal invoke function
  const tx = contract.createTransaction("DeleteAsset");
  const ccArgs = [assetType, assetID];
  if (endorsingOrgs && endorsingOrgs.length > 0) {
    tx.setEndorsingOrganizations(...endorsingOrgs);
  }
  const [result, submitError] = await helpers.handlePromise(
    tx.submit(...ccArgs),
  );
  if (submitError) {
    throw new Error(`DeleteAsset submitTransaction Error: ${submitError}`);
  }
  return result;
};

const assignAsset = async (
  contract: Contract,
  assetType: string,
  assetID: string,
  recipientECert: string,
  endorsingOrgs: Array<string> = [],
): Promise<any> => {
  if (!contract) {
    logger.error("Contract handle not supplied");
    return false;
  }
  if (!assetType) {
    logger.error("Asset type not supplied");
    return false;
  }
  if (!assetID) {
    logger.error("Asset ID not supplied");
    return false;
  }
  if (!recipientECert) {
    logger.error("Recipient ECert not supplied");
    return false;
  }

  // Normal invoke function
  const tx = contract.createTransaction("AssignAssetForSATP");
  const ccArgs = [assetType, assetID, recipientECert];
  if (endorsingOrgs && endorsingOrgs.length > 0) {
    tx.setEndorsingOrganizations(...endorsingOrgs);
  }
  const [result, submitError] = await helpers.handlePromise(
    tx.submit(...ccArgs),
  );
  if (submitError) {
    throw new Error(
      `AssignAssetForSATP submitTransaction Error: ${submitError}`,
    );
  }
  return result;
};

export { lockAsset, assignAsset, extinguishAsset };
