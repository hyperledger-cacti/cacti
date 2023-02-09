// * SPDX-License-Identifier: Apache-2.0
// */

/**
* This file provides helper functions for interoperability operations.
**/
/** End file docs */
import * as assetLocksPb from "@hyperledger-labs/weaver-protos-js/common/asset_locks_pb";
import * as Web3 from 'web3-utils';
import { Hash, SHA256 } from "./HashFunctions";

// Create an asset exchange agreement structure
function createAssetExchangeAgreementSerialized(assetType: string, assetID: string, locker: string, recipient: string) {
    const assetExchangeAgreement = new assetLocksPb.AssetExchangeAgreement();
    assetExchangeAgreement.setAssettype(assetType);
    assetExchangeAgreement.setId(assetID);
    assetExchangeAgreement.setRecipient(recipient);
    assetExchangeAgreement.setLocker(locker);
    return Buffer.from(assetExchangeAgreement.serializeBinary())
}

function createFungibleAssetExchangeAgreementSerialized(assetType: string, numUnits: number, locker: string, recipient: string) {
    const assetExchangeAgreement = new assetLocksPb.FungibleAssetExchangeAgreement();
    assetExchangeAgreement.setAssettype(assetType);
    assetExchangeAgreement.setNumunits(numUnits);
    assetExchangeAgreement.setRecipient(recipient);
    assetExchangeAgreement.setLocker(locker);
    return Buffer.from(assetExchangeAgreement.serializeBinary())
}


function createHybridAssetExchangeAgreementSerialized(assetType: string, assetID: string, assetData: string, numUnits: number, recipient: string) {
    const assetExchangeAgreement = new assetLocksPb.HybridAssetExchangeAgreement();
    assetExchangeAgreement.setAssettype(assetType);
    assetExchangeAgreement.setId(assetID);
    assetExchangeAgreement.setRecipient(recipient);
    assetExchangeAgreement.setAssetdata(Buffer.from(assetData, "hex"));
    assetExchangeAgreement.setNumunits(numUnits);
    return Buffer.from(assetExchangeAgreement.serializeBinary())
}

// Create an asset lock structure
function createAssetLockInfoSerialized(hash: Hash, expiryTimeSecs: number) {
    const lockInfoHTLC = new assetLocksPb.AssetLockHTLC();
    lockInfoHTLC.setHashmechanism(hash.HASH_MECHANISM);
    lockInfoHTLC.setHashbase64(Buffer.from(hash.getSerializedHashBase64(), 'base64'));
    lockInfoHTLC.setExpirytimesecs(expiryTimeSecs);
    lockInfoHTLC.setTimespec(assetLocksPb.TimeSpec.EPOCH)
    return Buffer.from(lockInfoHTLC.serializeBinary())
}

// Create an asset claim structure
function createAssetClaimInfoSerialized(hash: Hash) {
    const claimInfoHTLC = new assetLocksPb.AssetClaimHTLC();
    claimInfoHTLC.setHashmechanism(hash.HASH_MECHANISM);
    claimInfoHTLC.setHashpreimagebase64(Buffer.from(hash.getPreimage()));
    const claimInfoHTLCSerialized = claimInfoHTLC.serializeBinary();
    const claimInfo = new assetLocksPb.AssetClaim();
    claimInfo.setLockmechanism(assetLocksPb.LockMechanism.HTLC);
    claimInfo.setClaiminfo(claimInfoHTLCSerialized);
    return Buffer.from(claimInfo.serializeBinary())
}

const createHTLC = async (
    assetManagerContract: any,
    appContract: any,
    assetType: string,
    assetID: string,
    lockerAddress: string,
    recipientAddress: string,
    expiryTimeSecs: number,
    hash: Hash
): Promise<{ result: any, hash: Hash }> => {

    if (!assetManagerContract || !appContract) {
        console.log("Contract handle not supplied");
        return { result: false, hash: null };
    }
    if (!recipientAddress) {
        console.log(`Recipient address not supplied ${recipientAddress}`);
        return { result: false, hash: null };
    }
    const currTimeSecs = Math.floor(Date.now() / 1000);   // Convert epoch milliseconds to seconds
    if (expiryTimeSecs <= currTimeSecs) {
        console.log("Supplied expiry time invalid or in the past: %s; current time: %s", new Date(expiryTimeSecs).toISOString(), new Date(currTimeSecs).toISOString());
        return { result: false, hash: null };
    }
    
    if (hash == null) {
        hash = new SHA256()
    }
    if (hash.hash64 == null) {
        hash.generateRandomPreimage(22);
    }
    
    var agreement = createAssetExchangeAgreementSerialized(assetType, assetID, "", recipientAddress.slice(2));

    if (!agreement) {
        console.log("Error creating protobuf asset exchange agreement");
        return { result: false, hash: null };
    }
    const lockInfo = createAssetLockInfoSerialized(hash, expiryTimeSecs);
    // Normal invoke function
    let lockStatus = await assetManagerContract.lockNonFungibleAsset(
        appContract.address,
        agreement,
        lockInfo,
        {
            from: lockerAddress,
        }
    ).catch(function (e: any) {
        console.log(e);
        console.log("lockNonFungibleAsset threw an error");
        lockStatus = { result: false, hash: null }
    })
    return { result: lockStatus, hash: hash };
};

