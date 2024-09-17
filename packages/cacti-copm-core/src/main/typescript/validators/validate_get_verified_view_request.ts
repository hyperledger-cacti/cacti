import { DLAccount } from "../lib/types";
import { ConnectError, Code } from "@connectrpc/connect";
import { validateAssetAccount } from "./common";
import { GetVerifiedViewV1Request } from "../generated/services/default_service_pb";

export function validateGetVerifiedViewRequest(req: GetVerifiedViewV1Request): {
  account: DLAccount;
  method: string;
  contractId: string;
  args: string[];
  remoteNetwork: string;
} {
  if (!req.getVerifiedViewV1RequestPB) {
    throw new ConnectError("request data required", Code.InvalidArgument);
  }
  if (!req.getVerifiedViewV1RequestPB.view) {
    throw new ConnectError("view required", Code.InvalidArgument);
  }
  if (!req.getVerifiedViewV1RequestPB.view.organization) {
    throw new ConnectError("view.organization required", Code.InvalidArgument);
  }
  if (!req.getVerifiedViewV1RequestPB.view.viewAddress) {
    throw new ConnectError("view.viewAddress required", Code.InvalidArgument);
  }
  if (!req.getVerifiedViewV1RequestPB.view.viewAddress.contractId) {
    throw new ConnectError(
      "view.viewAddress.contractId required",
      Code.InvalidArgument,
    );
  }
  if (!req.getVerifiedViewV1RequestPB.view.viewAddress.function) {
    throw new ConnectError(
      "view.viewAddress.function required",
      Code.InvalidArgument,
    );
  }

  const args = req.getVerifiedViewV1RequestPB?.view?.viewAddress?.input
    ? req.getVerifiedViewV1RequestPB.view.viewAddress.input
    : [];

  return {
    account: validateAssetAccount(
      req.getVerifiedViewV1RequestPB.account,
      "account",
    ),
    remoteNetwork: req.getVerifiedViewV1RequestPB.view.organization,
    contractId: req.getVerifiedViewV1RequestPB.view.viewAddress.contractId,
    method: req.getVerifiedViewV1RequestPB.view.viewAddress.function,
    args: args,
  };
}
