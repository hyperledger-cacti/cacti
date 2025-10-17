import {
  isWeb3SigningCredentialPrivateKeyHex,
  Web3SigningCredentialPrivateKeyHex,
} from "@hyperledger/cactus-plugin-ledger-connector-ethereum";
import { ExtensionType } from "../../../extensions/extensions-utils";

export interface ExtensionConfig {
  name: ExtensionType;
  networksConfig: Array<{
    rpc_url: string;
    network_name: string;
  }>;
  signingCredential: Web3SigningCredentialPrivateKeyHex;
}

export function validateExtensions(opts: {
  readonly configValue: unknown;
}): ExtensionConfig[] | undefined {
  if (!opts || !opts.configValue) {
    return;
  }
  if (!Array.isArray(opts.configValue)) {
    throw new TypeError(
      `Invalid config.extensions: ${JSON.stringify(
        opts.configValue,
      )}. Expected an array of ExtensionsConfig.`,
    );
  }

  const extensions = opts.configValue as ExtensionConfig[];
  const validExtensions = extensions.filter((ext) => {
    const hasValidName =
      typeof ext.name === "string" &&
      Object.values(ExtensionType).includes(ext.name as ExtensionType);
    const hasValidNetworksConfig =
      Array.isArray(ext.networksConfig) &&
      ext.networksConfig.every(
        (net) =>
          typeof net.rpc_url === "string" &&
          net.rpc_url.length > 0 &&
          typeof net.network_name === "string" &&
          net.network_name.length > 0,
      );
    const hasValidSigningCredential = isWeb3SigningCredentialPrivateKeyHex(
      ext.signingCredential,
    );
    return hasValidName && hasValidNetworksConfig && hasValidSigningCredential;
  });
  return validExtensions.length > 0 ? validExtensions : undefined;
}
