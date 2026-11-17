import { inflateRawSync } from "zlib";

import { InvalidDarError } from "./invalid-dar-error";

/** The ZIP central-directory fields the DAR reader needs. */
export interface IZipEntry {
  readonly name: string;
  readonly method: number;
  readonly compressedSize: number;
  readonly uncompressedSize: number;
  readonly localHeaderOffset: number;
}

const END_OF_CENTRAL_DIRECTORY_SIGNATURE = 0x06054b50;
const CENTRAL_DIRECTORY_SIGNATURE = 0x02014b50;
const LOCAL_FILE_HEADER_SIGNATURE = 0x04034b50;
const END_OF_CENTRAL_DIRECTORY_SIZE = 22;
const CENTRAL_DIRECTORY_HEADER_SIZE = 46;
const LOCAL_FILE_HEADER_SIZE = 30;
const MAX_ZIP_COMMENT_SIZE = 0xffff;
const ZIP64_MARKER_16 = 0xffff;
const ZIP64_MARKER_32 = 0xffffffff;
const ENCRYPTED_FLAG = 0x0001;
const METHOD_STORED = 0;
const METHOD_DEFLATE = 8;
/** DARs hold one entry per Daml package plus metadata; this is generous. */
const MAX_ZIP_ENTRIES = 10_000;

function invalid(message: string): never {
  throw new InvalidDarError(message);
}

function findEndOfCentralDirectory(bytes: Buffer): number {
  const lastCandidate = bytes.length - END_OF_CENTRAL_DIRECTORY_SIZE;
  const firstCandidate = Math.max(0, lastCandidate - MAX_ZIP_COMMENT_SIZE);
  for (let offset = lastCandidate; offset >= firstCandidate; offset--) {
    if (bytes.readUInt32LE(offset) === END_OF_CENTRAL_DIRECTORY_SIGNATURE) {
      return offset;
    }
  }
  return invalid("The DAR is not a ZIP archive.");
}

/**
 * Lists the entries of a ZIP archive from its central directory. ZIP64,
 * encrypted entries, and duplicate names are rejected rather than guessed at,
 * because a DAR never needs them and ambiguous archives are unsafe to vet.
 */
export function readZipEntries(bytes: Buffer): Map<string, IZipEntry> {
  if (bytes.length < END_OF_CENTRAL_DIRECTORY_SIZE) {
    invalid("The DAR is not a ZIP archive.");
  }
  const endOfDirectory = findEndOfCentralDirectory(bytes);
  const entryCount = bytes.readUInt16LE(endOfDirectory + 10);
  const directorySize = bytes.readUInt32LE(endOfDirectory + 12);
  const directoryOffset = bytes.readUInt32LE(endOfDirectory + 16);
  if (
    entryCount === ZIP64_MARKER_16 ||
    directorySize === ZIP64_MARKER_32 ||
    directoryOffset === ZIP64_MARKER_32
  ) {
    invalid("ZIP64 DARs are not supported.");
  }
  if (entryCount === 0 || entryCount > MAX_ZIP_ENTRIES) {
    invalid(`The DAR must contain between 1 and ${MAX_ZIP_ENTRIES} entries.`);
  }
  if (directoryOffset + directorySize > endOfDirectory) {
    invalid("The DAR central directory is out of bounds.");
  }

  const entries = new Map<string, IZipEntry>();
  let offset = directoryOffset;
  for (let index = 0; index < entryCount; index++) {
    if (
      offset + CENTRAL_DIRECTORY_HEADER_SIZE > endOfDirectory ||
      bytes.readUInt32LE(offset) !== CENTRAL_DIRECTORY_SIGNATURE
    ) {
      invalid("The DAR central directory is malformed.");
    }
    const flags = bytes.readUInt16LE(offset + 8);
    const nameLength = bytes.readUInt16LE(offset + 28);
    const extraLength = bytes.readUInt16LE(offset + 30);
    const commentLength = bytes.readUInt16LE(offset + 32);
    const nameEnd = offset + CENTRAL_DIRECTORY_HEADER_SIZE + nameLength;
    if (nameEnd + extraLength + commentLength > endOfDirectory) {
      invalid("The DAR central directory is malformed.");
    }
    if ((flags & ENCRYPTED_FLAG) !== 0) {
      invalid("Encrypted DAR entries are not supported.");
    }
    const entry: IZipEntry = {
      name: bytes.toString(
        "utf8",
        offset + CENTRAL_DIRECTORY_HEADER_SIZE,
        nameEnd,
      ),
      method: bytes.readUInt16LE(offset + 10),
      compressedSize: bytes.readUInt32LE(offset + 20),
      uncompressedSize: bytes.readUInt32LE(offset + 24),
      localHeaderOffset: bytes.readUInt32LE(offset + 42),
    };
    if (
      entry.compressedSize === ZIP64_MARKER_32 ||
      entry.uncompressedSize === ZIP64_MARKER_32 ||
      entry.localHeaderOffset === ZIP64_MARKER_32
    ) {
      invalid("ZIP64 DARs are not supported.");
    }
    if (entries.has(entry.name)) {
      invalid("The DAR contains duplicate entry names.");
    }
    entries.set(entry.name, entry);
    offset = nameEnd + extraLength + commentLength;
  }
  return entries;
}

/**
 * Returns the uncompressed content of one entry. The declared size is only
 * trusted as an upper bound: inflation stops at `maxBytes`, and the result
 * must match the declared size exactly.
 */
export function readZipEntry(
  bytes: Buffer,
  entry: IZipEntry,
  maxBytes: number,
): Buffer {
  if (entry.uncompressedSize > maxBytes) {
    invalid(`The DAR entry ${entry.name} exceeds ${maxBytes} bytes.`);
  }
  const header = entry.localHeaderOffset;
  if (
    header + LOCAL_FILE_HEADER_SIZE > bytes.length ||
    bytes.readUInt32LE(header) !== LOCAL_FILE_HEADER_SIGNATURE
  ) {
    invalid(`The DAR entry ${entry.name} has no local header.`);
  }
  const dataStart =
    header +
    LOCAL_FILE_HEADER_SIZE +
    bytes.readUInt16LE(header + 26) +
    bytes.readUInt16LE(header + 28);
  const dataEnd = dataStart + entry.compressedSize;
  if (dataEnd > bytes.length) {
    invalid(`The DAR entry ${entry.name} is truncated.`);
  }
  const data = bytes.subarray(dataStart, dataEnd);

  let content: Buffer;
  if (entry.method === METHOD_STORED) {
    content = data;
  } else if (entry.method === METHOD_DEFLATE) {
    try {
      content = inflateRawSync(data, { maxOutputLength: maxBytes });
    } catch (_error: unknown) {
      return invalid(
        `The DAR entry ${entry.name} is corrupt or exceeds ${maxBytes} bytes.`,
      );
    }
  } else {
    return invalid(`The DAR entry ${entry.name} uses an unsupported method.`);
  }
  if (content.length !== entry.uncompressedSize) {
    invalid(`The DAR entry ${entry.name} does not match its declared size.`);
  }
  return content;
}
