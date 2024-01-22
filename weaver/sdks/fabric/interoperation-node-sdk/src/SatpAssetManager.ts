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
import crypto from "crypto";
import fabproto6 from "fabric-protos";
import * as helpers from "./helpers";
import assetLocksPb from "@hyperledger/cacti-weaver-protos-js/common/asset_locks_pb";
import { Contract, ContractListener } from "fabric-network";
import { Hash, SHA256, SHA512 } from "./HashFunctions"
import { createAssetExchangeAgreementSerialized, createAssetClaimInfoSerialized} from "./AssetManager"
const logger = log4js.getLogger("InteroperableHelper");


const assignAsset = async (
    contract: Contract,
    assetType: string,
    assetID: string,
    lockerECert: string,
    hash: Hash,
    endorsingOrgs: Array<string> = []
): Promise<any> => {

    if (!contract)
    {
        logger.error("Contract handle not supplied");
        return false;
    }
    if (!assetType)
    {
        logger.error("Asset type not supplied");
        return false;
    }
    if (!assetID)
    {
        logger.error("Asset ID not supplied");
        return false;
    }
    if (!lockerECert)
    {
        logger.error("Locker ECert not supplied");
        return false;
    }
    if (!hash)
    {
        logger.error("Instance of Hash interface not supplied")
        return false
    }
    if (!hash.preimage)
    {
        logger.error("Hash Preimage not supplied");
        return false;
    }

    const assetExchangeAgreementStr = createAssetExchangeAgreementSerialized(assetType, assetID, "", lockerECert);
    const claimInfoStr = createAssetClaimInfoSerialized(hash);

    // Normal invoke function
    const tx = contract.createTransaction("AssignAsset")
    const ccArgs = [assetExchangeAgreementStr, claimInfoStr]
    if (endorsingOrgs && endorsingOrgs.length > 0) {
        tx.setEndorsingOrganizations(...endorsingOrgs)
    }
    const [result, submitError] = await helpers.handlePromise(
        tx.submit(...ccArgs)
    );
    if (submitError) {
        throw new Error(`AssignAsset submitTransaction Error: ${submitError}`);
    }
    return result;
};

export {
    assignAsset
};
