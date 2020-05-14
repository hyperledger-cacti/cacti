import { IWebServiceEndpoint, IExpressRequestHandler } from "@hyperledger-labs/bif-core-api";
import { Logger, LoggerProvider } from "@hyperledger-labs/bif-common";
import { PluginLedgerConnectorQuorum, IQuorumDeployContractOptions } from "../plugin-ledger-connector-quorum";

export interface IDeployContractEndpointOptions {
  path: string;
  plugin: PluginLedgerConnectorQuorum;
}

export class DeployContractEndpoint implements IWebServiceEndpoint {

  private readonly log: Logger;

  constructor(public readonly options: IDeployContractEndpointOptions) {
    this.log = LoggerProvider.getOrCreate({ label: 'deploy-contract-endpoint' });
  }

  public getPath(): string {
    return this.options.path;
  }

  public getExpressRequestHandler(): IExpressRequestHandler {
    return this.handleRequest.bind(this);
  }

  public handleRequest(req: any, res: any, next: any): void {
    const options: IQuorumDeployContractOptions = req.body;
    this.options.plugin.deployContract(options);
    res.json({ success: true });
  }

  // FIXME: this should actually validate the request?
  validateRequest(req: any): [boolean, string[]] {
    return [true, []];
  }
}
