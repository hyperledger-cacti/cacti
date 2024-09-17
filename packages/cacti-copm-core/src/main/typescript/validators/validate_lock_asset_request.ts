import { TransferrableAsset } from "../lib/transferrable-asset";
import { DLAccount } from "../lib/types";
import { ConnectError, Code } from "@connectrpc/connect";
import {
  validateTransferrableAsset,
  validateAssetAccount,
  validateHashInfo,
} from "./common";
import { LockAssetV1Request } from "../generated/services/default_service_pb";
import { HashFunctions } from "@hyperledger/cacti-weaver-sdk-fabric";

export function validateLockAssetRequest(request: LockAssetV1Request): {
  sourceAccount: DLAccount;
  hashInfo: HashFunctions.Hash;
  sourceCertificate: string;
  destinationCertificate: string;
  asset: TransferrableAsset;
  expirySecs: number;
} {
  if (!request.assetLockV1PB) {
    throw new ConnectError("data required", Code.InvalidArgument);
  }
  if (!request.assetLockV1PB.destinationCertificate) {
    throw new ConnectError(
      "destinationCertificate required",
      Code.InvalidArgument,
    );
  }
  if (!request.assetLockV1PB.sourceCertificate) {
    throw new ConnectError("sourceCertificate required", Code.InvalidArgument);
  }

  // destination account is required only in CORDA implementation
  return {
    sourceAccount: validateAssetAccount(request.assetLockV1PB.source, "source"),
    hashInfo: validateHashInfo(request.assetLockV1PB.hashInfo, "hashInfo"),
    asset: validateTransferrableAsset(request.assetLockV1PB.asset, "asset"),
    sourceCertificate: request.assetLockV1PB.sourceCertificate,
    destinationCertificate: request.assetLockV1PB.destinationCertificate,
    expirySecs: request.assetLockV1PB.expirySecs
      ? Number(request.assetLockV1PB.expirySecs)
      : 60,
  };
}
