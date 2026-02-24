import { Logger } from "@hyperledger/cactus-common";
import { ServiceImpl } from "@connectrpc/connect";
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
} from "@hyperledger-cacti/cacti-copm-core";
import * as Endpoints from "./endpoints";
import { InteropConfiguration } from "@hyperledger-cacti/cacti-copm-core/src/main/typescript/interfaces";
import { FabricConfiguration } from "./public-api";
import { FabricTransactionContextFactory } from "./lib/fabric-context-factory";
import type { GenService } from "@bufbuild/protobuf/codegenv1";
import { PledgeAssetV1200ResponsePBSchema } from "@hyperledger-cacti/cacti-copm-core/src/main/typescript/generated/protos/models/pledge_asset_v1200_response_pb_pb";
import { create } from "@bufbuild/protobuf";
import { ClaimPledgedAssetV1200ResponsePBSchema } from "@hyperledger-cacti/cacti-copm-core/src/main/typescript/generated/protos/models/claim_pledged_asset_v1200_response_pb_pb";
import { LockAssetV1200ResponsePBSchema } from "@hyperledger-cacti/cacti-copm-core/src/main/typescript/generated/protos/models/lock_asset_v1200_response_pb_pb";
import { GetVerifiedViewV1200ResponsePBSchema } from "@hyperledger-cacti/cacti-copm-core/src/main/typescript/generated/protos/models/get_verified_view_v1200_response_pb_pb";

type DefaultServiceMethodDefinitions = typeof DefaultService.methods;
type DefaultServiceMethodNames =
  DefaultServiceMethodDefinitions[number]["name"];

type ICopmFabricApi = {
  [key in DefaultServiceMethodNames]: (...args: never[]) => unknown;
};

export class CopmFabricImpl
  implements ICopmFabricApi, Partial<ServiceImpl<GenService<any>>>
{
  // We cannot avoid this due to how the types of the upstream library are
  // structured/designed hence we just disable the linter on this particular line.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [k: string]: any;

  private readonly log: Logger;
  private readonly contextFactory: CopmIF.DLTransactionContextFactory;
  private readonly fabricConfig: FabricConfiguration;
  private readonly interopConfig: InteropConfiguration;

  constructor(
    log: Logger,
    interopConfig: InteropConfiguration,
    fabricConfig: FabricConfiguration,
  ) {
    this.log = log;
    this.contextFactory = new FabricTransactionContextFactory(
      fabricConfig,
      interopConfig,
      this.log,
    );
    this.interopConfig = interopConfig;
    this.fabricConfig = fabricConfig;
  }

  public async noopV1(): Promise<void> {
    // operation can be used as a health check
    return;
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
        this.fabricConfig,
      );
      const res = create(PledgeAssetV1200ResponsePBSchema, {
        pledgeId: pledgeId,
      });
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
        this.fabricConfig,
      );
      const res = create(ClaimPledgedAssetV1200ResponsePBSchema, {
        claimId: claimId,
      });
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
    let claimId;
    try {
      claimId = await Endpoints.claimPledgedAssetV1Impl(
        req,
        this.log,
        this.contextFactory,
        this.interopConfig,
        this.fabricConfig,
      );
    } catch (ex) {
      this.log.error(ex);
      throw ex;
    }
    const res = create(ClaimPledgedAssetV1200ResponsePBSchema, {
      claimId: claimId,
    });
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
        this.fabricConfig,
      );
      const res = create(LockAssetV1200ResponsePBSchema, { lockId: lockId });
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
    return create(GetVerifiedViewV1200ResponsePBSchema, { data: data });
  }
}
