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
import { Contract, ContractListener } from "fabric-network";
const logger = log4js.getLogger("InteroperableHelper");


// Create an asset exchange agreement structure
function createAssetExchangeAgreementSerialized(assetType, assetID, recipientECert, lockerECert)
{
    const assetExchangeAgreement = new assetLocksPb.AssetExchangeAgreement();
    assetExchangeAgreement.setType(assetType);
    assetExchangeAgreement.setId(assetID);
    assetExchangeAgreement.setRecipient(recipientECert);
    assetExchangeAgreement.setLocker(lockerECert);
    return assetExchangeAgreement.serializeBinary().toString();
}

// Create a fungible asset exchange agreement structure
function createFungibleAssetExchangeAgreementSerialized(assetType, numUnits, recipientECert, lockerECert)
{
    const assetExchangeAgreement = new assetLocksPb.FungibleAssetExchangeAgreement();
    assetExchangeAgreement.setType(assetType);
    assetExchangeAgreement.setNumunits(numUnits);
    assetExchangeAgreement.setRecipient(recipientECert);
    assetExchangeAgreement.setLocker(lockerECert);
    return assetExchangeAgreement.serializeBinary().toString();
}

// Create an asset lock structure
function createAssetLockInfoSerialized(hashValue, expiryTimeSecs)
{
    const lockInfoHTLC = new assetLocksPb.AssetLockHTLC();
    lockInfoHTLC.setHashbase64(hashValue);
    lockInfoHTLC.setExpirytimesecs(expiryTimeSecs);
    lockInfoHTLC.setTimespec(assetLocksPb.AssetLockHTLC.TimeSpec.EPOCH)
    const lockInfoHTLCSerialized = lockInfoHTLC.serializeBinary();
    const lockInfo = new assetLocksPb.AssetLock();
    lockInfo.setLockmechanism(assetLocksPb.LockMechanism.HTLC);
    lockInfo.setLockinfo(lockInfoHTLCSerialized);
    return lockInfo.serializeBinary().toString();
}

// Create an asset claim structure
function createAssetClaimInfoSerialized(hashPreimage)
{
    const claimInfoHTLC = new assetLocksPb.AssetClaimHTLC();
    claimInfoHTLC.setHashpreimagebase64(Buffer.from(hashPreimage).toString('base64'));
    const claimInfoHTLCSerialized = claimInfoHTLC.serializeBinary();
    const claimInfo = new assetLocksPb.AssetClaim();
    claimInfo.setLockmechanism(assetLocksPb.LockMechanism.HTLC);
    claimInfo.setClaiminfo(claimInfoHTLCSerialized);
    return claimInfo.serializeBinary().toString();
}

// Create a SHA-256 hash over an ASCII string
function createSHA256HashBase64(preimage: string)
{
    return crypto.createHash('sha256').update(preimage).digest('base64');
}

// Create a secure pseudo-random preimage of a given length
function generateRandomHashPreimage(strLength: number)
{
    if (!strLength || strLength <= 0)
    {
        strLength = 20;         // Default length
    }
    return crypto.randomBytes(strLength).toString();
}

/**
 * First/second step of a Hashed Time Lock Contract
 * - Lock a unique asset instance using a hash
 **/
const createHTLC = async (
    contract: Contract,
    assetType: string,
    assetID: string,
    recipientECert: string,
    hashPreimage: string,
    hashValue: string,
    expiryTimeSecs: number,
    timeoutCallback: (c: Contract, t: string, i: string, r: string, p: string, v: string) => any,
): Promise<{ preimage: any; result: any }> => {

    if (!contract)
    {
        logger.error("Contract handle not supplied");
        return { preimage: "", result: false };
    }
    if (!assetType)
    {
        logger.error("Asset type not supplied");
        return { preimage: "", result: false };
    }
    if (!assetID)
    {
        logger.error("Asset ID not supplied");
        return { preimage: "", result: false };
    }
    if (!recipientECert)
    {
        logger.error("Recipient ECert not supplied");
        return { preimage: "", result: false };
    }
    const currTimeSecs = Math.floor(Date.now()/1000);   // Convert epoch milliseconds to seconds
    if (expiryTimeSecs <= currTimeSecs)
    {
        logger.error("Supplied expiry time invalid or in the past: %s; current time: %s", new Date(expiryTimeSecs).toISOString(), new Date(currTimeSecs).toISOString());
        return { preimage: "", result: false };
    }

    if (!hashValue || hashValue.length == 0)
    {
        if (!hashPreimage || hashPreimage.length == 0)
        {
            // Generate the preimage
            hashPreimage = generateRandomHashPreimage(-1);
        }
        // Hash the preimage
        hashValue = createSHA256HashBase64(hashPreimage);
    }

    const assetExchangeAgreementStr = createAssetExchangeAgreementSerialized(assetType, assetID, recipientECert, "");
    const lockInfoStr = createAssetLockInfoSerialized(hashValue, expiryTimeSecs);

    // Normal invoke function
    const [result, submitError] = await helpers.handlePromise(
        contract.submitTransaction("LockAsset", assetExchangeAgreementStr, lockInfoStr),
    );
    if (submitError) {
        throw new Error(`LockAsset submitTransaction Error: ${submitError}`);
    }

    if (timeoutCallback)
    {
        // Start timer for lock expiration
        setTimeout(timeoutCallback, (expiryTimeSecs * 1000) - Date.now(), contract, assetType, assetID, recipientECert, hashPreimage, hashValue);
    }

    return { preimage: hashPreimage, result: result };
};

