import * as OpenAPI from "express-openapi-validator/dist/framework/types";

export const CACTUS_OPEN_API_JSON: OpenAPI.OpenAPIV3.Document = {
  openapi: "3.0.3",
  info: {
    title: "Hyperledger Cactus Plugin - Consortium Web Service",
    description:
      "Manage a Cactus consortium through the APIs. Needs administrative priviliges.",
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
      GetNodeJwsResponse: {
        type: "object",
        required: ["jws"],
        properties: {
          jws: {
            description: "The JSON Web Signature of the Cactus node.",
            $ref:
              "../../../../../cactus-core-api/src/main/json/generated/openapi-spec.json#/components/schemas/JWSGeneral",
            nullable: false,
          },
        },
      },
      GetConsortiumJwsResponse: {
        type: "object",
        required: ["jws"],
        properties: {
          jws: {
            description: "The JSON Web Signature of the Cactus consortium.",
            $ref:
              "../../../../../cactus-core-api/src/main/json/generated/openapi-spec.json#/components/schemas/JWSGeneral",
            nullable: false,
            format: "The general format which is a JSON object, not a string.",
          },
        },
      },
    },
  },
  paths: {
    "/api/v1/plugins/@hyperledger/cactus-plugin-consortium-manual/consortium/jws": {
      get: {
        summary: "Retrieves a consortium JWS",
        description:
          "The JWS asserting the consortium metadata (pub keys and hosts of nodes)",
        parameters: [],
        responses: {
          "200": {
            description: "OK",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/GetConsortiumJwsResponse",
                },
              },
            },
          },
        },
      },
    },
    "/api/v1/plugins/@hyperledger/cactus-plugin-consortium-manual/node/jws": {
      get: {
        summary: "Retrieves the JWT of a Cactus Node",
        parameters: [],
        responses: {
          "200": {
            description: "OK",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/GetNodeJwsResponse",
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
