import { DefaultEventHandlerOptions } from "fabric-network";
import { DefaultEventHandlerStrategies, Wallets } from "fabric-network";
import { Gateway } from "fabric-network";
import { GatewayOptions as FabricGatewayOptions } from "fabric-network";
import { Checks, LoggerProvider } from "@hyperledger/cactus-common";
import { LogLevelDesc } from "@hyperledger/cactus-common";
import { PluginRegistry } from "@hyperledger/cactus-core";
import { ConnectionProfile } from "../generated/openapi/typescript-axios/index";
import { GatewayDiscoveryOptions } from "../generated/openapi/typescript-axios/index";
import { GatewayEventHandlerOptions } from "../generated/openapi/typescript-axios/index";
import { GatewayOptions } from "../generated/openapi/typescript-axios/index";

export interface ICreateGatewayContext {
  readonly logLevel?: LogLevelDesc;
  readonly pluginRegistry: PluginRegistry;
  readonly defaultConnectionProfile: ConnectionProfile;
  readonly defaultDiscoveryOptions: GatewayDiscoveryOptions;
  readonly defaultEventHandlerOptions: GatewayEventHandlerOptions;
  readonly gatewayOptions: GatewayOptions;
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

  const wallet = await Wallets.newInMemoryWallet();

  let identity;
  if (ctx.gatewayOptions.wallet.json) {
    log.debug("Parsing wallet from JSON representation...");
    identity = JSON.parse(ctx.gatewayOptions.wallet.json);
  } else if (ctx.gatewayOptions.wallet.keychain) {
    log.debug("Fetching wallet from JSON keychain...");
    const keychain = ctx.pluginRegistry.findOneByKeychainId(
      ctx.gatewayOptions.wallet.keychain.keychainId,
    );
    identity = await keychain.get(
      ctx.gatewayOptions.wallet.keychain.keychainRef,
    );
  } else {
    throw new Error(E_CREATE_GATEWAY_WALLET);
  }

  await wallet.put(ctx.gatewayOptions.identity, identity);
  log.debug(`Imported identity ${ctx.gatewayOptions.identity} to wallet OK`);

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
    identity: ctx.gatewayOptions.identity,
    wallet,
  };

  log.debug("Instantiating and connecting gateway...");

  const gateway = new Gateway();
  await gateway.connect(cp, gatewayOptions);

  log.debug("Connection established by gateway OK");

  return gateway;
}
