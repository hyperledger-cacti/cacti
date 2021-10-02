import {
  Logger,
  LoggerProvider,
  LogLevelDesc,
} from "@hyperledger/cactus-common";
import Vault, { client } from "node-vault";
import { KJUR, KEYUTIL } from "jsrsasign";
import { InternalIdentityClient, ISignatureResponse } from "./internal/client";
import { ECCurveType } from "./internal/crypto-util";

export interface IVaultTransitClientOptions {
  // full url of vault server
  // eg : http://localhost:8200
  endpoint: string;

  // mountPath of transit secret engine
  // eg : /transit
  mountPath: string;

  // token of the client
  token: string;

  logLevel?: LogLevelDesc;
}

export class VaultTransitClient implements InternalIdentityClient {
  public readonly className = "VaultTransitClient";
  private readonly log: Logger;
  private readonly backend: client;
  constructor(opts: IVaultTransitClientOptions) {
    this.log = LoggerProvider.getOrCreate({
      label: "VaultTransitClient",
      level: opts.logLevel || "INFO",
    });
    this.backend = Vault({
      endpoint: opts.endpoint,
      apiVersion: "v1",
      token: opts.token,
      pathPrefix: opts.mountPath,
    });
  }

  /**
   * @description send message digest to be signed by private key stored on vault
   * @param digest : messages digest which need to signed
   * @param preHashed : is digest already hashed
   * @returns asn1 encoded signature
   */
  async sign(keyName: string, digest: Buffer): Promise<ISignatureResponse> {
    const fnTag = `${this.className}#sign`;
    this.log.debug(
      `${fnTag} sign with key = ${keyName} , digestSize = ${digest.length}`,
    );
    const pub = await this.getPub(keyName);
    let crv = ECCurveType.P256;
    if ((pub as any).curveName === "secp384r1") {
      crv = ECCurveType.P384;
    }
    const resp = await this.backend.write("sign/" + keyName, {
      input: digest.toString("base64"),
      prehashed: true,
      marshaling_algorithm: "asn1",
    });
    this.log.debug(`${fnTag} got response from vault : %o`, resp.data);
    if (resp?.data?.signature) {
      const base64Sig = (resp.data.signature as string).split(":")[2];
      return {
        sig: Buffer.from(base64Sig, "base64"),
        crv: crv,
      };
    }
    throw new Error(`invalid response from vault ${JSON.stringify(resp)}`);
  }

  /**
   * @description return public key of latest version
   * @param keyName for which public key should be returned
   * @returns pem encoded public key
   */
  async getPub(keyName: string): Promise<KJUR.crypto.ECDSA> {
    const fnTag = `${this.className}#getPub`;
    this.log.debug(`${fnTag} keyName = ${keyName}`);
    try {
      const resp = await this.backend.read("keys/" + keyName);
      this.log.debug(`${fnTag} Response from Vault: %o`, JSON.stringify(resp));
      if (resp?.data?.latest_version && resp?.data?.keys) {
        if (!["ecdsa-p256", "ecdsa-p384"].includes(resp.data.type)) {
          throw new Error(`${fnTag} key = ${keyName} has invalid key type`);
        }
        // resp.data.keys has array of all the version of the key
        // latest version is used for signing
        return KEYUTIL.getKey(
          resp.data.keys[resp.data.latest_version].public_key,
        ) as KJUR.crypto.ECDSA;
      }
      throw new Error(
        `${fnTag} invalid response from vault ${JSON.stringify(resp)}`,
      );
    } catch (error) {
      if ((error as any).response?.statusCode === 404) {
        throw new Error(`${fnTag} keyName = ${keyName} not found`);
      }
      throw error;
    }
  }

  /**
   * @description will rotate a given key
   * @param keyName label of key that need to be rotated
   */
  async rotateKey(keyName: string): Promise<void> {
    const fnTag = `${this.className}#rotateKey`;
    this.log.debug(`${fnTag} rotate the kew ${keyName}`);
    await this.backend.write("keys/" + keyName + "/rotate", {});
    this.log.debug(`${fnTag} key = ${keyName} successfully rotated`);
  }
}
