import { OpenAPIV3 } from "openapi-types";

import { RunTransactionEndpointV1 } from "./run-transaction/run-transaction-endpoint-constants";
import { DeployContractGoSourceEndpointV1 } from "./deploy-contract-go-source/deploy-contract-go-source-endpoint-constants";

export const CACTUS_OPEN_API_JSON: OpenAPIV3.Document = {
  openapi: "3.0.3",
  info: {
    title: "Hyperledger Cactus Plugin - Connector Fabric",
    description: "Can perform basic tasks on a fabric ledger",
    version: "0.0.1",
  },
  servers: [
    {
      url: "https://www.cactus.stream/{basePath}",
      description: "Public test instance",
      variables: {
        basePath: {
          default: "",
        },
      },
    },
    {
      url: "http://localhost:4000/{basePath}",
      description: "Local test instance",
      variables: {
        basePath: {
          default: "",
        },
      },
    },
  ],
  components: {
    schemas: {
      ConnectionProfile: {
        type: "object",
        required: ["name", "description", "version", "organizations", "peers"],
        additionalProperties: true,
        properties: {
          name: {
            type: "string",
            example: "basic-network",
            minLength: 1,
            maxLength: 1024,
          },
          "x-type": {
            type: "string",
            minLength: 1,
            example: "hlfv1",
          },
          description: {
            type: "string",
            example: "The basic network",
          },
          version: {
            type: "string",
            example: "1.0",
          },
          client: {
            type: "object",
            properties: {
              organization: {
                type: "string",
                example: "Org1",
              },
            },
          },
          channels: {
            type: "object",
            additionalProperties: true,
            //  "mychannel": {
            //     "orderers": [
            //        "orderer.example.com"
            //     ],
            //     "peers": {
            //        "peer0.org1.example.com": {
            //           "endorsingPeer": true,
            //           "chaincodeQuery": true,
            //           "ledgerQuery": true,
            //           "eventSource": true
            //        }
            //     }
            //  }
          },
          organizations: {
            type: "object",
            additionalProperties: true,
            //  "Org1": {
            //     "mspid": "Org1MSP",
            //     "peers": [
            //        "peer0.org1.example.com"
            //     ],
            //     "certificateAuthorities": [
            //        "ca-org1"
            //     ]
            //  }
          },
          orderers: {
            type: "object",
            additionalProperties: true,
            //  "orderer.example.com": {
            //     "url": "grpc://localhost:7050",
            //     "grpcOptions": {
            //        "ssl-target-name-override": "orderer.example.com"
            //     }
            //  }
          },
          peers: {
            type: "object",
            additionalProperties: true,
            // "peer0.org1.example.com": {
            //   "url": "grpc://localhost:7051",
            //   "grpcOptions": {
            //     "ssl-target-name-override": "peer0.org1.example.com",
            //     "request-timeout": 120001
            //   }
            // }
          },
          certificateAuthorities: {
            type: "object",
            additionalProperties: true,
            // "ca-org1": {
            //   "url": "http://localhost:7054",
            //   "httpOptions": {
            //     "verify": false
            //   },
            //   "registrar": [
            //     {
            //       "enrollId": "admin",
            //       "enrollSecret": "adminpw"
            //     }
            //   ],
            //   "caName": "ca-org1"
            // }
          },
        },
      },
      GatewayDiscoveryOptions: {
        type: "object",
        required: [],
        additionalProperties: false,
        properties: {
          asLocalhost: {
            type: "boolean",
            nullable: false,
          },
          enabled: {
            type: "boolean",
            nullable: false,
          },
        },
      },
      DefaultEventHandlerStrategy: {
        type: "string",
        enum: [
          "MSPID_SCOPE_ALLFORTX",
          "MSPID_SCOPE_ANYFORTX",
          "NETWORK_SCOPE_ALLFORTX",
          "NETWORK_SCOPE_ANYFORTX",
        ],
      },
      GatewayEventHandlerOptions: {
        type: "object",
        required: ["strategy"],
        additionalProperties: false,
        properties: {
          commitTimeout: {
            type: "number",
            nullable: false,
          },
          strategy: {
            description:
              "The name of the strategy to be used when looking " +
              "up the TxEventHandlerFactory to pass in to the Fabric Gateway " +
              "as the strategy property of the discovery options.",
            $ref: "#/components/schemas/DefaultEventHandlerStrategy",
          },
        },
      },
      FileBase64: {
        description:
          "Represents a file-system file that has a name and a " +
          "body which holds the file contents as a Base64 encoded string",
        type: "object",
        required: ["body", "filename"],
        properties: {
          body: {
            description: "The file's contents encoded as a Base64 string.",
            type: "string",
            nullable: false,
            minLength: 1,
            maxLength: 100 * 1024 * 1024, // 100 megabytes
          },
          filename: {
            description: "The name as referred to on a file system",
            example: "my-cool-file-full-of-wonders-and-fun-stuff.go",
            type: "string",
            nullable: false,
            minLength: 1,
            maxLength: 255,
          },
        },
      },
      FabricContractInvocationType: {
        type: "string",
        enum: [
          "FabricContractInvocationType.SEND",
          "FabricContractInvocationType.CALL",
        ],
      },
      RunTransactionRequest: {
        type: "object",
        required: [
          "keychainId",
          "keychainRef",
          "channelName",
          "chainCodeId",
          "invocationType",
          "functionName",
          "functionArgs",
        ],
        properties: {
          keychainId: {
            type: "string",
            minLength: 1,
            maxLength: 100,
            nullable: false,
          },
          keychainRef: {
            type: "string",
            minLength: 1,
            maxLength: 100,
            nullable: false,
          },
          channelName: {
            type: "string",
            minLength: 1,
            maxLength: 100,
            nullable: false,
          },
          chainCodeId: {
            type: "string",
            minLength: 1,
            maxLength: 100,
            nullable: false,
          },
          invocationType: {
            $ref: "#/components/schemas/FabricContractInvocationType",
            nullable: false,
            description:
              "Indicates if it is a CALL or a SEND type of invocation " +
              "where only SEND ends up creating an actual transaction on the ledger.",
          },
          functionName: {
            type: "string",
            minLength: 1,
            maxLength: 100,
            nullable: false,
          },
          functionArgs: {
            type: "array",
            nullable: false,
            default: [],
            items: {
              type: "string",
              nullable: true,
            },
          },
        },
      },
      RunTransactionResponse: {
        type: "object",
        required: ["functionOutput"],
        properties: {
          functionOutput: {
            type: "string",
            nullable: false,
          },
        },
      },
      DeployContractGoSourceV1Request: {
        type: "object",
        required: ["goSource"],
        properties: {
          goSource: {
            description:
              "The your-smart-contract.go file where the " +
              "functionality of your contract is implemented.",
            $ref: "#/components/schemas/FileBase64",
            nullable: false,
          },
          goMod: {
            description:
              "The go.mod file that declares the dependencies of " +
              "the chaincode go contract that is being deployed as part of " +
              "this request.",
            $ref: "#/components/schemas/FileBase64",
            nullable: false,
          },
          moduleName: {
            description:
              "The go module name that will be used for the go " +
              "compilation process.",
            example: "hello-world-contract",
            type: "string",
            nullable: false,
            minLength: 1,
            maxLength: 255,
          },
          pinnedDeps: {
            type: "array",
            minItems: 0,
            maxItems: 1024,
            items: {
              type: "string",
              nullable: false,
              example: "github.com/hyperledger/fabric@v1.4.8",
            },
          },
          modTidyOnly: {
            description:
              "Indicates to the go chaincode compiler of Cactus " +
              "if it should do an actual go compilation with the contact " +
              "source or if it should just execute the go mod tidy command.",
            type: "boolean",
            nullable: true,
          },
        },
      },
      DeployContractGoSourceV1Response: {
        type: "object",
        required: ["result"],
        properties: {
          result: {
            type: "string",
          },
        },
      },
    },
  },
  paths: {
    [RunTransactionEndpointV1.HTTP_PATH]: {
      [RunTransactionEndpointV1.HTTP_VERB_LOWER_CASE]: {
        operationId: RunTransactionEndpointV1.OPENAPI_OPERATION_ID,
        summary: "Runs a transaction on a Fabric ledger.",
        description: "",
        parameters: [],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/RunTransactionRequest",
              },
            },
          },
        },
        responses: {
          "200": {
            description: "OK",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/RunTransactionResponse",
                },
              },
            },
          },
          "404": {
            description: "",
          },
        },
      },
    },
    [DeployContractGoSourceEndpointV1.HTTP_PATH]: {
      [DeployContractGoSourceEndpointV1.HTTP_VERB_LOWER_CASE]: {
        operationId: DeployContractGoSourceEndpointV1.OPENAPI_OPERATION_ID,
        summary: "Deploys a chaincode contract in the form of a go sources.",
        parameters: [],
        requestBody: {
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/DeployContractGoSourceV1Request",
              },
            },
          },
        },
        responses: {
          "200": {
            description: "OK",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/DeployContractGoSourceV1Response",
                },
              },
            },
          },
          "501": {
            description: "Not implemented",
            content: {
              "text/plain": {
                schema: {
                  type: "object",
                  properties: {
                    message: {
                      type: "string",
                      nullable: false,
                      minLength: 1,
                      maxLength: 2048,
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
};

export async function exportToFileSystemAsJson(): Promise<void> {
  const fnTag = "OpenApiSpec#exportToFileSystemAsJson()";
  const fs = await import("fs");
  const path = await import("path");
  const filename = `openapi-spec.json`;
  const defaultDest = path.join(__dirname, "../json/generated/", filename);
  const destination = process.argv[2] || defaultDest;

  // tslint:disable-next-line: no-console
  console.log(`${fnTag} destination=${destination}`);

  fs.writeFileSync(destination, JSON.stringify(CACTUS_OPEN_API_JSON, null, 4));
}

if (require.main === module) {
  exportToFileSystemAsJson();
}
