import * as OpenAPI from "express-openapi-validator/dist/framework/types";

export const CACTUS_OPEN_API_JSON: OpenAPI.OpenAPIV3.Document = {
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
      DeployContractGoBinV1Request: {
        type: "object",
        required: ["file"],
        properties: {
          file: {
            type: "array",
            items: {
              type: "string",
              format: "binary",
            },
          },
        },
      },
      DeployContractGoBinV1Response: {
        type: "object",
        required: [],
        properties: {},
      },
    },
  },
  paths: {
    "/api/v1/plugins/@hyperledger/cactus-plugin-ledger-connector-fabric/deploy-contract-go-bin": {
      post: {
        summary: "Deploys a chaincode contract in the form of a go binary",
        parameters: [],
        requestBody: {
          content: {
            "multipart/form-data": {
              schema: {
                $ref: "#/components/schemas/DeployContractGoBinV1Request",
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
                  $ref: "#/components/schemas/DeployContractGoBinV1Response",
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
  const packageNameShort = "plugin-ledger-connector-fabric";
  const defaultDest = `cactus-openapi-spec-${packageNameShort}.json`;
  const destination = process.argv[2] || defaultDest;

  // tslint:disable-next-line: no-console
  console.log(`${fnTag} destination=${destination}`);

  fs.writeFileSync(destination, JSON.stringify(CACTUS_OPEN_API_JSON, null, 4));
}
