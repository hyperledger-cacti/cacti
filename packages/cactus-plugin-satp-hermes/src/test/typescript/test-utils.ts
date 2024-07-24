import { Logger } from "@hyperledger/cactus-common";
import {
  AdminApi,
  TransactionApi,
} from "../../main/typescript/generated/gateway-client/typescript-axios/api";
import { Configuration } from "../../main/typescript/generated/gateway-client/typescript-axios";
//import { Api } from "@bufbuild/protobuf";

export function createClient(
  type: "AdminApi",
  address: string,
  port: number,
  logger: Logger,
): AdminApi;
export function createClient(
  type: "TransactionApi",
  address: string,
  port: number,
  logger: Logger,
): TransactionApi;

export function createClient(
  type: "AdminApi" | "TransactionApi",
  address: string,
  port: number,
  logger: Logger,
): AdminApi | TransactionApi {
  const config = new Configuration({ basePath: `${address}:${port}` });
  logger.debug(config);

  if (type === "AdminApi") {
    return new AdminApi(config);
  } else if (type === "TransactionApi") {
    return new TransactionApi(config);
  } else {
    throw new Error("Invalid api type");
  }
}
