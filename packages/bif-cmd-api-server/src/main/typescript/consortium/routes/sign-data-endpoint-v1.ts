import { Request, Response, NextFunction, Application } from "express";
import {
  ConfigService,
  IBifApiServerOptions,
} from "../../config/config-service";
import { Config } from "convict";

export interface ISignDataEndpointOptions {
  configService: ConfigService;
}

export class SignDataEndpoint {
  private readonly config: Config<IBifApiServerOptions>;

  constructor(public readonly options: ISignDataEndpointOptions) {
    if (!options) {
      throw new Error(`SignDataEndpoint#ctor options falsy.`);
    }
    if (!options.configService) {
      throw new Error(`SignDataEndpoint#ctor options.configService falsy.`);
    }
    this.config = this.options.configService.getOrCreate();
  }

  async handleRequest(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    const privateKey = this.config.get("privateKey");
  }
}
