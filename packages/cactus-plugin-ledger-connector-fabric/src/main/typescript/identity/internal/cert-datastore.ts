import { PluginRegistry } from "@hyperledger/cactus-core";
import { FabricSigningCredentialType } from "../../generated/openapi/typescript-axios/api";

// IIdentityData : data that will be stored with cert datastore
// with key as client's commonName (from X509 certificate) and value as following field
export interface IIdentityData {
  type: FabricSigningCredentialType;
  credentials: {
    certificate: string;
    // if identity type is IdentityProvidersType.Default
    privateKey?: string;
  };
  mspId: string;
}

// sweet wrapper for managing client's certificate
// stored within multiple keychain registered to
// plugin registry
export class CertDatastore {
  constructor(private readonly pluginRegistry: PluginRegistry) {}
  async get(keychainId: string, keychainRef: string): Promise<IIdentityData> {
    const keychain = this.pluginRegistry.findOneByKeychainId(keychainId);
    return JSON.parse(await keychain.get(keychainRef));
  }

  async put(
    keychainId: string,
    keychainRef: string,
    iData: IIdentityData,
  ): Promise<void> {
    const keychain = this.pluginRegistry.findOneByKeychainId(keychainId);
    await keychain.set(keychainRef, JSON.stringify(iData));
  }

  // TODO has
  // TODO delete
}
