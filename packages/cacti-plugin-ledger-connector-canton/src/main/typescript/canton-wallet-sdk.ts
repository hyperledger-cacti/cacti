import type { TokenProviderConfig } from "@canton-network/wallet-sdk" with { "resolution-mode": "import" };

import type { Logger } from "@hyperledger-cacti/cactus-common";

import type {
  ActiveContract,
  CantonCommand,
} from "./generated/openapi/typescript-axios";

export interface ICantonSubmitRequest {
  actAs: string[];
  commands: CantonCommand[];
  commandId?: string;
  readAs?: string[];
  synchronizerId?: string;
}

export interface ICantonActiveContractsRequest {
  parties: string[];
  filterByParty: true;
  templateIds?: string[];
  interfaceIds?: string[];
  offset?: number;
  limit: number;
}

export interface ICantonWalletSdk {
  readonly ledger: {
    readonly internal: {
      submit(request: ICantonSubmitRequest): Promise<{
        updateId: string;
        completionOffset: number;
      }>;
    };
    readonly acsReader: {
      readJsContracts(
        request: ICantonActiveContractsRequest,
      ): Promise<Array<ActiveContract & Record<string, unknown>>>;
    };
  };
  readonly party: {
    list(): Promise<string[]>;
  };
}

export interface ICantonWalletSdkFactoryCreateOptions {
  auth: TokenProviderConfig;
  ledgerClientUrl: URL | string;
}

export interface ICantonWalletSdkFactory {
  create(
    options: ICantonWalletSdkFactoryCreateOptions,
  ): Promise<ICantonWalletSdk>;
}

type CantonSdkLogLevel = "debug" | "error" | "info" | "trace" | "warn";

interface ICantonWalletSdkModule {
  readonly SDK: {
    create(options: {
      auth: TokenProviderConfig;
      ledgerClientUrl: URL | string;
      logAdapter: unknown;
    }): Promise<unknown>;
  };
  readonly CustomLogAdapter: new (
    logFunction: (
      level: CantonSdkLogLevel,
      context: Record<string, unknown>,
      message?: string,
    ) => void,
  ) => unknown;
}

export type CantonWalletSdkModuleLoader = () => ICantonWalletSdkModule;

function loadCantonWalletSdk(): ICantonWalletSdkModule {
  // Wallet SDK 1.5.1 publishes a CommonJS entry point for require(). Keeping
  // this load inside the factory also avoids initializing SDK dependencies
  // until the connector performs its first ledger operation.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  return require("@canton-network/wallet-sdk") as ICantonWalletSdkModule;
}

export class CantonWalletSdkFactory implements ICantonWalletSdkFactory {
  public constructor(
    private readonly log: Logger,
    private readonly moduleLoader: CantonWalletSdkModuleLoader = loadCantonWalletSdk,
  ) {}

  public async create(
    options: ICantonWalletSdkFactoryCreateOptions,
  ): Promise<ICantonWalletSdk> {
    const { CustomLogAdapter, SDK } = this.moduleLoader();
    const logAdapter = new CustomLogAdapter((level) => {
      // SDK context and message values can contain credentials, HTTP payloads,
      // or party data. Only the severity is forwarded to Cacti's logger.
      this.log[level]("Canton Wallet SDK emitted a log entry.");
    });

    const sdk = await SDK.create({ ...options, logAdapter });
    return sdk as ICantonWalletSdk;
  }
}
