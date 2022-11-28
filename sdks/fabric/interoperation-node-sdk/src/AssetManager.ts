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
import assetLocksPb from "@hyperledger-labs/weaver-protos-js/common/asset_locks_pb";
import { Contract, ContractListener } from "fabric-network";
import { Hash, SHA256 } from "./HashFunctions"
const logger = log4js.getLogger("InteroperableHelper");


// Create an asset exchange agreement structure
function createAssetExchangeAgreementSerialized(assetType, assetID, recipientECert, lockerECert)
{
    const assetExchangeAgreement = new assetLocksPb.AssetExchangeAgreement();
    assetExchangeAgreement.setAssettype(assetType);
    assetExchangeAgreement.setId(assetID);
    assetExchangeAgreement.setRecipient(recipientECert);
    assetExchangeAgreement.setLocker(lockerECert);
    return Buffer.from(assetExchangeAgreement.serializeBinary()).toString('base64');
}

// Create a fungible asset exchange agreement structure
function createFungibleAssetExchangeAgreementSerialized(assetType, numUnits, recipientECert, lockerECert)
{
    const assetExchangeAgreement = new assetLocksPb.FungibleAssetExchangeAgreement();
    assetExchangeAgreement.setAssettype(assetType);
    assetExchangeAgreement.setNumunits(numUnits);
    assetExchangeAgreement.setRecipient(recipientECert);
    assetExchangeAgreement.setLocker(lockerECert);
    return Buffer.from(assetExchangeAgreement.serializeBinary()).toString('base64');
}

// Create an asset lock structure
function createAssetLockInfoSerialized(hash, expiryTimeSecs)
{
    const lockInfoHTLC = new assetLocksPb.AssetLockHTLC();
    lockInfoHTLC.setHashmechanism(hash.HASH_MECHANISM);
    lockInfoHTLC.setHashbase64(Buffer.from(hash.getSerializedHashBase64()));
    lockInfoHTLC.setExpirytimesecs(expiryTimeSecs);
    lockInfoHTLC.setTimespec(assetLocksPb.TimeSpec.EPOCH)
    const lockInfoHTLCSerialized = lockInfoHTLC.serializeBinary();
    const lockInfo = new assetLocksPb.AssetLock();
    lockInfo.setLockmechanism(assetLocksPb.LockMechanism.HTLC);
    lockInfo.setLockinfo(lockInfoHTLCSerialized);
    return Buffer.from(lockInfo.serializeBinary()).toString('base64');
}

// Create an asset claim structure
function createAssetClaimInfoSerialized(hash)
{
    const claimInfoHTLC = new assetLocksPb.AssetClaimHTLC();
    claimInfoHTLC.setHashmechanism(hash.HASH_MECHANISM);
    claimInfoHTLC.setHashpreimagebase64(Buffer.from(hash.getSerializedPreimageBase64()));
    const claimInfoHTLCSerialized = claimInfoHTLC.serializeBinary();
    const claimInfo = new assetLocksPb.AssetClaim();
    claimInfo.setLockmechanism(assetLocksPb.LockMechanism.HTLC);
    claimInfo.setClaiminfo(claimInfoHTLCSerialized);
    return Buffer.from(claimInfo.serializeBinary()).toString('base64');
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
    hash: Hash,
    expiryTimeSecs: number,
    timeoutCallback: (c: Contract, t: string, i: string, r: string, h: Hash) => any,
): Promise<{ hash: Hash; result: any }> => {

    if (!contract)
    {
        logger.error("Contract handle not supplied");
        return { hash: null, result: false };
    }
    if (!assetType)
    {
        logger.error("Asset type not supplied");
        return { hash: null, result: false };
    }
    if (!assetID)
    {
        logger.error("Asset ID not supplied");
        return { hash: null, result: false };
    }
    if (!recipientECert)
    {
        logger.error("Recipient ECert not supplied");
        return { hash: null, result: false };
    }
    const currTimeSecs = Math.floor(Date.now()/1000);   // Convert epoch milliseconds to seconds
    if (expiryTimeSecs <= currTimeSecs)
    {
        logger.error("Supplied expiry time invalid or in the past: %s; current time: %s", new Date(expiryTimeSecs).toISOString(), new Date(currTimeSecs).toISOString());
        return { hash: null, result: false };
    }
    
    if (hash == null) {
        hash = new SHA256()
    }
    if (hash.hash64 == null) {
        hash.generateRandomPreimage(22);
    }

    const assetExchangeAgreementStr = createAssetExchangeAgreementSerialized(assetType, assetID, recipientECert, "");
    const lockInfoStr = createAssetLockInfoSerialized(hash, expiryTimeSecs);

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
        setTimeout(timeoutCallback, (expiryTimeSecs * 1000) - Date.now(), contract, assetType, assetID, recipientECert, hash);
    }

    return { hash: hash, result: result };
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
    hash: Hash,
    expiryTimeSecs: number,
    timeoutCallback: (c: Contract, i: string, t: string, n: number, r: string, h: Hash) => any,
): Promise<{ hash: Hash; result: any }> => {

    if (!contract)
    {
        logger.error("Contract handle not supplied");
        return { hash: null, result: "" };
    }
    if (!assetType)
    {
        logger.error("Asset type not supplied");
        return { hash: null, result: "" };
    }
    if (numUnits <= 0)
    {
        logger.error("Asset count must be a positive integer");
        return { hash: null, result: "" };
    }
    if (!recipientECert)
    {
        logger.error("Recipient ECert not supplied");
        return { hash: null, result: "" };
    }
    const currTimeSecs = Math.floor(Date.now()/1000);   // Convert epoch milliseconds to seconds
    if (expiryTimeSecs <= currTimeSecs)
    {
        logger.error("Supplied expiry time invalid or in the past: %s; current time: %s", new Date(expiryTimeSecs).toISOString(), new Date(currTimeSecs).toISOString());
        return { hash: null, result: "" };
    }
    
    if (!hash) {
        hash = new SHA256()
    }
    if (hash.hash64 == null) {
        hash.generateRandomPreimage(22);
    }

    const assetExchangeAgreementStr = createFungibleAssetExchangeAgreementSerialized(assetType, numUnits, recipientECert, "");
    const lockInfoStr = createAssetLockInfoSerialized(hash, expiryTimeSecs);

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
        setTimeout(timeoutCallback, (expiryTimeSecs * 1000) - Date.now(), contract, contractId, assetType, numUnits, recipientECert, hash);
    }

    return { hash: hash, result: contractId };
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
    hash: Hash,
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
    if(!hash)
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
 * - Claim a unique asset instance using a hash preimage and contractId
 **/
