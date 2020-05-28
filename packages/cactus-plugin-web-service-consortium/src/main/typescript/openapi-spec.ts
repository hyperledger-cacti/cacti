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
      Consortium: {
        type: "object",
        properties: {
          id: {
            type: "string",
          },
          name: {
            type: "string",
          },
          configurationEndpoint: {
            type: "string",
          },
          cactusNodes: {
            type: "array",
            minItems: 1,
            items: {
              $ref: "#/components/schemas/CactusNode",
            },
          },
        },
        required: ["id", "name", "configurationEndpoint"],
      },
      CactusNode: {
        type: "object",
        properties: {
          host: {
            type: "string",
          },
          publicKey: {
            type: "string",
          },
        },
        required: ["host", "publicKeyHex"],
      },
    },
  },
  paths: {
    "/api/v1/plugins/@hyperledger/cactus-plugin-web-service-consortium/consortium": {
      post: {
        summary:
          "Creates a new consortium from scratch based on the provided parameters.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/Consortium",
              },
            },
          },
        },
        responses: {
          "201": {
            description: "Created",
          },
        },
      },
    },
    "/api/v1/plugins/@hyperledger/cactus-plugin-web-service-consortium/consortium/{consortiumId}": {
      get: {
        summary: "Retrieves a consortium",
        description:
          "The metadata of the consortium (minus the sensitive data)",
        parameters: [
          {
            in: "path",
            name: "consortiumId",
            required: true,
            schema: {
              type: "string",
            },
          },
        ],
        responses: {
          "200": {
            description: "OK",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/Consortium",
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
  const fs = await import("fs");
  const destination =
    process.argv[2] ||
    "./cactus-openapi-spec-plugin-web-service-consortium.json";

  // tslint:disable-next-line: no-console
  console.log(
    `OpenApiSpec#exportToFileSystemAsJson() destination=${destination}`
  );
  fs.writeFileSync(destination, JSON.stringify(CACTUS_OPEN_API_JSON, null, 4));
}
