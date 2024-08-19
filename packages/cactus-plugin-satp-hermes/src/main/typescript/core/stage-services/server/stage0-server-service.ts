import { Token } from "../../../public-api";
import {
  SATPService,
  SATPServiceType,
  ISATPServerServiceOptions,
  ISATPServiceOptions,
} from "../satp-service";

export class Stage0ServerService extends SATPService {
  public static readonly SATP_STAGE = "0";
  public static readonly SERVICE_TYPE = SATPServiceType.Server;
  public static readonly SATP_SERVICE_INTERNAL_NAME = `stage-${this.SATP_STAGE}-${SATPServiceType[this.SERVICE_TYPE].toLowerCase()}`;

  constructor(ops: ISATPServerServiceOptions) {
    // for now stage0serverservice does not have any different options than the SATPService class

    const commonOptions: ISATPServiceOptions = {
      stage: Stage0ServerService.SATP_STAGE,
      loggerOptions: ops.loggerOptions,
      serviceName: ops.serviceName,
      signer: ops.signer,
      serviceType: Stage0ServerService.SERVICE_TYPE,
    };
    super(commonOptions);
  }

  public async getPubKey(): Promise<void> {
    //todo
  }

  public async wrapToken(token: Token) {
    //todo
    return token;
  }
}
