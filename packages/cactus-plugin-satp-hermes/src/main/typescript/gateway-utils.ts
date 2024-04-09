import { JsObjectSigner } from "@hyperledger/cactus-common";
import { LocalLog, RemoteLog } from "./core/types";
import { SATPGateway } from "./gateway-refactor";
import { SHA256 } from "crypto-js";

export function bufArray2HexStr(array: Uint8Array): string {
  return Buffer.from(array).toString("hex");
}

export function sign(objectSigner: JsObjectSigner, msg: string): Uint8Array {
  return objectSigner.sign(msg);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function verifySignature(
  objectSigner: JsObjectSigner,
  obj: any,
  pubKey: string,
): boolean {
  const sourceSignature = new Uint8Array(Buffer.from(obj.signature, "hex"));
  const sourcePubkey = new Uint8Array(Buffer.from(pubKey, "hex"));

  const signature = obj.signature;
  obj.signature = "";
  if (
    !objectSigner.verify(JSON.stringify(obj), sourceSignature, sourcePubkey)
  ) {
    return false;
  }

  obj.signature = signature;
  return true;
}

export async function storeLog(
  gateway: SATPGateway,
  localLog: LocalLog,
): Promise<void> {
  localLog.key = getSatpLogKey(
    localLog.sessionID,
    localLog.type,
    localLog.operation,
  );
  localLog.timestamp = Date.now().toString();

  await storeInDatabase(gateway, localLog);

  // Keep the order consistent with the order of the fields in the table
  // so that the hash matches when retrieving from the database
  const hash = SHA256(
    JSON.stringify(localLog, [
      "sessionID",
      "type",
      "key",
      "operation",
      "timestamp",
      "data",
    ]),
  ).toString();

  await storeRemoteLog(gateway, localLog.key, hash);
}

export async function storeInDatabase(
  gateway: SATPGateway,
  LocalLog: LocalLog,
) {
  await gateway.localRepository?.create(LocalLog);
}

export async function storeRemoteLog(
  gateway: SATPGateway,
  key: string,
  hash: string,
) {
  const fnTag = `${gateway.label}#storeInDatabase()`;

  const remoteLog: RemoteLog = {
    key: key,
    hash: hash,
    signature: "",
    signerPubKey: gateway.pubKey,
  };

  remoteLog.signature = bufArray2HexStr(
    sign(gateway.gatewaySigner, JSON.stringify(remoteLog)),
  );

  const response = await gateway.remoteRepository?.create(remoteLog);

  if (response.status < 200 && response.status > 299) {
    throw new Error(
      `${fnTag}, got response ${response.status} when logging to remote`,
    );
  }
}

export function getSatpLogKey(
  sessionID: string,
  type: string,
  operation: string,
): string {
  return `${sessionID}-${type}-${operation}`;
}
