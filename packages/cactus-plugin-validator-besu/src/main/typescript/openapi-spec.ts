import * as OpenAPI from "express-openapi-validator/dist/framework/types";

export const CACTUS_OPEN_API_JSON: OpenAPI.OpenAPIV3.Document = {
  openapi: "3.0.3",
  info: {
    title: "Hyperledger Cactus Plugin - Validator Besu Web Service",
    description:
      "Obtain signatures of ledger state from Cactus nodes through the API .",
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
      SignTransactionRequest: {
        type: "object",
        required: ["transactionHash"],
        properties: {
          transactionHash: {
            description:
              "The transaction hash of ledger will be used to fetch the contain.",
            type: "string",
            minLength: 0,
            maxLength: 2048,
            nullable: false,
          },
        },
      },
      SignTransactionResponse: {
        type: "object",
        required: ["signature"],
        properties: {
          signature: {
            description:
              "The signatures of ledger from the corresponding transaction hash.",
            type: "string",
            minLength: 0,
            maxLength: 2048,
            nullable: false,
          },
        },
      },
    },
  },
  paths: {
    "/api/v1/plugins/@hyperledger/cactus-plugin-validator-besu/sign-transaction": {
      post: {
        summary:
          "Obtain signatures of ledger from the corresponding transaction hash.",
        description:
          "Obtain signatures of ledger from the corresponding transaction hash.",
        parameters: [],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/SignTransactionRequest",
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
                  $ref: "#/components/schemas/SignTransactionResponse",
                },
              },
            },
          },
          "404": {
            description:
              "Not able to find the corresponding tranaction from the transaction hash",
          },
        },
      },
    },
  },
};

export async function exportToFileSystemAsJson(): Promise<void> {
  const fnTag = "OpenApiSpec#exportToFileSystemAsJson()";
  const fs = await import("fs");
  const packageNameShort = "plugin-validator-besu";
  const defaultDest = `cactus-openapi-spec-${packageNameShort}.json`;
  const destination = process.argv[2] || defaultDest;

  // tslint:disable-next-line: no-console
  console.log(`${fnTag} destination=${destination}`);

  fs.writeFileSync(destination, JSON.stringify(CACTUS_OPEN_API_JSON, null, 4));
}
