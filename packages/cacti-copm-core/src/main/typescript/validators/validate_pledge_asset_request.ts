import { TransferrableAsset } from "../lib/transferrable-asset";
import { DLAccount } from "../lib/types";
import { ConnectError, Code } from "@connectrpc/connect";
import { validateTransferrableAsset, validateAssetAccount } from "./common";
import { PledgeAssetV1Request } from "../generated/services/default_service_pb";

export function validatePledgeAssetRequest(req: PledgeAssetV1Request): {
  asset: TransferrableAsset;
  source: DLAccount;
  destinationOrganization: string;
  destinationCertificate: string;
  expirySecs: number;
} {
  if (!req.assetPledgeV1PB) {
    throw new ConnectError(`request data is required`, Code.InvalidArgument);
  }
  if (!req.assetPledgeV1PB.destination?.organization) {
    throw new ConnectError("destination.organization is required");
  }
  if (!req.assetPledgeV1PB.destinationCertificate) {
    throw new ConnectError("destinationCertificate is required");
  }

  return {
    asset: validateTransferrableAsset(req.assetPledgeV1PB.asset, "asset"),
    source: validateAssetAccount(req.assetPledgeV1PB.source, "source"),
    destinationOrganization: req.assetPledgeV1PB.destination.organization,
    destinationCertificate: req.assetPledgeV1PB.destinationCertificate,
    expirySecs: req.assetPledgeV1PB.expirySecs
      ? Number(req.assetPledgeV1PB.expirySecs)
      : 60,
  };
}
