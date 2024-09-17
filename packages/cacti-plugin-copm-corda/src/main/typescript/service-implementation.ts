import { Logger } from "@hyperledger/cactus-common";
import { ServiceImpl, PromiseClient } from "@connectrpc/connect";

import type { ServiceType } from "@bufbuild/protobuf";
import {
  DefaultService,
  PledgeAssetV1Request,
  PledgeAssetV1200ResponsePB,
  ClaimPledgedAssetV1Request,
  LockAssetV1Request,
  GetVerifiedViewV1Request,
  GetVerifiedViewV1200ResponsePB,
  LockAssetV1200ResponsePB,
  ClaimLockedAssetV1Request,
  ClaimPledgedAssetV1200ResponsePB,
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
  ): Promise<PledgeAssetV1200ResponsePB> {
    return this.containerApi.pledgeAssetV1(req);
  }

  public async claimLockedAssetV1(
    req: ClaimLockedAssetV1Request,
  ): Promise<ClaimPledgedAssetV1200ResponsePB> {
    return this.containerApi.claimLockedAssetV1(req);
  }

  public async claimPledgedAssetV1(
    req: ClaimPledgedAssetV1Request,
  ): Promise<ClaimPledgedAssetV1200ResponsePB> {
    return this.containerApi.claimPledgedAssetV1(req);
  }

  public async lockAssetV1(
    req: LockAssetV1Request,
  ): Promise<LockAssetV1200ResponsePB> {
    return this.containerApi.lockAssetV1(req);
  }

  public async getVerifiedViewV1(
    req: GetVerifiedViewV1Request,
  ): Promise<GetVerifiedViewV1200ResponsePB> {
    return this.containerApi.getVerifiedViewV1(req);
  }
}
