import { JsObjectSigner } from "@hyperledger/cactus-common";
import { context, SpanStatusCode, trace } from "@opentelemetry/api";
import { SHA256 } from "crypto-js";
import { stringify as safeStableStringify } from "safe-stable-stringify";

export function bufArray2HexStr(array: Uint8Array | Buffer | string): string {
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
  const fnTag = `gatewayUtils#verifySignature()`;
  const tracer = trace.getTracer("satp-hermes-tracer");
  const span = tracer.startSpan(fnTag);
  const ctx = trace.setSpan(context.active(), span);
  return context.with(ctx, () => {
    try {
      const copy = JSON.parse(safeStableStringify(obj)!);

      if (copy.clientSignature) {
        const sourceSignature = new Uint8Array(
          Buffer.from(copy.clientSignature, "hex"),
        );

        const sourcePubkey = new Uint8Array(Buffer.from(pubKey, "hex"));

        copy.clientSignature = "";
        if (
          !objectSigner.verify(
            safeStableStringify(copy),
            sourceSignature,
            sourcePubkey,
          )
        ) {
          return false;
        }
        return true;
      } else if (copy.serverSignature) {
        const sourceSignature = new Uint8Array(
          Buffer.from(copy.serverSignature, "hex"),
        );

        const sourcePubkey = new Uint8Array(Buffer.from(pubKey, "hex"));

        copy.serverSignature = "";
        if (
          !objectSigner.verify(
            safeStableStringify(copy),
            sourceSignature,
            sourcePubkey,
          )
        ) {
          return false;
        }
        return true;
      } else {
        throw new Error("No signature found in the object");
      }
    } catch (error) {
      span.setStatus({ code: SpanStatusCode.ERROR, message: String(error) });
      span.recordException(error);
      throw error;
    } finally {
      span.end();
    }
  });
}

export function getSatpLogKey(
  sessionID: string,
  type: string,
  operation: string,
): string {
  return `${sessionID}-${type}-${operation}`;
}

export function getHash(object: unknown) {
  return SHA256(safeStableStringify(object) ?? "").toString();
}
