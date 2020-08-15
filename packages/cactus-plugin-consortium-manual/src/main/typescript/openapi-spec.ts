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
        required: ["id", "name", "mainApiHost", "members"],
        properties: {
          id: {
            type: "string",
          },
          name: {
            type: "string",
          },
          mainApiHost: {
            type: "string",
          },
          members: {
            type: "array",
            items: {
              $ref: "#/components/schemas/ConsortiumMember",
            },
            minItems: 1,
            maxItems: 2048,
            nullable: false,
          },
        },
      },
      ConsortiumMember: {
        type: "object",
        required: ["id", "name", "nodes"],
        properties: {
          id: {
            type: "string",
            minLength: 1,
            maxLength: 2048,
            nullable: false,
          },
          name: {
            type: "string",
            minLength: 1,
            maxLength: 2048,
            nullable: false,
          },
          nodes: {
            type: "array",
            nullable: false,
            minItems: 1,
            maxItems: 2048,
            items: {
              $ref: "#/components/schemas/CactusNodeMeta",
            },
          },
        },
      },
      CactusNodeMeta: {
        description: "A Cactus node meta information",
        type: "object",
        required: ["nodeApiHost", "publicKeyPem"],
        properties: {
          nodeApiHost: {
            type: "string",
            minLength: 1,
            maxLength: 1024,
            nullable: false,
          },
          publicKeyPem: {
            description:
              "The PEM encoded public key that was used to " +
              "generate the JWS included in the response (the jws property)",
            type: "string",
            minLength: 1,
            maxLength: 65535,
            nullable: false,
            format:
              "Must only contain the public key, never include here " +
              " the PEM that also contains a private key. See PEM format: " +
              "https://en.wikipedia.org/wiki/Privacy-Enhanced_Mail",
          },
        },
      },
      CactusNode: {
        description:
          "A Cactus node can be a single server, or a set of " +
          "servers behind a loand balancer acting as one.",
        type: "object",
        allOf: [
          {
            $ref: "#/components/schemas/CactusNodeMeta",
          },
          {
            type: "object",
            required: [
              "id",
              "consortiumId",
              "nodeApiHost",
              "memberId",
              "publicKeyPem",
              "plugins",
            ],
            properties: {
              id: {
                type: "string",
                description:
                  "The unique identifier of a Cactus node. Recommended" +
                  " to assign a value to this that is guaranteed to be unique" +
                  " in the whole consortium or better yet, globally anywhere.",
                example: "809a76ba-cfb8-4045-a5c6-ed70a7314c25",
                minLength: 1,
                maxLength: 1024,
                nullable: false,
              },
              consortiumId: {
                type: "string",
                description: "ID of the Cactus Consortium this node is in.",
                example: "3e2670d9-2d14-45bd-96f5-33e2c4b4e3fb",
                minLength: 1,
                maxLength: 1024,
                nullable: false,
              },
              memberId: {
                type: "string",
                description:
                  "ID of the Cactus Consortium member this " +
                  "node is operated by.",
                example: "b3674a28-e442-4feb-b1f3-8cbe46c20e5e",
                minLength: 1,
                maxLength: 1024,
                nullable: false,
              },
              plugins: {
                type: "array",
                nullable: false,
                minItems: 0,
                maxItems: 2048,
                default: [],
                items: {
                  $ref: "#/components/schemas/CactusPlugin",
                },
              },
            },
          },
        ],
      },
      CactusPlugin: {
        type: "object",
        required: ["id"],
        properties: {
          id: {
            type: "string",
            minLength: 1,
            maxLength: 1024,
            nullable: false,
          },
          packageName: {
            type: "string",
            minLength: 1,
            maxLength: 4096,
            nullable: false,
          },
        },
      },
      JWSCompact: {
        description:
          "A JSON Web Signature. See: " +
          "https://tools.ietf.org/html/rfc7515 for info about standard.",
        type: "string",
        minLength: 5,
        maxLength: 65535,
        pattern: `/^[a-zA-Z0-9\-_]+?\.[a-zA-Z0-9\-_]+?\.([a-zA-Z0-9\-_]+)?$/`,
        example:
          "eyJhbGciOiJIUzI1NiJ9.eyJuYW1lIjoiSm9obiBEb2UiLCJpYXQiOjE1MTYyMzkwMjJ9.DOCNCqEMN7CQ_z-RMndiyldljXOk6WFIZxRzNF5Ylg4",
      },
      JWSRecipient: {
        description:
          "A JSON Web Signature. See: " +
          "https://tools.ietf.org/html/rfc7515 for info about standard.",
        type: "object",
        required: ["signature"],
        properties: {
          signature: {
            type: "string",
          },
          // In the generated models this shows up as _protected because it is
          // a reserved keyword in Typescript. Opened an issue here about  this:
          // https://github.com/OpenAPITools/openapi-generator/issues/7100
          protected: {
            type: "string",
          },
          header: {
            type: "object",
            additionalProperties: true,
          },
        },
      },
      JWSGeneral: {
        type: "object",
        required: ["payload", "signatures"],
        properties: {
          payload: {
            type: "string",
            minLength: 1,
            maxLength: 65535,
          },
          signatures: {
            type: "array",
            items: {
              $ref: "#/components/schemas/JWSRecipient",
            },
          },
        },
      },
      GetNodeJwsResponse: {
        type: "object",
        required: ["jws"],
        properties: {
          jws: {
            description: "The JSON Web Signature of the Cactus node.",
            $ref: "#/components/schemas/JWSGeneral",
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
            $ref: "#/components/schemas/JWSGeneral",
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
  const packageNameShort = "plugin-consortium-manual";
  const defaultDest = `cactus-openapi-spec-${packageNameShort}.json`;
  const destination = process.argv[2] || defaultDest;

  // tslint:disable-next-line: no-console
  console.log(`${fnTag} destination=${destination}`);

  fs.writeFileSync(destination, JSON.stringify(CACTUS_OPEN_API_JSON, null, 4));
}