/**
 * First/second step of a Hashed Time Lock Contract
 * - Lock a set of fungible assets using a hash
 **/
const createFungibleHTLC = async (
    contract: Contract,
    assetType: string,
    numUnits: number,
    recipientECert: string,
    hashPreimage: string,
    hashValue: string,
    expiryTimeSecs: number,
    timeoutCallback: (c: Contract, i: string, t: string, n: number, r: string, p: string, v: string) => any,
): Promise<{ preimage: any; result: any }> => {

    if (!contract)
    {
        logger.error("Contract handle not supplied");
        return { preimage: "", result: "" };
    }
    if (!assetType)
    {
        logger.error("Asset type not supplied");
        return { preimage: "", result: "" };
    }
    if (numUnits <= 0)
    {
        logger.error("Asset count must be a positive integer");
        return { preimage: "", result: "" };
    }
    if (!recipientECert)
    {
        logger.error("Recipient ECert not supplied");
        return { preimage: "", result: "" };
    }
    const currTimeSecs = Math.floor(Date.now()/1000);   // Convert epoch milliseconds to seconds
    if (expiryTimeSecs <= currTimeSecs)
    {
        logger.error("Supplied expiry time invalid or in the past: %s; current time: %s", new Date(expiryTimeSecs).toISOString(), new Date(currTimeSecs).toISOString());
        return { preimage: "", result: "" };
    }

    if (!hashValue || hashValue.length == 0)
    {
        if (!hashPreimage || hashPreimage.length == 0)
        {
            // Generate the preimage
            hashPreimage = generateRandomHashPreimage(-1);
        }
        // Hash the preimage
        hashValue = createSHA256HashBase64(hashPreimage);
    }

    const assetExchangeAgreementStr = createFungibleAssetExchangeAgreementSerialized(assetType, numUnits, recipientECert, "");
    const lockInfoStr = createAssetLockInfoSerialized(hashValue, expiryTimeSecs);

    // Normal invoke function
    const [contractId, submitError] = await helpers.handlePromise(
        contract.submitTransaction("LockFungibleAsset", assetExchangeAgreementStr, lockInfoStr),
    );
    if (submitError) {
        throw new Error(`LockFungibleAsset submitTransaction Error: ${submitError}`);
    }

    if (timeoutCallback)
    {
        // Start timer for lock expiration
        setTimeout(timeoutCallback, (expiryTimeSecs * 1000) - Date.now(), contract, contractId, assetType, numUnits, recipientECert, hashPreimage, hashValue);
    }

    return { preimage: hashPreimage, result: contractId };
};

/**
 * Latter step of a Hashed Time Lock Contract
 * - Claim a unique asset instance using a hash preimage
 **/
const claimAssetInHTLC = async (
    contract: Contract,
    assetType: string,
    assetID: string,
    lockerECert: string,
    hashPreimage: string,
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
    if (!hashPreimage)
    {
        logger.error("Hash Preimage not supplied");
        return false;
    }

    const assetExchangeAgreementStr = createAssetExchangeAgreementSerialized(assetType, assetID, "", lockerECert);
    const claimInfoStr = createAssetClaimInfoSerialized(hashPreimage);

    // Normal invoke function
    const [result, submitError] = await helpers.handlePromise(
        contract.submitTransaction("ClaimAsset", assetExchangeAgreementStr, claimInfoStr),
    );
    if (submitError) {
        throw new Error(`ClaimAsset submitTransaction Error: ${submitError}`);
    }
    return result;
};

/**
 * Latter step of a Hashed Time Lock Contract
 * - Claim a set of fungible assets using a hash preimage
 **/
const claimFungibleAssetInHTLC = async (
    contract: Contract,
    assetType: string,
    numUnits: number,
    lockerECert: string,
    hashPreimage: string,
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
    if (numUnits <= 0)
    {
        logger.error("Asset count must be a positive integer");
        return false;
    }
    if (!lockerECert)
    {
        logger.error("Locker ECert not supplied");
        return false;
    }
    if (!hashPreimage)
    {
        logger.error("Hash Preimage not supplied");
        return false;
    }

    const assetExchangeAgreementStr = createFungibleAssetExchangeAgreementSerialized(assetType, numUnits, "", lockerECert);
    const claimInfoStr = createAssetClaimInfoSerialized(hashPreimage);

    // Normal invoke function
    const [result, submitError] = await helpers.handlePromise(
        contract.submitTransaction("ClaimFungibleAsset", assetExchangeAgreementStr, claimInfoStr),
    );
    if (submitError) {
        throw new Error(`ClaimFungibleAsset submitTransaction Error: ${submitError}`);
    }
    return result;
};

