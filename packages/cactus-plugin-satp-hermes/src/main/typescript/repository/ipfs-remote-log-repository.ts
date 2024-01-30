import { DefaultApi as ObjectStoreIpfsApi } from "@hyperledger/cactus-plugin-object-store-ipfs";
import { Configuration } from "@hyperledger/cactus-core-api";
import { IRemoteLogRepository } from "./interfaces/repository";
import { IRemoteLog } from "../plugin-satp-gateway";

export class IPFSRemoteLogRepository implements IRemoteLogRepository {
  public static readonly CLASS_NAME = "IPFSRemoteLogRepository";
  readonly database: ObjectStoreIpfsApi;

  public constructor(ipfsPath: string) {
    const config = new Configuration({ basePath: ipfsPath });
    const apiClient = new ObjectStoreIpfsApi(config);
    this.database = apiClient;
  }

  public get className(): string {
    return IPFSRemoteLogRepository.CLASS_NAME;
  }

  readById(logKey: string): Promise<IRemoteLog> {
    const fnTag = `${this.className}#readById()`;

    return this.database
      .getObjectV1({ key: logKey })
      .then((response: any) => {
        return JSON.parse(
          Buffer.from(response.data.value, "base64").toString(),
        );
      })
      .catch(() => {
        throw new Error(`${fnTag}, error when logging to ipfs`);
      });
  }

  create(log: IRemoteLog): any {
    const fnTag = `${this.className}#create()`;
    const logBase64 = Buffer.from(JSON.stringify(log)).toString("base64");

    return this.database
      .setObjectV1({
        key: log.key,
        value: logBase64,
      })
      .catch(() => {
        throw new Error(`${fnTag}, error when logging to ipfs`);
      });
  }

  async reset() {}

  async destroy() {}
}
