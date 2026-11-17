import { createHash } from "crypto";

import { InvalidDarError } from "./invalid-dar-error";

// Field numbers of `message Archive` in Daml-LF's daml_lf.proto.
const HASH_FUNCTION_FIELD = 1;
const PAYLOAD_FIELD = 3;
const HASH_FIELD = 4;
const HASH_FUNCTION_SHA256 = 0;

const WIRE_VARINT = 0;
const WIRE_FIXED64 = 1;
const WIRE_LENGTH_DELIMITED = 2;
const WIRE_FIXED32 = 5;
const MAX_VARINT_BYTES = 10;

const PACKAGE_ID_PATTERN = /^[0-9a-f]{64}$/;

function invalid(): never {
  throw new InvalidDarError("The main DALF is not a valid Daml-LF archive.");
}

class ProtobufReader {
  private offset = 0;

  public constructor(private readonly bytes: Buffer) {}

  public get done(): boolean {
    return this.offset >= this.bytes.length;
  }

  public readVarint(): number {
    let value = 0;
    let multiplier = 1;
    for (let index = 0; index < MAX_VARINT_BYTES; index++) {
      if (this.offset >= this.bytes.length) {
        invalid();
      }
      const byte = this.bytes[this.offset++];
      value += (byte & 0x7f) * multiplier;
      if ((byte & 0x80) === 0) {
        if (!Number.isSafeInteger(value)) {
          invalid();
        }
        return value;
      }
      multiplier *= 128;
    }
    return invalid();
  }

  public readBytes(length: number): Buffer {
    const end = this.offset + length;
    if (end > this.bytes.length) {
      invalid();
    }
    const value = this.bytes.subarray(this.offset, end);
    this.offset = end;
    return value;
  }

  public skip(wireType: number): void {
    switch (wireType) {
      case WIRE_VARINT:
        this.readVarint();
        return;
      case WIRE_FIXED64:
        this.readBytes(8);
        return;
      case WIRE_LENGTH_DELIMITED:
        this.readBytes(this.readVarint());
        return;
      case WIRE_FIXED32:
        this.readBytes(4);
        return;
      default:
        invalid();
    }
  }
}

/**
 * Returns the package ID of a Daml-LF archive (a `.dalf` file). The ID is the
 * SHA-256 of the archive payload. It is recomputed here and must equal the
 * hash the archive declares, so a tampered or mislabeled DALF is rejected
 * before upload instead of being reported under the wrong ID.
 */
export function getDamlLfPackageId(dalf: Buffer): string {
  const reader = new ProtobufReader(dalf);
  let hashFunction = HASH_FUNCTION_SHA256;
  let payload: Buffer | undefined;
  let hash: string | undefined;
  while (!reader.done) {
    const key = reader.readVarint();
    const field = Math.floor(key / 8);
    const wireType = key % 8;
    if (field === HASH_FUNCTION_FIELD && wireType === WIRE_VARINT) {
      hashFunction = reader.readVarint();
    } else if (field === PAYLOAD_FIELD && wireType === WIRE_LENGTH_DELIMITED) {
      payload = reader.readBytes(reader.readVarint());
    } else if (field === HASH_FIELD && wireType === WIRE_LENGTH_DELIMITED) {
      hash = reader.readBytes(reader.readVarint()).toString("utf8");
    } else {
      reader.skip(wireType);
    }
  }
  if (
    hashFunction !== HASH_FUNCTION_SHA256 ||
    !payload ||
    payload.length === 0 ||
    !hash ||
    !PACKAGE_ID_PATTERN.test(hash)
  ) {
    invalid();
  }
  const computed = createHash("sha256").update(payload).digest("hex");
  if (computed !== hash) {
    throw new InvalidDarError("The main DALF hash does not match its payload.");
  }
  return hash;
}
