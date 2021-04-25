/**
 * The response format of the JSON document output by the command below:
 * ```sh
 * peer lifecycle chaincode queryinstalled --output json
 * ```
 *
 * An example of said JSON document in action:
 * ```json
 * {
 *   "installed_chaincodes": [
 *     {
 *       "package_id": "basic_1.0:4ec191e793b27e953ff2ede5a8bcc63152cecb1e4c3f301a26e22692c61967ad",
 *       "label": "basic_1.0",
 *       "references": {
 *         "mychannel": {
 *           "chaincodes": [
 *             {
 *               "name": "basic",
 *               "version": "1.0"
 *             }
 *           ]
 *         }
 *       }
 *     }
 *   ]
 * }
 * ```
 */
export interface IQueryInstalledResponse {
  installed_chaincodes: IInstalledChainCode[];
}

export interface IInstalledChainCode {
  package_id: string;
  label: string;
  references: IReferences;
}

export interface IReferences {
  [key: string]: IChannel;
}

export interface IChannel {
  chaincodes: IChainCode[];
}

export interface IChainCode {
  name: string;
  version: string;
}
