import { OpenAPIV3 } from "openapi-types";
import { DeployContractSolidityBytecodeEndpoint } from "./web-services/deploy-contract-solidity-bytecode-endpoint-constants";
import { RunTransactionEndpoint } from "./web-services/run-transaction-endpoint-constants";
import { InvokeContractEndpoint } from "./web-services/invoke-contract-endpoint-constants";

export const CACTUS_OPEN_API_JSON: OpenAPIV3.Document = {
  openapi: "3.0.3",
  info: {
    title: "Hyperledger Cactus Plugin - Connector Quorum",
    description: "Can perform basic tasks on a Quorum ledger",
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
      Web3SigningCredential: {
        type: "object",
        required: ["type"],
        discriminator: {
          propertyName: "type",
        },
        oneOf: [
          {
            $ref:
              "#/components/schemas/Web3SigningCredentialGethKeychainPassword",
          },
          {
            $ref: "#/components/schemas/Web3SigningCredentialCactusKeychainRef",
          },
          { $ref: "#/components/schemas/Web3SigningCredentialPrivateKeyHex" },
          { $ref: "#/components/schemas/Web3SigningCredentialNone" },
        ],
        properties: {
          type: {
            $ref: "#/components/schemas/Web3SigningCredentialType",
          },
        },
      },
      Web3SigningCredentialGethKeychainPassword: {
        type: "object",
        required: ["type", "ethAccount", "secret"],
        properties: {
          type: {
            $ref: "#/components/schemas/Web3SigningCredentialType",
          },
          ethAccount: {
            type: "string",
            description:
              "The ethereum account (public key) that the credential " +
              " belongs to. Basically the username in the traditional terminology of authentication.",
            minLength: 64,
            maxLength: 64,
            nullable: false,
          },
          secret: {
            type: "string",
            description: "A geth keychain unlock password.",
            minLength: 0,
            maxLength: 65535,
          },
        },
      },
      Web3SigningCredentialCactusKeychainRef: {
        type: "object",
        required: ["type", "ethAccount", "keychainId", "keychainEntryKey"],
        properties: {
          type: {
            $ref: "#/components/schemas/Web3SigningCredentialType",
          },
          ethAccount: {
            type: "string",
            description:
              "The ethereum account (public key) that the credential " +
              " belongs to. Basically the username in the traditional " +
              " terminology of authentication.",
            minLength: 64,
            maxLength: 64,
            nullable: false,
          },
          keychainEntryKey: {
            type: "string",
            description:
              "The key to use when looking up the" +
              " the keychain entry holding the secret pointed to by the " +
              " keychainEntryKey parameter.",
            minLength: 0,
            maxLength: 1024,
          },
          keychainId: {
            type: "string",
            description:
              "The keychain ID to use when looking up the" +
              " the keychain plugin instance that will be used to retrieve" +
              " the secret pointed to by the keychainEntryKey parameter.",
            minLength: 0,
            maxLength: 1024,
          },
        },
      },
      Web3SigningCredentialPrivateKeyHex: {
        type: "object",
        required: ["type", "ethAccount", "secret"],
        properties: {
          type: {
            $ref: "#/components/schemas/Web3SigningCredentialType",
          },
          ethAccount: {
            type: "string",
            description:
              "The ethereum account (public key) that the credential " +
              "belongs to. Basically the username in the traditional terminology of authentication.",
            minLength: 64,
            maxLength: 64,
            nullable: false,
          },
          secret: {
            type: "string",
            description: "The HEX encoded private key of an eth account.",
            minLength: 0,
            maxLength: 65535,
          },
        },
      },
      Web3SigningCredentialNone: {
        type: "object",
        required: ["type"],
        description:
          "Using this denotes that there is no signing " +
          "required because the transaction is pre-signed.",
        properties: {
          type: {
            $ref: "#/components/schemas/Web3SigningCredentialType",
          },
        },
      },
      Web3SigningCredentialType: {
        type: "string",
        enum: [
          "CACTUS_KEYCHAIN_REF",
          "GETH_KEYCHAIN_PASSWORD",
          "PRIVATE_KEY_HEX",
          "NONE",
        ],
      },
      EthContractInvocationType: {
        type: "string",
        enum: ["SEND", "CALL"],
      },
      SolidityContractJsonArtifact: {
        type: "object",
        required: ["contractName"],
        properties: {
          contractName: {
            type: "string",
            nullable: false,
          },
          metadata: {
            type: "string",
            nullable: false,
          },
          bytecode: {
            type: "string",
            nullable: false,
          },
          deployedBytecode: {
            type: "string",
            nullable: false,
          },
          sourceMap: {
            type: "string",
            nullable: false,
          },
          deployedSourceMap: {
            type: "string",
            nullable: false,
          },
          sourcePath: {
            type: "string",
          },
          compiler: {
            type: "object",
            additionalProperties: true,
            properties: {
              name: {
                type: "string",
              },
              version: {
                type: "string",
              },
            },
          },
          functionHashes: {
            type: "object",
            additionalProperties: true,
          },
          gasEstimates: {
            properties: {
              creation: {
                type: "object",
                properties: {
                  codeDepositCost: {
                    type: "string",
                  },
                  executionCost: {
                    type: "string",
                  },
                  totalCost: {
                    type: "string",
                  },
                },
              },
              external: {
                type: "object",
                additionalProperties: true,
              },
            },
          },
        },
      },
      QuorumTransactionConfig: {
        type: "object",
        required: [],
        additionalProperties: true,
        properties: {
          rawTransaction: {
            type: "string",
            nullable: false,
          },
          from: {
            oneOf: [{ type: "string" }, { type: "number" }],
          },
          to: {
            oneOf: [{ type: "string" }],
          },
          value: {
            oneOf: [{ type: "string" }, { type: "number" }],
          },
          gas: {
            oneOf: [{ type: "string" }, { type: "number" }],
          },
          gasPrice: {
            oneOf: [{ type: "string" }, { type: "number" }],
          },
          data: {
            oneOf: [{ type: "string" }],
          },
        },
      },
      Web3TransactionReceipt: {
        type: "object",
        required: [
          "blockHash",
          "blockNumber",
          "transactionHash",
          "transactionIndex",
          "status",
          "from",
          "to",
          "gasUsed",
        ],
        additionalProperties: true,
        properties: {
          status: {
            type: "boolean",
            nullable: false,
          },
          transactionHash: {
            type: "string",
            minLength: 64,
            maxLength: 64,
            pattern: `/^0x([A-Fa-f0-9]{64})$/`,
          },
          transactionIndex: {
            type: "number",
            nullable: false,
          },
          blockHash: {
            type: "string",
            minLength: 64,
            maxLength: 64,
            pattern: `/^0x([A-Fa-f0-9]{64})$/`,
          },
          blockNumber: {
            type: "number",
            nullable: false,
          },
          gasUsed: {
            type: "number",
            nullable: false,
          },
          contractAddress: {
            type: "string",
            nullable: true,
          },
          from: {
            type: "string",
            nullable: false,
          },
          to: {
            type: "string",
            nullable: false,
          },
        },
      },
      RunTransactionRequest: {
        type: "object",
        required: ["web3SigningCredential", "transactionConfig"],
        properties: {
          web3SigningCredential: {
            $ref: "#/components/schemas/Web3SigningCredential",
            nullable: false,
          },
          transactionConfig: {
            $ref: "#/components/schemas/QuorumTransactionConfig",
            nullable: false,
          },
          timeoutMs: {
            type: "number",
            description:
              "The amount of milliseconds to wait for a transaction receipt with the" +
              "hash of the transaction(which indicates successful execution) before" +
              "giving up and crashing.",
            minimum: 0,
            default: 60000,
            nullable: false,
          },
        },
      },
      RunTransactionResponse: {
        type: "object",
        required: ["transactionReceipt"],
        properties: {
          transactionReceipt: {
            $ref: "#/components/schemas/Web3TransactionReceipt",
          },
        },
      },
      DeployContractSolidityBytecodeV1Request: {
        type: "object",
        required: ["bytecode", "web3SigningCredential"],
        properties: {
          web3SigningCredential: {
            $ref: "#/components/schemas/Web3SigningCredential",
            nullable: false,
          },
          bytecode: {
            type: "string",
            nullable: false,
            minLength: 1,
            maxLength: 24576,
            description:
              "See https://ethereum.stackexchange.com/a/47556 regarding the maximum length of the bytecode",
          },
          gas: {
            type: "number",
            nullable: false,
          },
          gasPrice: {
            type: "string",
            nullable: false,
          },
          timeoutMs: {
            type: "number",
            description:
              "The amount of milliseconds to wait for a transaction receipt with the" +
              "address of the contract(which indicates successful deployment) before" +
              "giving up and crashing.",
            minimum: 0,
            default: 60000,
            nullable: false,
          },
        },
      },
      DeployContractSolidityBytecodeV1Response: {
        type: "object",
        required: ["transactionReceipt"],
        properties: {
          transactionReceipt: {
            $ref: "#/components/schemas/Web3TransactionReceipt",
          },
        },
      },
      InvokeContractV1Request: {
        type: "object",
        required: [
          "contractAbi",
          "web3SigningCredential",
          "contractAddress",
          "invocationType",
          "methodName",
          "params",
        ],
        properties: {
          web3SigningCredential: {
            $ref: "#/components/schemas/Web3SigningCredential",
            nullable: false,
          },
          contractAbi: {
            description:
              "The application binary interface of the solidity contract",
            type: "array",
            items: {},
            nullable: false,
            // additionalProperties: true,
          },
          contractAddress: {
            type: "string",
            nullable: false,
          },
          invocationType: {
            $ref: "#/components/schemas/EthContractInvocationType",
            nullable: false,
            description:
              "Indicates wether it is a CALL or a SEND type of " +
              " invocation where only SEND ends up creating an actual transaction on the ledger.",
          },
          methodName: {
            description: "The name of the contract method to invoke.",
            type: "string",
            nullable: false,
            minLength: 1,
            maxLength: 2048,
          },
          params: {
            description:
              "The list of arguments to pass in to the contract method being invoked.",
            type: "array",
            default: [],
            items: {},
          },
          gas: {
            oneOf: [{ type: "string" }, { type: "number" }],
          },
          gasPrice: {
            oneOf: [{ type: "string" }, { type: "number" }],
          },
          timeoutMs: {
            type: "number",
            description:
              "The amount of milliseconds to wait for a transaction receipt before" +
              "giving up and crashing. Only has any effect if the invocation type is SEND",
            minimum: 0,
            default: 60000,
            nullable: false,
          },
        },
      },
      InvokeContractV1Response: {
        type: "object",
        properties: {
          transactionReceipt: {
            $ref: "#/components/schemas/Web3TransactionReceipt",
          },
          callOutput: {},
        },
      },
    },
  },
  paths: {
    [DeployContractSolidityBytecodeEndpoint.HTTP_PATH]: {
      [DeployContractSolidityBytecodeEndpoint.HTTP_VERB_LOWER_CASE]: {
        operationId:
          DeployContractSolidityBytecodeEndpoint.OPENAPI_OPERATION_ID,
        summary: "Deploys the bytecode of a Solidity contract.",
        parameters: [],
        requestBody: {
          content: {
            "application/json": {
              schema: {
                $ref:
                  "#/components/schemas/DeployContractSolidityBytecodeV1Request",
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
                  $ref:
                    "#/components/schemas/DeployContractSolidityBytecodeV1Response",
                },
              },
            },
          },
        },
      },
    },
    [RunTransactionEndpoint.HTTP_PATH]: {
      [RunTransactionEndpoint.HTTP_VERB_LOWER_CASE]: {
        operationId: RunTransactionEndpoint.OPENAPI_OPERATION_ID,
        summary: "Executes a transaction on a quorum ledger",
        parameters: [],
        requestBody: {
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
        },
      },
    },
    [InvokeContractEndpoint.HTTP_PATH]: {
      [InvokeContractEndpoint.HTTP_VERB_LOWER_CASE]: {
        operationId: InvokeContractEndpoint.OPENAPI_OPERATION_ID,
        summary: "Invokeds a contract on a quorum ledger",
        parameters: [],
        requestBody: {
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/InvokeContractV1Request",
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
                  $ref: "#/components/schemas/InvokeContractV1Response",
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
  const packageNameShort = "plugin-ledger-connector-quorum";
  const defaultDest = `cactus-openapi-spec-${packageNameShort}.json`;
  const destination = process.argv[2] || defaultDest;

  // tslint:disable-next-line: no-console
  console.log(`${fnTag} destination=${destination}`);

  fs.writeFileSync(destination, JSON.stringify(CACTUS_OPEN_API_JSON, null, 4));
}

if (require.main === module) {
  exportToFileSystemAsJson();
}
