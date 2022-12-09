import type { AuthorizeOptions as SocketIoJwtOptions } from "@thream/socketio-jwt";

export interface IAuthorizationConfig {
  expressJwtOptions: Record<string, unknown>;
  socketIoJwtOptions: SocketIoJwtOptions;
  unprotectedEndpointExemptions: Array<string>;
  socketIoPath?: string;
}
