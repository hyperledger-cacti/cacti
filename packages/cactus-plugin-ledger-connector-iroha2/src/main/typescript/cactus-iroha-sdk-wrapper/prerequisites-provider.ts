/**
 * Provider for IrohaV2 ToriiRequirements needed by Iroha2 SDK.
 */

import {
  IsomorphicWebSocketAdapter,
  ToriiRequirementsForApiWebSocket,
  ToriiRequirementsForApiHttp,
} from "@iroha2/client";

// This module can't be imported unless we use `nodenext` moduleResolution
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { adapter: irohaWSAdapter } = require("@iroha2/client/web-socket/node");
import { fetch as undiciFetch } from "undici";

/**
 * Helper class that returns ToriiRequirements for different Iroha2 commands.
 * Can be created with missing parameters, if they are required for requested requirement
 * an exception will be thrown.
 */
export class IrohaV2PrerequisitesProvider {
  /**
   * IrohaV2 isomorphic ws adapter
   */
  public webSocketAdapter: IsomorphicWebSocketAdapter = irohaWSAdapter;

  /**
   * IrohaV2 isomorphic fetch adapter
   */
  public fetchAdapter = undiciFetch as any as typeof fetch;

  constructor(
    public apiURL?: string,
    public telemetryURL?: string,
  ) {}

  /**
   * Get requirements for executing API calls on web socket protocol.
   * @returns `ToriiRequirementsForApiWebSocket`
   */
  getApiWebSocketProperties(): ToriiRequirementsForApiWebSocket {
    if (!this.apiURL || !this.webSocketAdapter) {
      throw new Error(
        "Missing required arguments: apiURL and iroha ws adapter",
      );
    }

    return {
      apiURL: this.apiURL,
      ws: this.webSocketAdapter,
    };
  }

  /**
   * Get requirements for executing API calls on HTTP protocol.
   * @returns `ToriiRequirementsForApiHttp`
   */
  getApiHttpProperties(): ToriiRequirementsForApiHttp {
    if (!this.apiURL || !this.fetchAdapter) {
      throw new Error(
        "Missing required arguments: apiURL and iroha fetch adapter",
      );
    }

    return {
      apiURL: this.apiURL,
      fetch: this.fetchAdapter,
    };
  }
}
