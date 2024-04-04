import type { ServiceType } from "@bufbuild/protobuf";
import type { ServiceImpl } from "@connectrpc/connect";
import type { UniversalHandlerOptions } from "@connectrpc/connect/protocol";

/**
 * Implementers of this interface are responsible for providing a Crpc service
 * that can be dynamically registered at runtime by the API server.
 *
 * It describes what methods a class (plugin) needs to implement
 * in order to be able to operate as a Cacti Crpc service (e.g. expose its
 * functionality through Crpc not just HTTP or SocketIO)
 *
 * @see {IPluginWebService}
 * @see {IPluginGrpcService}
 * @see {ApiServer}
 */
export interface IPluginCrpcService {
  /**
   * Used by the API server and/or automated test cases when hooking up this
   * plugin instance into a crpc Server object.
   *
   * The returned pair of service
   * definition and implementation objects are passed in to the `.addService()`
   * method of the `Server` object of the `@connectrpc/connect` library.
   *
   * @see {ServiceDefinition}
   * @see {ServiceType}
   * @see {ICrpcSvcRegistration}
   */
  createCrpcSvcRegistrations(
    opts: unknown,
  ): Promise<Array<ICrpcSvcRegistration<ServiceType>>>;
}

/**
 * A wrapper object that contains both the the definition and the implementation
 * objects of a crpc service that a plugin can implement to expose it's functionality
 * over crpc.
 *
 * @see {IPluginGrpcService}
 * @see {IGrpcSvcDefAndImplPair}
 */
export interface ICrpcSvcRegistration<T extends ServiceType> {
  readonly definition: T;
  readonly implementation: Partial<ServiceImpl<T>>;
  readonly serviceName: string;
  readonly options?: Partial<UniversalHandlerOptions>;
}

/**
 * Custom (user-defined) Typescript type-guard that verifies at runtime whether
 * `x` is an implementation of {IPluginCrpcService} or not.
 *
 * @param x Literally any object or value that you'd want to verify for having
 * the right method(s) implemented in-order to qualify as an implementer of the
 * {IPluginCrpcService} interface.
 *
 * The {ApiServer} uses this to filter the total list of plugins down to the ones
 * that have crpc services of their own and then hook those up at runtime.
 *
 * @returns `true` if `x` does implement {IPluginCrpcService} `false` otherwise.
 */
export function isIPluginCrpcService(x: unknown): x is IPluginCrpcService {
  return (
    !!x &&
    typeof (x as IPluginCrpcService).createCrpcSvcRegistrations === "function"
  );
}
