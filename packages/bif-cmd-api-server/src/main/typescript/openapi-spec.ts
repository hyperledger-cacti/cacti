import * as OpenAPI from "express-openapi-validator/dist/framework/types";

export const BIF_OPEN_API_JSON: OpenAPI.OpenAPIV3.Document = {
  openapi: "3.0.3",
  info: {
    title: "Hyperledger BIF API",
    description: "Interact with a BIF deployment through HTTP.",
    version: "0.0.1",
  },
  servers: [
    {
      url: "https://www.hlbif.win/{basePath}",
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
          bifNodes: {
            type: "array",
            minItems: 1,
            items: {
              $ref: "#/components/schemas/BifNode",
            },
          },
        },
        required: ["id", "name", "configurationEndpoint"],
      },
      BifNode: {
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
    "/api/v1/consortium": {
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
    "/api/v1/consortium/{consortiumId}": {
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
  const destination = process.argv[2] || "./bif-openapi-spec.json";

  // tslint:disable-next-line: no-console
  console.log(
    `OpenApiSpec#exportToFileSystemAsJson() destination=${destination}`
  );
  fs.writeFileSync(destination, JSON.stringify(BIF_OPEN_API_JSON, null, 4));
}
