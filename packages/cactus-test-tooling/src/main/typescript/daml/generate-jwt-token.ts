import * as crypto from "crypto";
import { hmac } from "node-forge";

export class GenerateJWTToken {
    constructor() {}

    public base64UrlEncode(input: Buffer): string {
      return input
        .toString("base64")
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "");
    };

    public createHeader(): string {
      const header = this.base64UrlEncode(Buffer.from('{"alg":"HS256","typ":"JWT"}'));
      return header
    }
    public payload(participant: string): string {
      const payload = this.base64UrlEncode(
        Buffer.from(
          `{"https://daml.com/ledger-api": {"ledgerId": "sandbox", "applicationId": "foobar","actAs":["${participant}"]}}`,
        ),
      );
      return payload
    }
    public hmacsignature(header: string, payload: string): string {
      const hmacSignature = this.base64UrlEncode(
        crypto
          .createHmac("sha256", "secret")
          .update(`${header}.${payload}`)
          .digest(),
      );
      return hmacSignature
    }
}