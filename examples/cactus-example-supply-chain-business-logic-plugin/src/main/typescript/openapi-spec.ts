import * as OpenAPI from "openapi-types";

import { InsertBambooHarvestEndpoint } from "./business-logic-plugin/web-services/insert-bamboo-harvest-endpoint-constants";
import { InsertBookshelfEndpoint } from "./business-logic-plugin/web-services/insert-bookshelf-endpoint-constants";
import { ListBambooHarvestEndpoint } from "./business-logic-plugin/web-services/list-bamboo-harvest-endpoint-constants";
import { ListBookshelfEndpoint } from "./business-logic-plugin/web-services/list-bookshelf-endpoint-constants";

export const CACTUS_OPEN_API_JSON: OpenAPI.OpenAPIV3.Document = {
  openapi: "3.0.3",
  info: {
    title: "Hyperledger Cactus Example - Supply Chain App",
    description:
      "Demonstrates how a business use case can be satisifed" +
      "with Cactus when multiple distinct ledgers are involved.",
    version: "0.2.0",
  },
  components: {
    schemas: {
      Bookshelf: {
        type: "object",
        required: ["id", "shelfCount", "bambooHarvestId"],
        properties: {
          id: {
            type: "string",
            nullable: false,
            minLength: 1,
            maxLength: 1024,
          },
          shelfCount: {
            description: "The number of shelves the bookshelf comes with.",
            type: "number",
            nullable: false,
            minimum: 1,
            maximum: 255,
          },
          bambooHarvestId: {
            description:
              "The foreign key ID referencing the bamboo harvest that yielded the wood material for the construction of the bookshelf.",
            type: "string",
            minLength: 1,
            maxLength: 1024,
            nullable: false,
          },
        },
      },
      BambooHarvest: {
        type: "object",
        required: ["id", "location", "startedAt", "endedAt", "harvester"],
        properties: {
          id: {
            type: "string",
            nullable: false,
            minLength: 1,
            maxLength: 1024,
          },
          location: {
            type: "string",
            nullable: false,
            minLength: 1,
            maxLength: 1024,
          },
          startedAt: {
            type: "string",
            nullable: false,
            minLength: 1,
            maxLength: 1024,
          },
          endedAt: {
            type: "string",
            nullable: false,
            minLength: 1,
            maxLength: 1024,
          },
          harvester: {
            type: "string",
            nullable: false,
            minLength: 1,
            maxLength: 1024,
          },
        },
      },
      InsertBambooHarvestRequest: {
        type: "object",
        required: ["bambooHarvest"],
        properties: {
          bambooHarvest: {
            $ref: "#/components/schemas/BambooHarvest",
          },
        },
      },
      InsertBambooHarvestResponse: {
        type: "object",
        required: [],
        properties: {
          callOutput: {
            type: "object",
            additionalProperties: true,
          },
          transactionReceipt: {
            type: "object",
            additionalProperties: true,
          },
        },
      },
      ListBambooHarvestResponse: {
        type: "object",
        required: ["data"],
        properties: {
          data: {
            type: "array",
            nullable: false,
            default: [],
            items: {
              $ref: "#/components/schema/BambooHarvest",
              minItems: 0,
              maxItems: 65535,
            },
          },
        },
      },
      InsertBookshelfRequest: {
        type: "object",
        required: ["bookshelf"],
        properties: {
          bookshelf: {
            $ref: "#/components/schemas/Bookshelf",
          },
        },
      },
      InsertBookshelfResponse: {
        type: "object",
        required: [],
        properties: {
          callOutput: {
            type: "object",
            additionalProperties: true,
          },
          transactionReceipt: {
            type: "object",
            additionalProperties: true,
          },
        },
      },
      ListBookshelfResponse: {
        type: "object",
        required: ["data"],
        properties: {
          data: {
            type: "array",
            nullable: false,
            default: [],
            items: {
              $ref: "#/components/schema/Bookshelf",
              minItems: 0,
              maxItems: 65535,
            },
          },
        },
      },
    },
  },
  paths: {
    [InsertBookshelfEndpoint.HTTP_PATH]: {
      [InsertBookshelfEndpoint.HTTP_VERB_LOWER_CASE]: {
        operationId: InsertBookshelfEndpoint.OPENAPI_OPERATION_ID,
        summary: "Inserts the provided Bookshelf entity to the ledger.",
        parameters: [],
        requestBody: {
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/InsertBookshelfRequest",
              },
            },
          },
        },
        responses: {
          "201": {
            description: "CREATED",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/InsertBookshelfResponse",
                },
              },
            },
          },
        },
      },
    },
    [ListBookshelfEndpoint.HTTP_PATH]: {
      [ListBookshelfEndpoint.HTTP_VERB_LOWER_CASE]: {
        operationId: ListBookshelfEndpoint.OPENAPI_OPERATION_ID,
        summary: "Lists all the Bookshelf entities stored on the ledger.",
        parameters: [],
        responses: {
          "200": {
            description: "OK",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/ListBookshelfResponse",
                },
              },
            },
          },
        },
      },
    },
    [InsertBambooHarvestEndpoint.HTTP_PATH]: {
      [InsertBambooHarvestEndpoint.HTTP_VERB_LOWER_CASE]: {
        operationId: InsertBambooHarvestEndpoint.OPENAPI_OPERATION_ID,
        summary: "Inserts the provided BambooHarvest entity to the ledger.",
        parameters: [],
        requestBody: {
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/InsertBambooHarvestRequest",
              },
            },
          },
        },
        responses: {
          "201": {
            description: "CREATED",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/InsertBambooHarvestResponse",
                },
              },
            },
          },
        },
      },
    },
    [ListBambooHarvestEndpoint.HTTP_PATH]: {
      [ListBambooHarvestEndpoint.HTTP_VERB_LOWER_CASE]: {
        operationId: ListBambooHarvestEndpoint.OPENAPI_OPERATION_ID,
        summary: "Lists all the BambooHarvest entities stored on the ledger.",
        parameters: [],
        responses: {
          "200": {
            description: "OK",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/ListBambooHarvestResponse",
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
