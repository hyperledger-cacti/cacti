import type { Options as ExpressJwtOptions } from "express-jwt";
import type { AuthorizeOptions as SocketIoJwtOptions } from "@thream/socketio-jwt";

export interface IAuthorizationConfig {
  expressJwtOptions: ExpressJwtOptions;
  socketIoJwtOptions: SocketIoJwtOptions;
  unprotectedEndpointExemptions: Array<string>;
  socketIoPath?: string;
}
