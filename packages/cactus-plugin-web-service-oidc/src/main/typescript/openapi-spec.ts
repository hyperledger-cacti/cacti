import * as OpenAPI from "express-openapi-validator/dist/framework/types";

export const CACTUS_OPEN_API_JSON: OpenAPI.OpenAPIV3.Document = {
  openapi: "3.0.3",
  info: {
    title: "Hyperledger Cactus Plugin - Open ID Connect (OIDC) Web Service",
    description:
      "A web service plugin that provides authentication and authorization capabilities for a Cactus deployment through the Open ID Connect industry standard.",
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
    schemas: {},
  },
  paths: {
    "/api/v1/plugins/@hyperledger/cactus-plugin-web-service-oidc/.well-known/openid-configuration": {
      get: {
        summary: "Retrieves the Open ID Connect configuration",
        description:
          "Provides the standard behavior as one would expect according to the OIDC specifications",
        responses: {
          "200": {
            description: "OK",
          },
        },
      },
    },
    "/api/v1/plugins/@hyperledger/cactus-plugin-web-service-oidc/auth": {
      get: {
        summary: "Initiates authentication through Open ID Connect",
        description: "",
        parameters: [
          {
            in: "query",
            name: "client_id",
            example: "bar",
            required: true,
            schema: {
              type: "string",
            },
          },
          {
            in: "query",
            name: "response_type",
            example: "id_token",
            required: true,
            schema: {
              type: "string",
            },
          },
          {
            in: "query",
            name: "scope",
            example: "openid+email",
            required: true,
            schema: {
              type: "string",
            },
          },
          {
            in: "query",
            name: "nonce",
            example: "foobar",
            required: false,
            schema: {
              type: "string",
            },
          },
          {
            in: "query",
            name: "prompt",
            example: "login",
            required: false,
            schema: {
              type: "string",
            },
          },
        ],
        responses: {
          "200": {
            description: "OK",
          },
        },
      },
    },
  },
};

export async function exportToFileSystemAsJson(): Promise<void> {
  const fs = await import("fs");
  const destination =
    process.argv[2] || "./cactus-openapi-spec-plugin-web-service-oidc.json";

  // tslint:disable-next-line: no-console
  console.log(
    `OpenApiSpec#exportToFileSystemAsJson() destination=${destination}`
  );
  fs.writeFileSync(destination, JSON.stringify(CACTUS_OPEN_API_JSON, null, 4));
}
