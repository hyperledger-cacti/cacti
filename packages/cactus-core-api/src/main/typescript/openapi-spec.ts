import { OpenAPIV3 } from "openapi-types";

export const CACTUS_OPEN_API_JSON: OpenAPIV3.Document = {
  openapi: "3.0.3",
  info: {
    title: "Hyperledger Core API",
    description:
      "Contains/describes the core API types for Cactus. Does " +
      "not describe actual endpoints on its own as this is left to the " +
      "implementing plugins who can import and re-use commonLy needed type " +
      "definitions from this specification. One example of said commonly " +
      "used type definitons would be the types related to consortium " +
      "management, cactus nodes, ledgers, etc..",
    version: "0.2.0",
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
      Ledger: {
        type: "object",
        required: ["id", "ledgerType"],
        properties: {
          id: {
            description:
              "String that uniquely identifies a ledger within a" +
              " Cactus consortium so that transactions can be routed to the" +
              " correct ledger.",
            type: "string",
            nullable: false,
            minLength: 1,
            maxLength: 128,
          },
          ledgerType: {
            $ref: "#/components/schemas/LedgerType",
            nullable: false,
          },
          operator: {
            description:
              "The consortium member who is operating the ledger. " +
              "Defined as an optional property in case the ledger is a " +
              "permissionless one such as the Bitcoin or Ethereum mainnets.",
            $ref: "#/components/schemas/ConsortiumMember",
          },
        },
      },
      LedgerType: {
        description:
          "Enumerates the different ledger vendors and their " +
          "major versions encoded within the name of the LedgerType. " +
          `For example "BESU_1X" involves all of the [1.0.0;2.0.0) where ` +
          "1.0.0 is included and anything up until, but not 2.0.0. See: " +
          "https://stackoverflow.com/a/4396303/698470 for further explanation.",
        type: "string",
        enum: [
          "BESU_1X",
          "BESU_2X",
          "BURROW_0X",
          "CORDA_4X",
          "FABRIC_14X",
          "FABRIC_2",
          "QUORUM_2X",
          "SAWTOOTH_1X",
        ],
      },
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
              $ref: "#/components/schemas/CactusNode",
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
              "ledgers",
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
              ledgers: {
                description:
                  "Stores an array of Ledger entities that are " +
                  "reachable (routable) via this Cactus Node. This " +
                  "information is used by the client side SDK API client to " +
                  "figure out at runtime where to send API requests that are " +
                  "specific to a certain ledger such as requests to execute " +
                  "transactions.",
                type: "array",
                nullable: false,
                minItems: 0,
                maxItems: 2048,
                default: [],
                items: {
                  $ref: "#/components/schemas/Ledger",
                },
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
    },
  },
  paths: {},
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
