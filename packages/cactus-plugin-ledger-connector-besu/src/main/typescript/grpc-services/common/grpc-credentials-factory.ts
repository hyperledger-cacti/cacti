import * as grpc from "@grpc/grpc-js";

/**
 * Re-exports the underlying `grpc.ServerCredentials.createInsecure()` call
 * verbatim.
 * Why though? This is necessary because the {grpc.Server} object does an `instanceof`
 * validation on credential objects that are passed to it and this check comes back
 * negative if you've constructed the credentials object with a different instance
 * of the library, **even** if the versions of the library instances are the **same**.
 *
 * Therefore this is a workaround that allows callers to construct credentials
 * objects with the same import of the `@grpc/grpc-js` library that the {ApiServer}
 * of this package is using.
 *
 * @returns {grpc.ServerCredentials}
 */
export function createGrpcInsecureServerCredentials(): grpc.ServerCredentials {
  return grpc.ServerCredentials.createInsecure();
}

/**
 * Re-exports the underlying `grpc.ServerCredentials.createInsecure()` call
 * verbatim.
 * Why though? This is necessary because the {grpc.Server} object does an `instanceof`
 * validation on credential objects that are passed to it and this check comes back
 * negative if you've constructed the credentials object with a different instance
 * of the library, **even** if the versions of the library instances are the **same**.
 *
 * Therefore this is a workaround that allows callers to construct credentials
 * objects with the same import of the `@grpc/grpc-js` library that the {ApiServer}
 * of this package is using.
 *
 * @returns {grpc.ServerCredentials}
 */
export function createGrpcSslServerCredentials(
  rootCerts: Buffer | null,
  keyCertPairs: grpc.KeyCertPair[],
  checkClientCertificate?: boolean,
): grpc.ServerCredentials {
  return grpc.ServerCredentials.createSsl(
    rootCerts,
    keyCertPairs,
    checkClientCertificate,
  );
}

/**
 * Re-exports the underlying `grpc.ServerCredentials.createInsecure()` call
 * verbatim.
 * Why though? This is necessary because the {grpc.Server} object does an `instanceof`
 * validation on credential objects that are passed to it and this check comes back
 * negative if you've constructed the credentials object with a different instance
 * of the library, **even** if the versions of the library instances are the **same**.
 *
 * Therefore this is a workaround that allows callers to construct credentials
 * objects with the same import of the `@grpc/grpc-js` library that the {ApiServer}
 * of this package is using.
 *
 * @returns {grpc.ChannelCredentials}
 */
export function createGrpcInsecureChannelCredentials(): grpc.ChannelCredentials {
  return grpc.ChannelCredentials.createInsecure();
}

/**
 * Re-exports the underlying `grpc.ServerCredentials.createInsecure()` call
 * verbatim.
 * Why though? This is necessary because the {grpc.Server} object does an `instanceof`
 * validation on credential objects that are passed to it and this check comes back
 * negative if you've constructed the credentials object with a different instance
 * of the library, **even** if the versions of the library instances are the **same**.
 *
 * Therefore this is a workaround that allows callers to construct credentials
 * objects with the same import of the `@grpc/grpc-js` library that the {ApiServer}
 * of this package is using.
 *
 * @returns {grpc.ChannelCredentials}
 */
export function createGrpcSslChannelCredentials(
  rootCerts?: Buffer | null,
  privateKey?: Buffer | null,
  certChain?: Buffer | null,
  verifyOptions?: grpc.VerifyOptions,
): grpc.ChannelCredentials {
  return grpc.ChannelCredentials.createSsl(
    rootCerts,
    privateKey,
    certChain,
    verifyOptions,
  );
}