/**
 * Rollback step of a Hashed Time Lock Contract
 * - Reclaim a unique asset instance
 **/
const reclaimAssetInHTLC = async (
    contract: Contract,
    assetType: string,
    assetID: string,
    recipientECert: string,
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
    if (!recipientECert)
    {
        logger.error("Recipient ECert not supplied");
        return false;
    }

    const assetExchangeAgreementStr = createAssetExchangeAgreementSerialized(assetType, assetID, recipientECert, "");

    // Normal invoke function
    const [result, submitError] = await helpers.handlePromise(
        contract.submitTransaction("UnlockAsset", assetExchangeAgreementStr),
    );
    if (submitError) {
        throw new Error(`UnlockAsset submitTransaction Error: ${submitError}`);
    }
    return result;
};

/**
 * Rollback step of a Hashed Time Lock Contract
 * - Reclaim a set of fungible assets
 **/
const reclaimFungibleAssetInHTLC = async (
    contract: Contract,
    assetType: string,
    numUnits: number,
    recipientECert: string,
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
    if (numUnits <= 0)
    {
        logger.error("Asset count must be a positive integer");
        return false;
    }
    if (!recipientECert)
    {
        logger.error("Recipient ECert not supplied");
        return false;
    }

    const assetExchangeAgreementStr = createFungibleAssetExchangeAgreementSerialized(assetType, numUnits, recipientECert, "");

    // Normal invoke function
    const [result, submitError] = await helpers.handlePromise(
        contract.submitTransaction("UnlockFungibleAsset", assetExchangeAgreementStr),
    );
    if (submitError) {
        throw new Error(`UnlockFungibleAsset submitTransaction Error: ${submitError}`);
    }
    return result;
};

/**
 * Query the state of a Hashed Time Lock Contract
 * - Determine if a unique asset instance is locked by a given party for another given party
 **/
const isAssetLockedInHTLC = async (
    contract: Contract,
    assetType: string,
    assetID: string,
    recipientECert: string,
    lockerECert: string,
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
    if (!recipientECert)
    {
        logger.error("Recipient ECert not supplied");
        return false;
    }
    if (!lockerECert)
    {
        logger.error("Locker ECert not supplied");
        return false;
    }

    const assetExchangeAgreementStr = createAssetExchangeAgreementSerialized(assetType, assetID, recipientECert, lockerECert);

    // Normal invoke function
    const [result, evaluateError] = await helpers.handlePromise(
        contract.evaluateTransaction("IsAssetLocked", assetExchangeAgreementStr),
    );
    if (evaluateError) {
        throw new Error(`IsAssetLocked evaluateTransaction Error: ${evaluateError}`);
    }
    return result;
};

/**
 * Query the state of a Hashed Time Lock Contract
 * - Determine if a set of fungible assets is locked by a given party for another given party
 **/
const isFungibleAssetLockedInHTLC = async (
    contract: Contract,
    assetType: string,
    numUnits: number,
    recipientECert: string,
    lockerECert: string,
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
    if (numUnits <= 0)
    {
        logger.error("Asset count must be a positive integer");
        return false;
    }
    if (!recipientECert)
    {
        logger.error("Recipient ECert not supplied");
        return false;
    }
    if (!lockerECert)
    {
        logger.error("Locker ECert not supplied");
        return false;
    }

    const assetExchangeAgreementStr = createFungibleAssetExchangeAgreementSerialized(assetType, numUnits, recipientECert, lockerECert);

    // Normal invoke function
    const [result, evaluateError] = await helpers.handlePromise(
        contract.evaluateTransaction("IsFungibleAssetLocked", assetExchangeAgreementStr),
    );
    if (evaluateError) {
        throw new Error(`IsFungibleAssetLocked evaluateTransaction Error: ${evaluateError}`);
    }
    return result;
};

/*const StartHTLCAssetLockEventListener = (
    contract: Contract,
    lockCallback: (c: Contract, i: string, t: string, n: number, r: string, p: string, v: string) => any,
    assetType: string,
    assetId: string,
    recipientECert: string,
    lockerECert: string,
): void => {
    const listener: ContractListener = async (event) => {
        if (event.eventName === 'LockAssetHTLC') {
            const assetLockContractInfo = event.payload.toString('utf8');
        }
    };
}*/

export {
    createAssetExchangeAgreementSerialized,
    createFungibleAssetExchangeAgreementSerialized,
    createAssetLockInfoSerialized,
    createAssetClaimInfoSerialized,
    createHTLC,
    createFungibleHTLC,
    claimAssetInHTLC,
    claimFungibleAssetInHTLC,
    reclaimAssetInHTLC,
    reclaimFungibleAssetInHTLC,
    isAssetLockedInHTLC,
    isFungibleAssetLockedInHTLC,
};
