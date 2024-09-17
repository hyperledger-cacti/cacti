import { ConnectError, Code } from "@connectrpc/connect";
import { AssetAccountV1PB } from "../generated/models/asset_account_v1_pb_pb";
import { HashInfoV1PB } from "../generated/models/hash_info_v1_pb_pb";
import { TransferrableAssetV1PB } from "../generated/models/transferrable_asset_v1_pb_pb";
import { HashFunctions } from "@hyperledger/cacti-weaver-sdk-fabric";
import { DLAccount } from "../lib/types";
import { TransferrableAsset } from "../lib/transferrable-asset";

export function validateAssetAccount(
  account: AssetAccountV1PB | undefined,
  object_prefix: string,
): DLAccount {
  if (!account) {
    throw new ConnectError(`${object_prefix} required`, Code.InvalidArgument);
  }
  if (!account.organization) {
    throw new ConnectError(
      `${object_prefix}.organization required`,
      Code.InvalidArgument,
    );
  }
  if (!account.userId) {
    throw new ConnectError(
      `${object_prefix}.userId required`,
      Code.InvalidArgument,
    );
  }
  return {
    organization: account.organization,
    userId: account.userId,
  };
}

export function validateTransferrableAsset(
  asset: TransferrableAssetV1PB | undefined,
  object_prefix: string,
) {
  if (!asset) {
    throw new ConnectError(`${object_prefix} required`, Code.InvalidArgument);
  }

  if (!asset.assetType) {
    throw new ConnectError(
      `${object_prefix}.assetType required`,
      Code.InvalidArgument,
    );
  }

  if (!asset.assetId && !asset.assetQuantity) {
    throw new ConnectError(
      `Either ${object_prefix}.assetQuantity or ${object_prefix}.assetId must be supplied`,
      Code.InvalidArgument,
    );
  }

  return new TransferrableAsset(asset);
}

export function validateHashInfo(
  hashInfo: HashInfoV1PB | undefined,
  object_prefix: string,
): HashFunctions.Hash {
  if (!hashInfo) {
    throw new ConnectError(`${object_prefix} required`, Code.InvalidArgument);
  }
  if (!hashInfo.secret) {
    throw new ConnectError(
      `${object_prefix}.secret required`,
      Code.InvalidArgument,
    );
  }
  let hash: HashFunctions.Hash;
  if (hashInfo?.hashFcn == "SHA512") {
    hash = new HashFunctions.SHA512();
  } else {
    hash = new HashFunctions.SHA256();
  }
  hash.setPreimage(hashInfo.secret);
  return hash;
}

export function validateRequiredString(
  value: string | undefined,
  object_prefix: string,
): string {
  if (!value) {
    throw new ConnectError(`${object_prefix} required`, Code.InvalidArgument);
  }
  return value;
}
