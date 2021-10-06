import type { Express } from "express";

import OAS from "../json/openapi.json";

import {
  Logger,
  Checks,
  LogLevelDesc,
  LoggerProvider,
} from "@hyperledger/cactus-common";
import {
  ICactusPlugin,
  ICactusPluginOptions,
  IPluginKeychain,
  IPluginWebService,
  IWebServiceEndpoint,
} from "@hyperledger/cactus-core-api";

import { SecretManagerServiceClient } from "@google-cloud/secret-manager";
import { SetKeychainEntryV1Endpoint } from "./webservices/set-keychain-entry-endpoint-v1";
import { GetKeychainEntryV1Endpoint } from "./webservices/get-keychain-entry-endpoint-v1";
import { DeleteKeychainEntryV1Endpoint } from "./webservices/delete-keychain-entry-endpoint-v1";
import { HasKeychainEntryV1Endpoint } from "./webservices/has-keychain-entry-endpoint-v1";

export interface IPluginKeychainGoogleSmOptions extends ICactusPluginOptions {
  logLevel?: LogLevelDesc;
  keychainId: string;
  instanceId: string;
  backend?: SecretManagerServiceClient;
}

export class PluginKeychainGoogleSm
  implements ICactusPlugin, IPluginWebService, IPluginKeychain {
  public static readonly CLASS_NAME = "PluginKeychainGoogleSm";
  private readonly log: Logger;
  private readonly instanceId: string;
  private endpoints: IWebServiceEndpoint[] | undefined;
  private googleSmClient: SecretManagerServiceClient;

  public get className(): string {
    return PluginKeychainGoogleSm.CLASS_NAME;
  }

  constructor(public readonly opts: IPluginKeychainGoogleSmOptions) {
    const fnTag = `${this.className}#constructor()`;
    Checks.truthy(opts, `${fnTag} arg options`);
    Checks.truthy(opts.keychainId, `${fnTag} arg options.keychainId`);
    Checks.truthy(opts.instanceId, `${fnTag} options.instanceId`);
    Checks.nonBlankString(opts.keychainId, `${fnTag} options.keychainId`);

    if (opts.backend) {
      this.googleSmClient = opts.backend;
    } else {
      this.googleSmClient = new SecretManagerServiceClient();
    }
    this.instanceId = this.opts.instanceId;
    const level = this.opts.logLevel || "INFO";
    const label = this.className;
    this.log = LoggerProvider.getOrCreate({ level, label });

    this.log.info(`Created ${this.className}. KeychainID=${opts.keychainId}`);
  }

  public getOpenApiSpec(): unknown {
    return OAS;
  }

  async registerWebServices(app: Express): Promise<IWebServiceEndpoint[]> {
    const webServices = await this.getOrCreateWebServices();
    await Promise.all(webServices.map((ws) => ws.registerExpress(app)));
    return webServices;
  }

  public async getOrCreateWebServices(): Promise<IWebServiceEndpoint[]> {
    if (Array.isArray(this.endpoints)) {
      return this.endpoints;
    }
    //const endpoints: IWebServiceEndpoint[] = [];
    const endpoints: IWebServiceEndpoint[] = [
      new SetKeychainEntryV1Endpoint({
        connector: this,
        logLevel: this.opts.logLevel,
      }),
      new GetKeychainEntryV1Endpoint({
        connector: this,
        logLevel: this.opts.logLevel,
      }),
      new DeleteKeychainEntryV1Endpoint({
        connector: this,
        logLevel: this.opts.logLevel,
      }),
      new HasKeychainEntryV1Endpoint({
        connector: this,
        logLevel: this.opts.logLevel,
      }),
    ];
    // TODO: Writing the getExpressRequestHandler() method for
    // GetKeychainEntryEndpointV1 and SetKeychainEntryEndpointV1

    // {
    //   const ep = new GetKeychainEntryEndpointV1({
    //     logLevel: this.opts.logLevel,
    //   });
    //   ep.registerExpress(expressApp);
    //   endpoints.push(ep);
    // }
    // {
    //   const ep = new SetKeychainEntryEndpointV1({
    //     logLevel: this.opts.logLevel,
    //   });
    //   ep.registerExpress(expressApp);
    //   endpoints.push(ep);
    // }
    this.endpoints = endpoints;

    return endpoints;
  }

  public async shutdown(): Promise<void> {
    throw new Error("Method not implemented.");
  }

  public getInstanceId(): string {
    return this.instanceId;
  }

  public getKeychainId(): string {
    return this.opts.keychainId;
  }

  public getPackageName(): string {
    // TODO: Add custom validation to the CI so that package names in plugin
    // code are guaranteed to be correct (e.g. matching the one in package.json)
    return "@hyperledger/cactus-plugin-keychain-google-sm";
  }

  public getEncryptionAlgorithm(): string {
    return "AES-256";
  }

  public async onPluginInit(): Promise<unknown> {
    return;
  }

  public getGoogleSmClient(): SecretManagerServiceClient {
    return this.googleSmClient;
  }

  async get(key: string): Promise<string> {
    const accessResponse = await this.googleSmClient.getSecret({
      name: key,
    });
    if (accessResponse[0]) {
      const result = accessResponse[0];
      // FIXME: We need to verify if this actually works because
      // based on the type definitions of the underlying library it should not.
      return (result as unknown) as string;
    } else {
      throw new Error(`${key} secret not found.`);
    }
  }

  /**
   * Detects the presence of a key by trying to read it and then
   * observing whether an HTTP 404 NOT FOUND error is returned or
   * not and deciding whether the keychain has the entry ot not
   * based on this.
   */
  async has(key: string): Promise<boolean> {
    const accessResponse = await this.googleSmClient.accessSecretVersion({
      name: key,
    });
    if (accessResponse) {
      return true;
    } else {
      return false;
    }
  }

  /**
   * To implement this the key should consist of parent and secretId seperated by ?
   * For example, key = "projects/my-project?my-secret"
   */
  async set<T>(key: string, value: T): Promise<void> {
    const parent = key.split("?")[0];
    const secretId = key.split("?")[1];
    const secret = await this.googleSmClient.createSecret({
      parent: parent,
      secretId: secretId,
      secret: {
        replication: {
          automatic: {},
        },
      },
    });
    await this.googleSmClient.addSecretVersion({
      parent: secret[0].name,
      payload: {
        data: (value as unknown) as string,
      },
    });
  }

  async delete(key: string): Promise<void> {
    await this.googleSmClient.deleteSecret({
      name: key,
    });
  }
}
