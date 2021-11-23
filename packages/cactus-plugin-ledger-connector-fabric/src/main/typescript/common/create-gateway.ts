import { DefaultEventHandlerOptions } from "fabric-network";
import { DefaultEventHandlerStrategies } from "fabric-network";
import { Gateway } from "fabric-network";
import { ICryptoKey } from "fabric-common";
import { GatewayOptions as FabricGatewayOptions } from "fabric-network";
import { Checks, LoggerProvider } from "@hyperledger/cactus-common";
import { LogLevelDesc } from "@hyperledger/cactus-common";
import { PluginRegistry } from "@hyperledger/cactus-core";
import { ConnectionProfile } from "../generated/openapi/typescript-axios/index";
import { GatewayDiscoveryOptions } from "../generated/openapi/typescript-axios/index";
import { GatewayEventHandlerOptions } from "../generated/openapi/typescript-axios/index";
import {
  GatewayOptions,
  FabricSigningCredentialType,
} from "../generated/openapi/typescript-axios/index";
import {
  CertDatastore,
  IIdentityData,
} from "../identity/internal/cert-datastore";
import {
  IIdentity,
  SecureIdentityProviders,
} from "../identity/identity-provider";

export interface ICreateGatewayContext {
  readonly logLevel?: LogLevelDesc;
  readonly pluginRegistry: PluginRegistry;
  readonly defaultConnectionProfile: ConnectionProfile;
  readonly defaultDiscoveryOptions: GatewayDiscoveryOptions;
  readonly defaultEventHandlerOptions: GatewayEventHandlerOptions;
  readonly gatewayOptions: GatewayOptions;
  readonly certStore: CertDatastore;
  readonly secureIdentity: SecureIdentityProviders;
}

export const E_CREATE_GATEWAY_WALLET =
  "Invalid opts.gatewayOptions.wallet. Need json or keychain, none provided.";

export async function createGateway(
  ctx: ICreateGatewayContext,
): Promise<Gateway> {
  const log = LoggerProvider.getOrCreate({
    label: "create-gateway",
    level: ctx?.logLevel || "INFO",
  });
  log.debug("Creating Fabric Node SDK Gateway object...");

  Checks.truthy(ctx, "createGateway#ctx");
  Checks.truthy(ctx.gatewayOptions, "createGateway#ctx.gatewayOptions");

  const { defaultConnectionProfile } = ctx;
  const cp = ctx.gatewayOptions.connectionProfile || defaultConnectionProfile;

  let certData: IIdentityData;
  if (ctx.gatewayOptions.wallet.json) {
    log.debug("Parsing wallet from JSON representation...");
    certData = JSON.parse(ctx.gatewayOptions.wallet.json);
    certData.type = certData.type || FabricSigningCredentialType.X509;
  } else if (ctx.gatewayOptions.wallet.keychain) {
    log.debug("Fetching wallet from JSON keychain...");
    certData = await ctx.certStore.get(
      ctx.gatewayOptions.wallet.keychain.keychainId,
      ctx.gatewayOptions.wallet.keychain.keychainRef,
    );
    ctx.gatewayOptions.wallet.keychain.type =
      ctx.gatewayOptions.wallet.keychain.type ||
      FabricSigningCredentialType.X509;
    if (certData.type !== ctx.gatewayOptions.wallet.keychain.type) {
      throw new Error(
        `identity type mismatch, sorted of type = ${certData.type} but provided = ${ctx.gatewayOptions.wallet.keychain.type}`,
      );
    }
  } else {
    throw new Error(E_CREATE_GATEWAY_WALLET);
  }

  let key: ICryptoKey;
  switch (certData.type) {
    case FabricSigningCredentialType.VaultX509:
      if (
        !ctx.gatewayOptions.wallet.keychain ||
        !ctx.gatewayOptions.wallet.keychain.vaultTransitKey
      ) {
        throw new Error(
          `require ctx.gatewayOptions.wallet.keychain.vaultTransitKey`,
        );
      }
      key = ctx.secureIdentity.getVaultKey({
        token: ctx.gatewayOptions.wallet.keychain.vaultTransitKey.token,
        keyName: ctx.gatewayOptions.wallet.keychain.vaultTransitKey.keyName,
      });
      break;
    case FabricSigningCredentialType.WsX509:
      if (
        !ctx.gatewayOptions.wallet.keychain ||
        !ctx.gatewayOptions.wallet.keychain.webSocketKey
      ) {
        throw new Error(
          `require ctx.gatewayOptions.wallet.keychain.webSocketKey`,
        );
      }
      key = ctx.secureIdentity.getWebSocketKey({
        sessionId: ctx.gatewayOptions.wallet.keychain.webSocketKey.sessionId,
        signature: ctx.gatewayOptions.wallet.keychain.webSocketKey.signature,
      });
      break;
    case FabricSigningCredentialType.X509:
      key = ctx.secureIdentity.getDefaultKey({
        private: certData.credentials.privateKey as string,
      });
      break;
    default:
      throw new Error(`UNRECOGNIZED_IDENTITY_TYPE type = ${certData.type}`);
  }
  const identity: IIdentity = {
    type: certData.type,
    mspId: certData.mspId,
    credentials: {
      certificate: certData.credentials.certificate,
      key: key,
    },
  };

  const eventHandlerOptions: DefaultEventHandlerOptions = {
    commitTimeout: ctx.gatewayOptions.eventHandlerOptions?.commitTimeout || 300,
    endorseTimeout:
      ctx.gatewayOptions.eventHandlerOptions?.endorseTimeout || 300,
  };

  const strategy =
    ctx.gatewayOptions.eventHandlerOptions?.strategy ||
    ctx.defaultEventHandlerOptions.strategy;

  if (strategy) {
    eventHandlerOptions.strategy = DefaultEventHandlerStrategies[strategy];
  }

  log.debug(`Gateway EventHandlerOptions: `, eventHandlerOptions);

  const gatewayOptions: FabricGatewayOptions = {
    discovery: ctx.gatewayOptions.discovery || ctx.defaultDiscoveryOptions,
    eventHandlerOptions,
    identity: identity,
    identityProvider: ctx.secureIdentity,
  };

  log.debug("Instantiating and connecting gateway...");

  const gateway = new Gateway();
  await gateway.connect(cp, gatewayOptions);

  log.debug("Connection established by gateway OK");

  return gateway;
}
