import { createHash } from "crypto";
import { deflateRawSync } from "zlib";

export interface IZipFixtureEntry {
  readonly name: string;
  readonly content: Buffer;
  /** Store uncompressed instead of deflating. */
  readonly stored?: boolean;
  /** Overrides the size recorded in the central directory. */
  readonly declaredSize?: number;
}

/** Builds a minimal, non-ZIP64 archive the way damlc lays out a DAR. */
export function createZip(entries: readonly IZipFixtureEntry[]): Buffer {
  const localParts: Buffer[] = [];
  const centralParts: Buffer[] = [];
  let offset = 0;
  for (const entry of entries) {
    const name = Buffer.from(entry.name, "utf8");
    const data = entry.stored ? entry.content : deflateRawSync(entry.content);
    const method = entry.stored ? 0 : 8;
    const size = entry.declaredSize ?? entry.content.length;

    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(method, 8);
    local.writeUInt32LE(data.length, 18);
    local.writeUInt32LE(size, 22);
    local.writeUInt16LE(name.length, 26);
    localParts.push(local, name, data);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(method, 10);
    central.writeUInt32LE(data.length, 20);
    central.writeUInt32LE(size, 24);
    central.writeUInt16LE(name.length, 28);
    central.writeUInt32LE(offset, 42);
    centralParts.push(central, name);

    offset += local.length + name.length + data.length;
  }
  const centralDirectory = Buffer.concat(centralParts);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(centralDirectory.length, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...localParts, centralDirectory, end]);
}

function varint(value: number): Buffer {
  const bytes: number[] = [];
  let remaining = value;
  while (remaining >= 0x80) {
    bytes.push(remaining % 0x80 | 0x80);
    remaining = Math.floor(remaining / 0x80);
  }
  bytes.push(remaining);
  return Buffer.from(bytes);
}

function lengthDelimited(fieldNumber: number, value: Buffer): Buffer {
  return Buffer.concat([
    varint(fieldNumber * 8 + 2),
    varint(value.length),
    value,
  ]);
}

/** Encodes a Daml-LF `Archive` message whose hash covers `payload`. */
export function createDalf(
  payload: Buffer,
  hash = createHash("sha256").update(payload).digest("hex"),
): Buffer {
  return Buffer.concat([
    varint(1 * 8 + 0),
    varint(0),
    lengthDelimited(3, payload),
    lengthDelimited(4, Buffer.from(hash, "utf8")),
  ]);
}

export interface IDarFixture {
  readonly dar: Buffer;
  readonly packageId: string;
  readonly name: string;
}

/**
 * Builds a DAR with a main DALF and one dependency DALF. Damlc wraps long
 * manifest values onto continuation lines, so the Main-Dalf value is wrapped
 * here as well.
 */
export function createDarFixture(
  options: {
    readonly payload?: Buffer;
    readonly dalf?: Buffer;
    readonly manifest?: string;
  } = {},
): IDarFixture {
  const payload = options.payload ?? Buffer.from("cacti-test-package");
  const packageId = createHash("sha256").update(payload).digest("hex");
  const name = "cacti-test-1.0.0";
  const mainDalf = `${name}-${packageId}/${name}-${packageId}.dalf`;
  const manifest =
    options.manifest ??
    [
      "Manifest-Version: 1.0",
      "Created-By: damlc",
      `Name: ${name}`,
      `Main-Dalf: ${mainDalf.slice(0, 40)}`,
      ` ${mainDalf.slice(40)}`,
      "Format: daml-lf",
      "",
    ].join("\r\n");
  const dar = createZip([
    { name: "META-INF/MANIFEST.MF", content: Buffer.from(manifest) },
    { name: mainDalf, content: options.dalf ?? createDalf(payload) },
    {
      name: `${name}-${packageId}/daml-prim.dalf`,
      content: createDalf(Buffer.from("daml-prim")),
    },
  ]);
  return { dar, packageId, name };
}
