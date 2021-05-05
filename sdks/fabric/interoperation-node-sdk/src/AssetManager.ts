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
import assetLocksPb from "../protos-js/common/asset_locks_pb";
import { Contract } from "fabric-network";
const logger = log4js.getLogger("InteroperableHelper");


/**
 * First step of a Hashed Time Lock Contract
 * - Lock a unique asset instance using a hash
 **/
const createHTLC = async (
    contract: Contract,
    assetType: string,
    assetID: string,
    recipientID: string,
    hashValue: string,
    expiryTimeSecs: number,
): Promise<{ preimage: any; result: any }> => {

    let defaultExpiryTimeSecs = 0, preimage = "";
    if (hashValue && hashValue.length > 0)
    {
        defaultExpiryTimeSecs = 5 * 60     // 5 mins: this is the 't' used to time out the second contract of the HTLC pair
    }
    else
    {
        defaultExpiryTimeSecs = 10 * 60     // 10 mins: this is the '2t' used to time out the first contract of the HTLC pair

        // Create a random preimage of 20 bytes
        for (let i = 0 ; i < 20 ; i++)
        {
            preimage += String.fromCharCode(Math.floor(Math.random() * 256))
        }

        // Hash the preimage
        hashValue = crypto.createHash('sha256').update(preimage).digest('base64');
    }
    const currTimeSecs = Math.floor(Date.now()/1000);   // Convert epoch milliseconds to seconds
    if (expiryTimeSecs <= currTimeSecs)
    {
        logger.warn("Supplied HTLC expiry time is invalid or in the past: %d", expiryTimeSecs)
        expiryTimeSecs = currTimeSecs + defaultExpiryTimeSecs
    }

    // Create an asset exchange agreement structure
    const assetExchangeAgreement = new assetLocksPb.AssetExchangeAgreement();
    assetExchangeAgreement.setType(assetType);
    assetExchangeAgreement.setId(assetID);
    assetExchangeAgreement.setRecipient(recipientID);
    const assetExchangeAgreementStr = assetExchangeAgreement.serializeBinary().toString();

    // Create an asset lock structure
    const lockInfoHTLC = new assetLocksPb.AssetLockHTLC();
    lockInfoHTLC.setHash(hashValue);
    lockInfoHTLC.setExpirytimesecs(expiryTimeSecs);
    lockInfoHTLC.setTimespec(assetLocksPb.AssetLockHTLC.TimeSpec.EPOCH)
    const lockInfoHTLCSerialized = lockInfoHTLC.serializeBinary();
    const lockInfo = new assetLocksPb.AssetLock();
    lockInfo.setLockmechanism(assetLocksPb.LockMechanism.HTLC);
    lockInfo.setLockinfo(lockInfoHTLCSerialized);
    const lockInfoStr = lockInfo.serializeBinary().toString();

    // Normal invoke function
    const [result, submitError] = await helpers.handlePromise(
        contract.submitTransaction("LockAsset", assetExchangeAgreementStr, lockInfoStr),
    );
    if (submitError) {
        throw new Error(`LockAsset submitTransaction Error: ${submitError}`);
    }
    return { preimage: preimage, result: result };
};

export {
    createHTLC,
    /*createFungibleHTLC,
    isAssetLockedInHTLC,
    isFungibleAssetLockedInHTLC,
    claimAssetInHTLC,
    claimFungibleAssetInHTLC,
    reclaimAssetInHTLC,
    reclaimFungibleAssetInHTLC,*/
};
