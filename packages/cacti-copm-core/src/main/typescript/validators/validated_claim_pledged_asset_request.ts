import { TransferrableAsset } from "../lib/transferrable-asset";
import { DLAccount } from "../lib/types";
import { ConnectError, Code } from "@connectrpc/connect";
import {
  validateTransferrableAsset,
  validateAssetAccount,
  validateRequiredString,
} from "./common";
import { ClaimPledgedAssetV1Request } from "../generated/services/default_service_pb";

export class ValidatedClaimPledgedAssetRequest {
  public asset: TransferrableAsset;
  public sourceCert: string;
  public destCert: string;
  public destAccount: DLAccount;
  public sourceNetwork: string;
  public pledgeId: string;

  constructor(req: ClaimPledgedAssetV1Request) {
    if (!req.assetPledgeClaimV1Pb) {
      throw new ConnectError("request data required", Code.InvalidArgument);
    }

    this.destCert = validateRequiredString(
      req.assetPledgeClaimV1Pb.destCertificate,
      "destCertificate",
    );
    this.sourceCert = validateRequiredString(
      req.assetPledgeClaimV1Pb.sourceCertificate,
      "sourceCertificate",
    );
    this.pledgeId = validateRequiredString(
      req.assetPledgeClaimV1Pb.pledgeId,
      "pledgeId",
    );

    this.sourceNetwork = validateRequiredString(
      req.assetPledgeClaimV1Pb.source?.organization,
      "source.network",
    );
    (this.destAccount = validateAssetAccount(
      req.assetPledgeClaimV1Pb.destination,
      "destination",
    )),
      (this.asset = validateTransferrableAsset(
        req.assetPledgeClaimV1Pb.asset,
        "asset",
      ));
  }
}
