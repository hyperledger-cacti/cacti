import { Logger, LoggerProvider } from '@hyperledger-labs/bif-common';

export interface IApiClientOptions {
  apiHost: string;
  apiPort: number;
}

export class ApiClient {

  private readonly log: Logger;

  constructor(public readonly options: IApiClientOptions) {
    this.log = LoggerProvider.getOrCreate({ label: 'api-client ' });
  }

  public async call(): Promise<void> {
    this.log.debug(`call()`);
  }
}
