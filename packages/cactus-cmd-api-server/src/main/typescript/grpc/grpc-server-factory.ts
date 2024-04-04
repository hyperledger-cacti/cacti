import * as grpc from "@grpc/grpc-js";

/**
 * Re-exports the underlying `new grpc.Server()` call verbatim.
 *
 * Why though? This is necessary because the {grpc.Server} object does an `instanceof`
 * validation on credential objects that are passed to it and this check comes back
 * negative if you've constructed the credentials object with a different instance
 * of the library, **even** if the versions of the library instances are the **same**.
 *
 * Therefore this is a workaround that allows callers to construct credentials
 * objects/servers with the same import of the `@grpc/grpc-js` library that the
 * {ApiServer} of this package is using internally.
 *
 * @returns {grpc.Server}
 */
export function createGrpcServer(
  options?: grpc.ServerOptions | undefined,
): grpc.Server {
  return new grpc.Server(options);
}
