import { TransferrableAsset } from "../lib/transferrable-asset";
import { DLAccount } from "../lib/types";
import { ConnectError, Code } from "@connectrpc/connect";
import { validateTransferrableAsset, validateAssetAccount } from "./common";
import { ClaimPledgedAssetV1Request } from "../generated/services/default_service_pb";

export function validateClaimPledgedAssetRequest(
  req: ClaimPledgedAssetV1Request,
): {
  asset: TransferrableAsset;
  sourceCert: string;
  destCert: string;
  destAccount: DLAccount;
  sourceNetwork: string;
  pledgeId: string;
} {
  if (!req.assetPledgeClaimV1PB) {
    throw new ConnectError("request data required", Code.InvalidArgument);
  }
  if (!req.assetPledgeClaimV1PB.destCertificate) {
    throw new ConnectError("destCertificate required", Code.InvalidArgument);
  }
  if (!req.assetPledgeClaimV1PB.sourceCertificate) {
    throw new ConnectError("sourceCertificate required", Code.InvalidArgument);
  }
  if (!req.assetPledgeClaimV1PB.source?.network) {
    throw new ConnectError("source.network required", Code.InvalidArgument);
  }
  if (!req.assetPledgeClaimV1PB.pledgeId) {
    throw new ConnectError("pledgeId required", Code.InvalidArgument);
  }
  return {
    destAccount: validateAssetAccount(
      req.assetPledgeClaimV1PB.destination,
      "destination",
    ),
    asset: validateTransferrableAsset(req.assetPledgeClaimV1PB.asset, "asset"),
    pledgeId: req.assetPledgeClaimV1PB.pledgeId,
    sourceNetwork: req.assetPledgeClaimV1PB.source.network,
    sourceCert: req.assetPledgeClaimV1PB.sourceCertificate,
    destCert: req.assetPledgeClaimV1PB.destCertificate,
  };
}
