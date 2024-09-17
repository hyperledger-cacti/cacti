import { TransferrableAsset } from "../lib/transferrable-asset";
import { DLAccount } from "../lib/types";
import { HashFunctions } from "@hyperledger/cacti-weaver-sdk-fabric";
import { ConnectError, Code } from "@connectrpc/connect";
import {
  validateTransferrableAsset,
  validateHashInfo,
  validateAssetAccount,
  validateRequiredString,
} from "./common";
import { ClaimLockedAssetV1Request } from "../generated/services/default_service_pb";

export function validateClaimLockedAssetRequest(
  req: ClaimLockedAssetV1Request,
): {
  asset: TransferrableAsset;
  destination: DLAccount;
  hashInfo: HashFunctions.Hash;
  lockId: string;
} {
  if (!req.assetLockClaimV1PB) {
    throw new ConnectError(`request data is required`, Code.InvalidArgument);
  }

  return {
    asset: validateTransferrableAsset(req.assetLockClaimV1PB.asset, "asset"),
    hashInfo: validateHashInfo(req.assetLockClaimV1PB.hashInfo, "hashInfo"),
    destination: validateAssetAccount(
      req.assetLockClaimV1PB.destination,
      "destination",
    ),
    lockId: validateRequiredString(req.assetLockClaimV1PB.lockId, "lockId"),
  };
}
