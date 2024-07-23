import { TransferrableAsset } from "../lib/transferrable-asset";
import { DLAccount } from "../lib/types";
import { HashFunctions } from "@hyperledger/cacti-weaver-sdk-fabric";
import { ConnectError, Code } from "@connectrpc/connect";
import {
  validateTransferrableAsset,
  validateHashInfo,
  validateAssetAccount,
} from "./common";
import { ClaimLockedAssetV1Request } from "../generated/services/default_service_pb";

export function validateClaimLockedAssetRequest(
  req: ClaimLockedAssetV1Request,
): {
  asset: TransferrableAsset;
  destination: DLAccount;
  hashInfo: HashFunctions.Hash;
  lockId: string;
  sourceCertificate: string;
  destCertificate: string;
} {
  if (!req.assetLockClaimV1PB) {
    throw new ConnectError(`request data is required`, Code.InvalidArgument);
  }
  if (
    !req.assetLockClaimV1PB?.asset?.assetId &&
    !req.assetLockClaimV1PB?.lockId
  ) {
    throw new ConnectError(
      "either lockId or asset.assetId is required",
      Code.InvalidArgument,
    );
  }

  if (req.assetLockClaimV1PB?.asset.assetId) {
    if (!req.assetLockClaimV1PB?.destCertificate) {
      throw new ConnectError(
        "destinationCertificate required for NFT claim",
        Code.InvalidArgument,
      );
    }
    if (!req.assetLockClaimV1PB?.sourceCertificate) {
      throw new ConnectError(
        "sourceCertificate required for NFT claim",
        Code.InvalidArgument,
      );
    }
  } else {
    if (!req.assetLockClaimV1PB.lockId) {
      throw new ConnectError(
        "lockId must be supplied for fungible assets",
        Code.InvalidArgument,
      );
    }
  }

  return {
    asset: validateTransferrableAsset(req.assetLockClaimV1PB.asset, "asset"),
    hashInfo: validateHashInfo(req.assetLockClaimV1PB.hashInfo, "hashInfo"),
    destination: validateAssetAccount(
      req.assetLockClaimV1PB.destination,
      "destination",
    ),
    sourceCertificate: req.assetLockClaimV1PB.sourceCertificate || "",
    destCertificate: req.assetLockClaimV1PB.destCertificate || "",
    lockId: req.assetLockClaimV1PB.lockId || "",
  };
}
