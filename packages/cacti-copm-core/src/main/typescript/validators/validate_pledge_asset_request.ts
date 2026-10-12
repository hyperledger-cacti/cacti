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
  if (!req.assetPledgeV1Pb) {
    throw new ConnectError(`request data is required`, Code.InvalidArgument);
  }
  if (!req.assetPledgeV1Pb.destination?.organization) {
    throw new ConnectError("destination.organization is required");
  }
  if (!req.assetPledgeV1Pb.destinationCertificate) {
    throw new ConnectError("destinationCertificate is required");
  }

  return {
    asset: validateTransferrableAsset(req.assetPledgeV1Pb.asset, "asset"),
    source: validateAssetAccount(req.assetPledgeV1Pb.source, "source"),
    destinationOrganization: req.assetPledgeV1Pb.destination.organization,
    destinationCertificate: req.assetPledgeV1Pb.destinationCertificate,
    expirySecs: req.assetPledgeV1Pb.expirySecs
      ? Number(req.assetPledgeV1Pb.expirySecs)
      : 60,
  };
}
