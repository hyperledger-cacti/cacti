/**
 * Since kubo-rpc-client uses ESM only, we can't import it to get types (since we use CJS).
 * To fix this we define required types here, based on their counterparts in kubo-rpc-client.
 */

// TODO: Remove after migration to ESM or if better workaround was found.
// @ts-expect-error Importing ESM from CJS module causes error, but works fine in practice since we only import the types.
import type { Multiaddr } from "@multiformats/multiaddr";
// TODO: Remove after migration to ESM or if better workaround was found.
// @ts-expect-error Importing ESM from CJS module causes error, but works fine in practice since we only import the types.
import type { MultihashHasher } from "multiformats/hashes/interface";
import type { Agent as HttpAgent } from "http";
import type { Agent as HttpsAgent } from "https";
// TODO: Remove after migration to ESM or if better workaround was found.
// @ts-expect-error Importing ESM from CJS module causes error, but works fine in practice since we only import the types.
import type { CID } from "multiformats/cid";
// TODO: Remove after migration to ESM or if better workaround was found.
// @ts-expect-error Importing ESM from CJS module causes error, but works fine in practice since we only import the types.
import type { Mtime } from "ipfs-unixfs";

/////////////////////////////////////
// Types from kubo-rpc-client
/////////////////////////////////////
// Some are simplified when details are not needed

export type MultibaseCodec<Prefix extends string = any> =
  // TODO: Remove after migration to ESM or if better workaround was found.
  // @ts-expect-error Importing ESM from CJS module causes error, but works fine in practice since we only import the types.
  import("multiformats/bases/interface").MultibaseCodec<Prefix>;
export type BlockCodec<
  T1 = any,
  T2 = any,
  // TODO: Remove after migration to ESM or if better workaround was found.
  // @ts-expect-error Importing ESM from CJS module causes error, but works fine in practice since we only import the types.
> = import("multiformats/codecs/interface").BlockCodec<T1, T2>;

export interface LoadBaseFn {
  (codeOrName: number | string): Promise<MultibaseCodec<any>>;
}
export interface LoadCodecFn {
  (codeOrName: number | string): Promise<BlockCodec<any, any>>;
}
export interface LoadHasherFn {
  (codeOrName: number | string): Promise<MultihashHasher>;
}

export interface IPLDOptions {
  loadBase: LoadBaseFn;
  loadCodec: LoadCodecFn;
  loadHasher: LoadHasherFn;
  bases: Array<MultibaseCodec<any>>;
  codecs: Array<BlockCodec<any, any>>;
  hashers: MultihashHasher[];
}

export interface Options {
  host?: string;
  port?: number;
  protocol?: string;
  headers?: Headers | Record<string, string>;
  timeout?: number | string;
  apiPath?: string;
  url?: URL | string | Multiaddr;
  ipld?: Partial<IPLDOptions>;
  agent?: HttpAgent | HttpsAgent;
}

export type IPFSPath = CID | string;

export interface StatResult {
  cid: CID;
  size: number;
  cumulativeSize: number;
  type: "directory" | "file";
  blocks: number;
  withLocality: boolean;
  local?: boolean;
  sizeLocal?: number;
  mode?: number;
  mtime?: Mtime;
}

/////////////////////////////////////////////////////////
// LikeIpfsHttpClient instead of full IpfsHttpClient
/////////////////////////////////////////////////////////

/**
 * Connector only needs these methods to work.
 * More methods can be added in the future.
 */
export interface LikeIpfsHttpClientFile {
  read: (
    ipfsPath: IPFSPath,
    options?: Record<string, unknown>,
  ) => AsyncIterable<Uint8Array>;

  write: (
    ipfsPath: string,
    content:
      | string
      | Uint8Array
      | Blob
      | AsyncIterable<Uint8Array>
      | Iterable<Uint8Array>,
    options?: Record<string, unknown>,
  ) => Promise<void>;

  stat: (
    ipfsPath: IPFSPath,
    options?: Record<string, unknown>,
  ) => Promise<StatResult>;
}

export function isLikeIpfsHttpClientFile(
  x: unknown,
): x is LikeIpfsHttpClientFile {
  if (!x) {
    return false;
  }
  return (
    typeof (x as LikeIpfsHttpClientFile).read === "function" &&
    typeof (x as LikeIpfsHttpClientFile).write === "function" &&
    typeof (x as LikeIpfsHttpClientFile).stat === "function"
  );
}

/**
 * Only files API is used
 */
export interface LikeIpfsHttpClient {
  files: LikeIpfsHttpClientFile;
}

export function isLikeIpfsHttpClient(x: unknown): x is LikeIpfsHttpClient {
  if (!x) {
    return false;
  }
  return isLikeIpfsHttpClientFile((x as LikeIpfsHttpClient).files);
}
