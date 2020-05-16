import { IExpressRequestHandler } from "./i-express-request-handler";

export interface IWebServiceEndpoint {
  getPath(): string;
  getExpressRequestHandler(): IExpressRequestHandler;
}