const createFungibleHTLC = async (
    assetManagerContract: any,
    appContract: any,
    assetType: string,
    assetAmount: number,
    lockerAddress: string,
    recipientAddress: string,
    expiryTimeSecs: number,
    hash: Hash
): Promise<{ result: any, hash: Hash }> => {

    if (!assetManagerContract || !appContract) {
        console.log("Contract handle not supplied");
        return { result: false, hash: null };
    }
    if (!recipientAddress) {
        console.log(`Recipient address not supplied ${recipientAddress}`);
        return { result: false, hash: null };
    }
    const currTimeSecs = Math.floor(Date.now() / 1000);   // Convert epoch milliseconds to seconds
    if (expiryTimeSecs <= currTimeSecs) {
        console.log("Supplied expiry time invalid or in the past: %s; current time: %s", new Date(expiryTimeSecs).toISOString(), new Date(currTimeSecs).toISOString());
        return { result: false, hash: null };
    }
    
    if (hash == null) {
        hash = new SHA256()
    }
    if (hash.hash64 == null) {
        hash.generateRandomPreimage(22);
    }
    
    var agreement = createFungibleAssetExchangeAgreementSerialized(assetType, assetAmount, "", recipientAddress.slice(2));

    if (!agreement) {
        console.log("Error creating protobuf fungible asset exchange agreement");
        return { result: false, hash: null };
    }
    const lockInfo = createAssetLockInfoSerialized(hash, expiryTimeSecs);
    // Normal invoke function
    let lockStatus = await assetManagerContract.lockFungibleAsset(
        appContract.address,
        agreement,
        lockInfo,
        {
            from: lockerAddress,
        }
    ).catch(function (e: any) {
        console.log(e);
        console.log("lockFungibleAsset threw an error");
        lockStatus = { result: false, hash: null }
    })
    return { result: lockStatus, hash: hash };
};

const createHybridHTLC = async (
    assetManagerContract: any,
    appContract: any,
    assetType: string,
    assetID: string,
    assetData: string,
    assetAmount: number,
    lockerAddress: string,
    recipientAddress: string,
    expiryTimeSecs: number,
    hash: Hash
): Promise<{ result: any, hash: Hash }> => {

    if (!assetManagerContract || !appContract) {
        console.log("Contract handle not supplied");
        return { result: false, hash: null };
    }
    if (!recipientAddress) {
        console.log(`Recipient address not supplied ${recipientAddress}`);
        return { result: false, hash: null };
    }
    const currTimeSecs = Math.floor(Date.now() / 1000);   // Convert epoch milliseconds to seconds
    if (expiryTimeSecs <= currTimeSecs) {
        console.log("Supplied expiry time invalid or in the past: %s; current time: %s", new Date(expiryTimeSecs).toISOString(), new Date(currTimeSecs).toISOString());
        return { result: false, hash: null };
    }
    
    if (hash == null) {
        hash = new SHA256()
    }
    if (hash.hash64 == null) {
        hash.generateRandomPreimage(22);
    }
    
    var agreement = createHybridAssetExchangeAgreementSerialized(assetType, String(assetID), Web3.utf8ToHex(String(assetData)), assetAmount, recipientAddress.slice(2));
    if (!agreement) {
        console.log("Error creating protobuf hybrid asset exchange agreement");
        return { result: false, hash: null };
    }
    const lockInfo = createAssetLockInfoSerialized(hash, expiryTimeSecs);
    // Normal invoke function
    let lockStatus = await assetManagerContract.lockHybridAsset(
        appContract.address,
        agreement,
        lockInfo,
        {
            from: lockerAddress,
        }
    ).catch(function (e: any) {
        console.log(e);
        console.log("lockHybridAsset threw an error");
        lockStatus = { result: false, hash: null }
    })
    
    return { result: lockStatus, hash: hash };
};

/**
 * Latter step of a Hashed Time Lock Contract
 * - Claim a unique asset instance using a hash preimage
 **/
const claimAssetInHTLC = async (
    assetManagerContract: any,
    contractId: string,
    lockerAddress: string,
    hash: Hash,
): Promise<any> => {

    if (!assetManagerContract) {
        console.log("Contract Address not supplied");
        return false;
    }

    const claimInfoStr = createAssetClaimInfoSerialized(hash);
    
    var claimStatus = await assetManagerContract.claimAsset(contractId, claimInfoStr, { from: lockerAddress }).catch(function (e: any) {
        console.log(e)
        console.log("claimAsset threw an error");
        claimStatus = false
    })

    return claimStatus;
};

const isAssetLockedInHTLC = async (
    assetManagerContract: any,
    contractId: string,
): Promise<any> => {

    if (!assetManagerContract) {
        console.log("Contract not supplied");
        return false;
    }

    // Normal invoke function
    var lockStatus = await assetManagerContract.isAssetLocked(contractId).catch(function (e: any) {
        console.log(e)
        console.log("isAssetLock threw an error");
        lockStatus = false
    })

    return lockStatus;
};


const reclaimAssetInHTLC = async (
    interopContract: any,
    contractId: string,
    locker: string,
): Promise<void> => {
    var unlockStatus = await interopContract.unlockAsset(contractId, {
        from: locker
    }).catch(function (e: any) {
        console.log(e)
        console.log("unlockAsset threw an error");
        unlockStatus = false
    })

    return unlockStatus
}

export {
    createAssetExchangeAgreementSerialized,
    createAssetClaimInfoSerialized,
    createHTLC,
    createFungibleHTLC,
    createHybridHTLC,
    claimAssetInHTLC,
    reclaimAssetInHTLC,
    isAssetLockedInHTLC
};
