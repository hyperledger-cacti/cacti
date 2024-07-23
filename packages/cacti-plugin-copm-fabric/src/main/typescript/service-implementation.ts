import { Logger } from "@hyperledger/cactus-common";
import { ServiceImpl } from "@connectrpc/connect";
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
  Interfaces as CopmIF,
  CopmContractNames,
} from "@hyperledger-cacti/cacti-copm-core";
import * as Endpoints from "./endpoints";

type DefaultServiceMethodDefinitions = typeof DefaultService.methods;
type DefaultServiceMethodNames = keyof DefaultServiceMethodDefinitions;

type ICopmFabricApi = {
  [key in DefaultServiceMethodNames]: (...args: never[]) => unknown;
};

export class CopmFabricImpl
  implements ICopmFabricApi, Partial<ServiceImpl<ServiceType>>
{
  // We cannot avoid this due to how the types of the upstream library are
  // structured/designed hence we just disable the linter on this particular line.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [k: string]: any;

  private readonly log: Logger;
  private readonly contextFactory: CopmIF.DLTransactionContextFactory;
  private readonly contractNames: CopmContractNames;

  constructor(
    log: Logger,
    contextFactory: CopmIF.DLTransactionContextFactory,
    copmContractNames: CopmContractNames,
  ) {
    this.log = log;
    this.contextFactory = contextFactory;
    this.contractNames = copmContractNames;
  }

  public async pledgeAssetV1(
    req: PledgeAssetV1Request,
  ): Promise<PledgeAssetV1200ResponsePB> {
    try {
      this.log.debug("pledgeAssetV1 ENTRY req=%o", req);
      const pledgeId = await Endpoints.pledgeAssetV1Impl(
        req,
        this.log,
        this.contextFactory,
        this.contractNames.pledgeContract,
      );
      const res = new PledgeAssetV1200ResponsePB({ pledgeId: pledgeId });
      return res;
    } catch (ex) {
      this.log.error(ex.message);
      throw ex;
    }
  }

  public async claimLockedAssetV1(
    req: ClaimLockedAssetV1Request,
  ): Promise<ClaimPledgedAssetV1200ResponsePB> {
    try {
      this.log.debug("claimAssetV1 ENTRY req=%o", req);
      const claimId = await Endpoints.claimLockedAssetV1Impl(
        req,
        this.log,
        this.contextFactory,
        this.contractNames.lockContract,
      );
      const res = new ClaimPledgedAssetV1200ResponsePB({ claimId: claimId });
      return res;
    } catch (ex) {
      this.log.error(ex.message);
      throw ex;
    }
  }

  public async claimPledgedAssetV1(
    req: ClaimPledgedAssetV1Request,
  ): Promise<ClaimPledgedAssetV1200ResponsePB> {
    this.log.debug("claimAssetV1 ENTRY req=%o", req);
    const claimId = await Endpoints.claimPledgedAssetV1Impl(
      req,
      this.log,
      this.contextFactory,
      this.contractNames.pledgeContract,
    );
    const res = new ClaimPledgedAssetV1200ResponsePB({ claimId: claimId });
    return res;
  }

  public async lockAssetV1(
    req: LockAssetV1Request,
  ): Promise<LockAssetV1200ResponsePB> {
    this.log.debug("lockAssetV1 ENTRY req=%o", req);
    try {
      const lockId = await Endpoints.lockAssetV1Impl(
        req,
        this.log,
        this.contextFactory,
        this.contractNames.lockContract,
      );
      const res = new LockAssetV1200ResponsePB({ lockId: lockId });
      return res;
    } catch (error) {
      this.log.error(error);
      throw error;
    }
  }

  public async getVerifiedViewV1(
    req: GetVerifiedViewV1Request,
  ): Promise<GetVerifiedViewV1200ResponsePB> {
    this.log.debug("provestateV1 ENTRY req=%o", req);
    const data = await Endpoints.getVerifiedViewV1Impl(
      req,
      this.contextFactory,
      this.log,
    );
    return new GetVerifiedViewV1200ResponsePB({ data: data });
  }
}
