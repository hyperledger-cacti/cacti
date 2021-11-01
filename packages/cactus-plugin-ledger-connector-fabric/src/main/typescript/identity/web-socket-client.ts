import {
  Logger,
  LoggerProvider,
  LogLevelDesc,
} from "@hyperledger/cactus-common";
import { KJUR, KEYUTIL } from "jsrsasign";
import { InternalIdentityClient, ISignatureResponse } from "./internal/client";
import { ECCurveType } from "./internal/crypto-util";
import { WsIdentityClient } from "ws-identity-client";

export interface WSClientOptions {
  // full url of web-socket identity server
  // eg : http://localhost:8700
  endpoint: string;

  // pathPrefix for incoming web-socket connections
  // eg : /sessions
  pathPrefix: string;

  // websocket sessionId assigned to the client
  sessionId: string;
  // signature of the sessionId by the client
  signature: string;

  logLevel?: LogLevelDesc;
  strictSSL?: boolean;
}

export class WebSocketClient implements InternalIdentityClient {
  public readonly className = "WebSocketClient";
  private readonly log: Logger;
  private readonly backend: WsIdentityClient;
  private pubKeyEcdsa?: KJUR.crypto.ECDSA;
  private curve?: ECCurveType;

  constructor(opts: WSClientOptions) {
    this.log = LoggerProvider.getOrCreate({
      label: "WebSocketClient",
      level: opts.logLevel || "INFO",
    });
    this.backend = new WsIdentityClient({
      signature: opts.signature,
      sessionId: opts.sessionId,
      endpoint: opts.endpoint,
      pathPrefix: opts.pathPrefix,
      apiVersion: "v1",
      rpDefaults: {
        strictSSL: opts.strictSSL !== false,
      },
    });
  }

  /**
   * @description : sign message and return in a format that fabric understand
   * @param keyName : required by the sign method of abstract InternalIdentityClient
   * serves no role in the web-socket communication
   * the client only knows that a web-socket connection has been established
   * for a unique sessionId assigned to a given public key
   * @param digest to be singed
   */
  async sign(keyName: string, digest: Buffer): Promise<ISignatureResponse> {
    const fnTag = `${this.className}#sign`;
    this.log.debug(
      `${fnTag} send digest for pub-key ${keyName}: digest-size = ${digest.length}`,
    );
    const resp = await this.backend.write(
      "sign",
      { digest: digest.toString("base64") },
      {},
    );
    this.log.debug(`${fnTag} response from web-socket server : %o`, resp);
    if (!this.curve) {
      await this.getPub(keyName);
    }
    if (resp) {
      return {
        sig: Buffer.from(resp, "base64"),
        crv: this.curve as ECCurveType,
      };
    }
    throw new Error(
      `invalid response from ws-identity-client ${JSON.stringify(resp)}`,
    );
  }

  /**
   * @description return the pre-built ECDSA public key object
   */
  async getPub(keyName: string): Promise<KJUR.crypto.ECDSA> {
    const fnTag = `${this.className}#get-pub`;
    try {
      this.log.debug(
        `${fnTag} return the ECDSA public key object of the connected client. ` +
          `keyName (${keyName}) is required but not used here (client cannot access other keys)`,
      );
      if (!this.pubKeyEcdsa) {
        this.log.debug(`${fnTag} set the pub-key-ecdsa object for ${keyName}`);
        const resp = await this.backend.read("get-pub", {});
        this.pubKeyEcdsa = KEYUTIL.getKey(resp) as KJUR.crypto.ECDSA;
        this.curve = ECCurveType.P256;
        if ((this.pubKeyEcdsa as any).curveName === "secp384r1") {
          this.curve = ECCurveType.P384;
        }
      }
      return this.pubKeyEcdsa as KJUR.crypto.ECDSA;
    } catch (error) {
      throw new Error(
        `failed to retrieve pub-key-ecdsa from ws-identity server`,
      );
    }
  }
  /**
   * @description Rotate public used by client with keyName
   * this method is inactive when using a web-socket client
   * not authorized to request or change external keys
   */
  async rotateKey(keyName: string): Promise<void> {
    const fnTag = `${this.className}#rotate-key`;
    this.log.debug(
      `${fnTag} inactive method for ${this.className}, provide key-name ${keyName} as abstract interface requirement`,
    );
    throw new Error(
      "web-socket client can not rotate private keys. External client must enroll with a new csr",
    );
  }
}
