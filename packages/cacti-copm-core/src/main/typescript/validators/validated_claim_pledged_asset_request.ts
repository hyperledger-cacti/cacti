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
    if (!req.assetPledgeClaimV1PB) {
      throw new ConnectError("request data required", Code.InvalidArgument);
    }

    this.destCert = validateRequiredString(
      req.assetPledgeClaimV1PB.destCertificate,
      "destCertificate",
    );
    this.sourceCert = validateRequiredString(
      req.assetPledgeClaimV1PB.sourceCertificate,
      "sourceCertificate",
    );
    this.pledgeId = validateRequiredString(
      req.assetPledgeClaimV1PB.pledgeId,
      "pledgeId",
    );

    this.sourceNetwork = validateRequiredString(
      req.assetPledgeClaimV1PB.source?.organization,
      "source.network",
    );
    (this.destAccount = validateAssetAccount(
      req.assetPledgeClaimV1PB.destination,
      "destination",
    )),
      (this.asset = validateTransferrableAsset(
        req.assetPledgeClaimV1PB.asset,
        "asset",
      ));
  }
}
