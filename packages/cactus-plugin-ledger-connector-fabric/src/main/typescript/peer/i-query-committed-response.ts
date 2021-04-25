/**
 * The response format of the JSON document output by the command below:
 * ```sh
 * peer lifecycle chaincode querycommitted --channelID=mychannel --output json
 * ```
 *
 * An example of said JSON document in action:
 * ```json
 * {
 *   "chaincode_definitions": [
 *     {
 *       "name": "basic",
 *       "sequence": 1,
 *       "version": "1.0",
 *       "endorsement_plugin": "escc",
 *       "validation_plugin": "vscc",
 *       "validation_parameter": "EiAvQ2hhbm5lbC9BcHBsaWNhdGlvbi9FbmRvcnNlbWVudA==",
 *       "collections": {}
 *     },
 *     {
 *       "name": "basic-asset-transfer",
 *       "sequence": 1,
 *       "version": "1.0.0",
 *       "endorsement_plugin": "escc",
 *       "validation_plugin": "vscc",
 *       "validation_parameter": "EiAvQ2hhbm5lbC9BcHBsaWNhdGlvbi9FbmRvcnNlbWVudA==",
 *       "collections": {}
 *     }
 *   ]
 * }
 * ```
 */
export interface IQueryCommittedResponse {
  chaincode_definitions: IChainCodeDefinition[];
}

export interface ICollections {
  [key: string]: unknown;
}

export interface IChainCodeDefinition {
  name: string;
  sequence: number;
  version: string;
  endorsement_plugin: string;
  validation_plugin: string;
  validation_parameter: string;
  collections: ICollections;
}
