import { ICactusPlugin } from "../i-cactus-plugin";

/**
 * Common interface to be implemented by plugins which are implementing the connection to ledgers.
 */
export interface IPluginConsortium<
  GetNodeJwsIn,
  GetNodeJwsOut,
  GetConsortiumJwsIn,
  GetConsortiumJwsOut
> extends ICactusPlugin {
  /**
   * Returns the JSON Web Signature of the consortium metadata, as issued by the
   * **current node** that the request has been issued to.
   * @param req The parameters of the request, if any.
   */
  getNodeJws(req?: GetNodeJwsIn): Promise<GetNodeJwsOut>;

  /**
   * Returns the JSON Web Signature of the consortium metadata, as issued by
   * **all the nodes in the consortium** that are known to be in the consortium
   * by this current node that the request has been issued to.
   *
   * @param req The parameters of the request, if any.
   */
  getConsortiumJws(req?: GetConsortiumJwsIn): Promise<GetConsortiumJwsOut>;
}