const claimAssetInHTLCusingContractId = async (
    contract: Contract,
    contractId: string,
    hash: Hash,
): Promise<any> => {

    if (!contract)
    {
        logger.error("Contract handle not supplied");
        return false;
    }
    if (!contractId)
    {
        logger.error("contract ID not supplied");
        return false;
    }
    if(!hash)
    {
        logger.error("Instance of Hash interface not supplied")
        return false
    }
    if (!hash.preimage)
    {
        logger.error("Hash Preimage not supplied");
        return false;
    }

    const claimInfoStr = createAssetClaimInfoSerialized(hash);

    // Normal invoke function
    const [result, submitError] = await helpers.handlePromise(
        contract.submitTransaction("ClaimAssetUsingContractId", contractId, claimInfoStr),
    );
    if (submitError) {
        throw new Error(`ClaimAssetUsingContractId submitTransaction Error: ${submitError}`);
    }
    return result;
};


/**
 * Latter step of a Hashed Time Lock Contract
 * - Claim a set of fungible assets using a hash preimage
 **/
const claimFungibleAssetInHTLC = async (
    contract: Contract,
    contractId: string,
    hash: Hash,
): Promise<any> => {

    if (!contract)
    {
        logger.error("Contract handle not supplied");
        return false;
    }
    if (!contractId)
    {
        logger.error("contract ID not supplied");
        return false;
    }
    if(!hash)
    {
        logger.error("Instance of Hash interface not supplied")
        return false
    }
    if (!hash.preimage)
    {
        logger.error("Hash Preimage not supplied");
        return false;
    }

    const claimInfoStr = createAssetClaimInfoSerialized(hash);

    // Normal invoke function
    const [result, submitError] = await helpers.handlePromise(
        contract.submitTransaction("ClaimFungibleAsset", contractId, claimInfoStr),
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
 * - Reclaim a unique asset instance using contractId
 **/
const reclaimAssetInHTLCusingContractId = async (
    contract: Contract,
    contractId: string,
): Promise<any> => {

    if (!contract)
    {
        logger.error("Contract handle not supplied");
        return false;
    }
    if (!contractId)
    {
        logger.error("contract ID not supplied");
        return false;
    }

    // Normal invoke function
    const [result, submitError] = await helpers.handlePromise(
        contract.submitTransaction("UnlockAssetUsingContractId", contractId),
    );
    if (submitError) {
        throw new Error(`UnlockAssetUsingContractId submitTransaction Error: ${submitError}`);
    }
    return result;
};

/**
 * Rollback step of a Hashed Time Lock Contract
 * - Reclaim a set of fungible assets
 **/
const reclaimFungibleAssetInHTLC = async (
    contract: Contract,
    contractId: string,
): Promise<any> => {

    if (!contract)
    {
        logger.error("Contract handle not supplied");
        return false;
    }
    if (!contractId)
    {
        logger.error("contract ID not supplied");
        return false;
    }

    // Normal invoke function
    const [result, submitError] = await helpers.handlePromise(
        contract.submitTransaction("UnlockFungibleAsset", contractId),
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
 * Query the state of a Hashed Time Lock Contract using contractId
 * - Determine if a unique asset instance is locked by a given party for another given party
 **/
const isAssetLockedInHTLCqueryUsingContractId = async (
    contract: Contract,
    contractId: string,
): Promise<any> => {

    if (!contract)
    {
        logger.error("Contract handle not supplied");
        return false;
    }
    if (!contractId)
    {
        logger.error("contract ID not supplied");
        return false;
    }

    // Normal invoke function
    const [result, evaluateError] = await helpers.handlePromise(
        contract.evaluateTransaction("IsAssetLockedQueryUsingContractId", contractId),
    );
    if (evaluateError) {
        throw new Error(`IsAssetLockedQueryUsingContractId evaluateTransaction Error: ${evaluateError}`);
    }
    return result;
};

/**
 * Query the state of a Hashed Time Lock Contract
 * - Determine if a set of fungible assets is locked by a given party for another given party
 **/
const isFungibleAssetLockedInHTLC = async (
    contract: Contract,
    contractId: string,
): Promise<any> => {

    if (!contract)
    {
        logger.error("Contract handle not supplied");
        return false;
    }
    if (!contractId)
    {
        logger.error("contract ID not supplied");
        return false;
    }

    // Normal invoke function
    const [result, evaluateError] = await helpers.handlePromise(
        contract.evaluateTransaction("IsFungibleAssetLocked", contractId),
    );
    if (evaluateError) {
        throw new Error(`IsFungibleAssetLocked evaluateTransaction Error: ${evaluateError}`);
    }
    return result;
};


/**
 * HTLC Lifecycle Events
 * - Developers should note that event emission and actions in response occur on a best effort basis.
 * - Also, there is no guarantee that a particular event (lock, claim, reclaim) will ever get emitted
 * - Therefore, the calling (or listening) logic should incorporate suitable fallbacks and timeouts.
 **/

/**
 * The below functions trigger callbacks passed as arguments when a matching event is received from the contract layer
 **/
const StartHTLCEventListener = (
    contract: Contract,
    eventName: string,
    contractId: string,
    assetType: string,
    assetId: string,
    numUnits: number,
    recipientECert: string,
    lockerECert: string,
    eventCallback: Function,
): void => {
    const listener: ContractListener = async (event) => {
        if (event.eventName === eventName) {
            let assetLockContractInfo;
            if (eventName.includes('Fungible')) {
                const eventInfo: assetLocksPb.FungibleAssetContractHTLC = assetLocksPb.FungibleAssetContractHTLC.deserializeBinary(event.payload);
                assetLockContractInfo = eventInfo;
            } else {
                const eventInfo: assetLocksPb.AssetContractHTLC = assetLocksPb.AssetContractHTLC.deserializeBinary(event.payload);
                assetLockContractInfo = eventInfo;
            }
            const infoContractId = assetLockContractInfo.getContractid();
            if (contractId && contractId.length > 0) {
                if (infoContractId.length > 0 && infoContractId !== contractId) {
                    return;
                }
            }
            const infoAssetType = assetLockContractInfo.getAgreement().getType();
            if (assetType && assetType.length > 0) {
                if (infoAssetType.length > 0 && infoAssetType !== assetType) {
                    return;
                }
            }
            let infoNumUnits: number, infoAssetId: string;
            if (eventName.includes('Fungible')) {
                infoNumUnits = assetLockContractInfo.getAgreement().getNumunits();
                if (infoNumUnits !== numUnits) {
                    return;
                }
            } else {
                infoAssetId = assetLockContractInfo.getAgreement().getId();
                if (assetId && assetId.length > 0) {
                    if (infoAssetId.length > 0 && infoAssetId !== assetId) {
                        return;
                    }
                }
            }
            const infoRecipient = assetLockContractInfo.getAgreement().getRecipient();
            if (recipientECert && recipientECert.length > 0) {
                if (infoRecipient.length > 0 && infoRecipient !== recipientECert) {
                    return;
                }
            }
            const infoLocker = assetLockContractInfo.getAgreement().getLocker();
            if (lockerECert && lockerECert.length > 0) {
                if (infoLocker.length > 0 && infoLocker !== lockerECert) {
                    return;
                }
            }
            // All filters passed
            if (eventName === 'LockAsset' || eventName === 'LockFungibleAsset') {
                const hashBase64 = assetLockContractInfo.getLock().getHashbase64();
                //const hashValue: string = Buffer.from(hashBase64.toString(), 'base64').toString('utf8');
                if (eventName === 'LockAsset') {
                    eventCallback(contract, infoContractId, infoAssetType, infoAssetId, infoRecipient, infoLocker, hashBase64);
                } else {
                    eventCallback(contract, infoContractId, infoAssetType, infoNumUnits, infoRecipient, infoLocker, hashBase64);
                }
            } else if (eventName === 'ClaimAsset' || eventName === 'ClaimFungibleAsset') {
                const hashPreimageBase64 = assetLockContractInfo.getClaim().getHashpreimagebase64();
                const hashPreimage: string = Buffer.from(hashPreimageBase64.toString(), 'base64').toString('utf8');
                if (eventName === 'ClaimAsset') {
                    eventCallback(contract, infoContractId, infoAssetType, infoAssetId, infoRecipient, infoLocker, hashPreimage);
                } else {
                    eventCallback(contract, infoContractId, infoAssetType, infoNumUnits, infoRecipient, infoLocker, hashPreimage);
                }
            } else if (eventName === 'UnlockAsset') {
                eventCallback(contract, infoContractId, infoAssetType, infoAssetId, infoRecipient, infoLocker);
            } else if (eventName === 'UnlockFungibleAsset') {
                eventCallback(contract, infoContractId, infoAssetType, infoNumUnits, infoRecipient, infoLocker);
            }
        }
    };
    contract.addContractListener(listener);
}

const StartHTLCAssetLockListener = (
    contract: Contract,
    contractId: string,
    assetType: string,
    assetId: string,
    recipientECert: string,
    lockerECert: string,
    lockCallback: (c: Contract, d: string, t: string, i: string, r: string, l: string, v: string) => any,
): void => {
    StartHTLCEventListener(contract, 'LockAsset', contractId, assetType, assetId, -1, recipientECert, lockerECert, lockCallback);
}

const StartHTLCAssetClaimListener = (
    contract: Contract,
    contractId: string,
    assetType: string,
    assetId: string,
    recipientECert: string,
    lockerECert: string,
    claimCallback: (c: Contract, d: string, t: string, i: string, r: string, l: string, p: string) => any,
): void => {
    StartHTLCEventListener(contract, 'ClaimAsset', contractId, assetType, assetId, -1, recipientECert, lockerECert, claimCallback);
}

const StartHTLCAssetUnlockListener = (
    contract: Contract,
    contractId: string,
    assetType: string,
    assetId: string,
    recipientECert: string,
    lockerECert: string,
    unlockCallback: (c: Contract, d: string, t: string, i: string, r: string, l: string) => any,
): void => {
    StartHTLCEventListener(contract, 'UnlockAsset', contractId, assetType, assetId, -1, recipientECert, lockerECert, unlockCallback);
}

const StartHTLCFungibleAssetLockListener = (
    contract: Contract,
    contractId: string,
    assetType: string,
    numUnits: number,
    recipientECert: string,
    lockerECert: string,
    lockCallback: (c: Contract, d: string, t: string, n: number, r: string, l: string, v: string) => any,
): void => {
    StartHTLCEventListener(contract, 'LockFungibleAsset', contractId, assetType, "", numUnits, recipientECert, lockerECert, lockCallback);
}

const StartHTLCFungibleAssetClaimListener = (
    contract: Contract,
    contractId: string,
    assetType: string,
    numUnits: number,
    recipientECert: string,
    lockerECert: string,
    claimCallback: (c: Contract, d: string, t: string, n: number, r: string, l: string, p: string) => any,
): void => {
    StartHTLCEventListener(contract, 'ClaimFungibleAsset', contractId, assetType, "", numUnits, recipientECert, lockerECert, claimCallback);
}

const StartHTLCFungibleAssetUnlockListener = (
    contract: Contract,
    contractId: string,
    assetType: string,
    numUnits: number,
    recipientECert: string,
    lockerECert: string,
    unlockCallback: (c: Contract, d: string, t: string, n: number, r: string, l: string) => any,
): void => {
    StartHTLCEventListener(contract, 'UnlockFungibleAsset', contractId, assetType, "", numUnits, recipientECert, lockerECert, unlockCallback);
}

/**
 * The below functions return promises for HTLC events.
 * Developers can use 'await' to synchronously manage asset swapping logic.
 **/
const HTLCAssetLocked = async (
    contract: Contract,
    contractId: string,
    assetType: string,
    assetId: string,
    recipientECert: string,
    lockerECert: string,
): Promise<string> => {
    return new Promise((resolve, reject) => {
        const waitForLock = (contract, contractId, assetType, assetId, recipientECert, lockerECert, hashValue) => {
            resolve(hashValue);
        };
        StartHTLCAssetLockListener(contract, contractId, assetType, assetId, recipientECert, lockerECert, waitForLock);
    });
}

const HTLCAssetClaimed = async (
    contract: Contract,
    contractId: string,
    assetType: string,
    assetId: string,
    recipientECert: string,
    lockerECert: string,
): Promise<string> => {
    return new Promise((resolve, reject) => {
        const waitForClaim = (contract, contractId, assetType, assetId, recipientECert, lockerECert, hashPreimage) => {
            resolve(hashPreimage);
        };
        StartHTLCAssetClaimListener(contract, contractId, assetType, assetId, recipientECert, lockerECert, waitForClaim);
    });
}

const HTLCAssetUnlocked = async (
    contract: Contract,
    contractId: string,
    assetType: string,
    assetId: string,
    recipientECert: string,
    lockerECert: string,
): Promise<void> => {
    return new Promise((resolve, reject) => {
        const waitForUnlock = (contract, contractId, assetType, assetId, recipientECert, lockerECert) => {
            resolve();
        };
        StartHTLCAssetUnlockListener(contract, contractId, assetType, assetId, recipientECert, lockerECert, waitForUnlock);
    });
}

const HTLCFungibleAssetLocked = async (
    contract: Contract,
    contractId: string,
    assetType: string,
    numUnits: number,
    recipientECert: string,
    lockerECert: string,
): Promise<string> => {
    return new Promise((resolve, reject) => {
        const waitForLock = (contract, contractId, assetType, numUnits, recipientECert, lockerECert, hashValue) => {
            resolve(hashValue);
        };
        StartHTLCFungibleAssetLockListener(contract, contractId, assetType, numUnits, recipientECert, lockerECert, waitForLock);
    });
}

const HTLCFungibleAssetClaimed = async (
    contract: Contract,
    contractId: string,
    assetType: string,
    numUnits: number,
    recipientECert: string,
    lockerECert: string,
): Promise<string> => {
    return new Promise((resolve, reject) => {
        const waitForClaim = (contract, contractId, assetType, numUnits, recipientECert, lockerECert, hashPreimage) => {
            resolve(hashPreimage);
        };
        StartHTLCFungibleAssetClaimListener(contract, contractId, assetType, numUnits, recipientECert, lockerECert, waitForClaim);
    });
}

const HTLCFungibleAssetUnlocked = async (
    contract: Contract,
    contractId: string,
    assetType: string,
    numUnits: number,
    recipientECert: string,
    lockerECert: string,
): Promise<void> => {
    return new Promise((resolve, reject) => {
        const waitForUnlock = (contract, contractId, assetType, numUnits, recipientECert, lockerECert) => {
            resolve();
        };
        StartHTLCFungibleAssetUnlockListener(contract, contractId, assetType, numUnits, recipientECert, lockerECert, waitForUnlock);
    });
}

export {
    createAssetExchangeAgreementSerialized,
    createFungibleAssetExchangeAgreementSerialized,
    createAssetLockInfoSerialized,
    createAssetClaimInfoSerialized,
    createHTLC,
    createFungibleHTLC,
    claimAssetInHTLC,
    claimAssetInHTLCusingContractId,
    claimFungibleAssetInHTLC,
    reclaimAssetInHTLC,
    reclaimAssetInHTLCusingContractId,
    reclaimFungibleAssetInHTLC,
    isAssetLockedInHTLC,
    isAssetLockedInHTLCqueryUsingContractId,
    isFungibleAssetLockedInHTLC,
    StartHTLCAssetLockListener,
    StartHTLCAssetClaimListener,
    StartHTLCAssetUnlockListener,
    StartHTLCFungibleAssetLockListener,
    StartHTLCFungibleAssetClaimListener,
    StartHTLCFungibleAssetUnlockListener,
    HTLCAssetLocked,
    HTLCAssetClaimed,
    HTLCAssetUnlocked,
    HTLCFungibleAssetLocked,
    HTLCFungibleAssetClaimed,
    HTLCFungibleAssetUnlocked,
};
