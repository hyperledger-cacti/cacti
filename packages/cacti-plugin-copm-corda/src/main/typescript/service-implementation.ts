import { Logger } from "@hyperledger-cacti/cactus-common";
import { ServiceImpl, PromiseClient } from "@connectrpc/connect";

import type { ServiceType } from "@bufbuild/protobuf";
import {
  DefaultService,
  PledgeAssetV1Request,
  PledgeAssetV1Response,
  ClaimPledgedAssetV1Request,
  LockAssetV1Request,
  GetVerifiedViewV1Request,
  GetVerifiedViewV1Response,
  LockAssetV1Response,
  ClaimLockedAssetV1Request,
  ClaimLockedAssetV1Response,
  ClaimPledgedAssetV1Response,
} from "@hyperledger-cacti/cacti-copm-core";

type DefaultServiceMethodDefinitions = typeof DefaultService.methods;
type DefaultServiceMethodNames = keyof DefaultServiceMethodDefinitions;
export type DefaultApi = PromiseClient<typeof DefaultService>;

type ICopmCordaApi = {
  [key in DefaultServiceMethodNames]: (...args: never[]) => unknown;
};

export class CopmCordaImpl
  implements ICopmCordaApi, Partial<ServiceImpl<ServiceType>>
{
  // We cannot avoid this due to how the types of the upstream library are
  // structured/designed hence we just disable the linter on this particular line.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [k: string]: any;

  private readonly log: Logger;
  private readonly containerApi: DefaultApi;

  constructor(log: Logger, containerApi: DefaultApi) {
    this.log = log;
    this.containerApi = containerApi;
  }

  public async noopV1(): Promise<void> {
    return;
  }

  public async pledgeAssetV1(
    req: PledgeAssetV1Request,
  ): Promise<PledgeAssetV1Response> {
    return this.containerApi.pledgeAssetV1(req);
  }

  public async claimLockedAssetV1(
    req: ClaimLockedAssetV1Request,
  ): Promise<ClaimLockedAssetV1Response> {
    return this.containerApi.claimLockedAssetV1(req);
  }

  public async claimPledgedAssetV1(
    req: ClaimPledgedAssetV1Request,
  ): Promise<ClaimPledgedAssetV1Response> {
    return this.containerApi.claimPledgedAssetV1(req);
  }

  public async lockAssetV1(
    req: LockAssetV1Request,
  ): Promise<LockAssetV1Response> {
    return this.containerApi.lockAssetV1(req);
  }

  public async getVerifiedViewV1(
    req: GetVerifiedViewV1Request,
  ): Promise<GetVerifiedViewV1Response> {
    return this.containerApi.getVerifiedViewV1(req);
  }
}
