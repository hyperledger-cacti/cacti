import type {
  ServiceDefinition,
  UntypedServiceImplementation,
} from "@grpc/grpc-js";

/**
 * Implementers of this interface are responsible for providing a gRPC service
 * that can be dynamically registered at runtime by the API server.
 *
 * It describes what methods a class (plugin) needs to implement
 * in order to be able to operate as a Cacti gRPC service (e.g. expose its
 * functionality through gRPC not just HTTP or SocketIO)
 *
 * @see {IPluginWebService}
 * @see {ApiServer}
 */
export interface IPluginGrpcService {
  /**
   * Used by the API server and/or automated test cases when hooking up this
   * plugin instance into a gRPC Server object.
   *
   * The returned pair of service
   * definition and implementation objects are passed in to the `.addService()`
   * method of the `Server` object of the `@grpc/grpc-js` library.
   *
   * @see {ServiceDefinition}
   * @see {IGrpcSvcDefAndImplPair}
   */
  createGrpcSvcDefAndImplPairs(
    opts: unknown,
  ): Promise<Array<IGrpcSvcDefAndImplPair>>;
}

/**
 * A wrapper object that contains both the the definition and the implementation
 * objects of a gRPC service that a plugin can implement to expose it's functionality
 * over gRPC.
 */
export interface IGrpcSvcDefAndImplPair {
  readonly definition: ServiceDefinition;
  readonly implementation: UntypedServiceImplementation;
}

/**
 * Custom (user-defined) Typescript type-guard that verifies at runtime whether
 * `x` is an implementation of {IPluginGrpcService} or not.
 *
 * @param x Literally any object or value that you'd want to verify for having
 * the right method(s) implemented in-order to qualify as an implementer of the
 * {IPluginGrpcService} interface.
 *
 * The {ApiServer} uses this to filter the total list of plugins down to the ones
 * that have gRPC services of their own and then hook those up at runtime.
 *
 * @returns `true` if `x` does implement {IPluginGrpcService} `false` otherwise.
 */
export function isIPluginGrpcService(x: unknown): x is IPluginGrpcService {
  return (
    !!x &&
    typeof (x as IPluginGrpcService).createGrpcSvcDefAndImplPairs === "function"
  );
}
