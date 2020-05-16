import {
  IWebServiceEndpoint,
  IExpressRequestHandler,
} from "@hyperledger/cactus-core-api";
import { Logger, LoggerProvider } from "@hyperledger/cactus-common";
import {
  PluginLedgerConnectorQuorum,
  IQuorumDeployContractOptions,
} from "../plugin-ledger-connector-quorum";

export interface IDeployContractEndpointOptions {
  path: string;
  plugin: PluginLedgerConnectorQuorum;
}

export class DeployContractEndpoint implements IWebServiceEndpoint {
  private readonly log: Logger;

  constructor(public readonly options: IDeployContractEndpointOptions) {
    this.log = LoggerProvider.getOrCreate({
      label: "deploy-contract-endpoint",
    });
  }

  public getPath(): string {
    return this.options.path;
  }

  public getExpressRequestHandler(): IExpressRequestHandler {
    return this.handleRequest.bind(this);
  }

  public async handleRequest(req: any, res: any, next: any): Promise<void> {
    const options: IQuorumDeployContractOptions = req.body;
    const data = await this.options.plugin.deployContract(options);
    res.json({ success: true, data });
  }

  // FIXME: this should actually validate the request?
  validateRequest(req: any): [boolean, string[]] {
    return [true, []];
  }
}
