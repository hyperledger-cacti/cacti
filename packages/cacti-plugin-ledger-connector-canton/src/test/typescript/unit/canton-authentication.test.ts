import { PluginLedgerConnectorCanton } from "../../../main/typescript/plugin-ledger-connector-canton";
import { MAX_OAUTH_RESPONSE_BYTES } from "../../../main/typescript/canton-wallet-sdk";
import {
  auth,
  createSdkMock,
  createFactoryFixture,
} from "../canton-test-utilities";

jest.setTimeout(30_000);

describe("Canton connector: authentication", () => {
  test.each([
    "https://ledger.example.com:7575",
    new URL("https://ledger.example.com/json-api"),
  ])("accepts the HTTPS ledger URL %s", (ledgerClientUrl) => {
    expect(
      () =>
        new PluginLedgerConnectorCanton({
          instanceId: "canton-connector-test",
          ledgerClientUrl,
          auth,
          pluginRegistry: {} as never,
          allowAllParties: true,
        }),
    ).not.toThrow();
  });

  test.each([
    "http://localhost:7575",
    "http://127.0.0.1:7575",
    "http://127.1:7575",
    "http://[::1]:7575",
  ])(
    "accepts loopback HTTP %s only with the explicit development exception",
    (ledgerClientUrl) => {
      const options = {
        instanceId: "canton-connector-test",
        ledgerClientUrl,
        auth,
        pluginRegistry: {} as never,
        allowAllParties: true,
      };

      expect(() => new PluginLedgerConnectorCanton(options)).toThrow(
        /must use https:/i,
      );
      expect(
        () =>
          new PluginLedgerConnectorCanton({
            ...options,
            allowInsecureLoopbackHttp: true,
          }),
      ).not.toThrow();
    },
  );

  test.each([
    {
      name: "remote plaintext HTTP",
      url: "http://ledger.example.com:7575",
      error: /must use https:/i,
    },
    {
      name: "a loopback-looking remote host",
      url: "http://127.0.0.1.example.com:7575",
      error: /must use https:/i,
    },
    {
      name: "an unsupported protocol",
      url: "ftp://127.0.0.1:7575",
      error: /must use https:/i,
    },
    {
      name: "embedded credentials",
      url: "https://user:secret@ledger.example.com",
      error: /must not embed credentials/i,
    },
    {
      name: "a relative URL",
      url: "/json-api",
      error: /must be an absolute URL/i,
    },
  ])("rejects a ledger URL with $name", ({ url, error }) => {
    expect(
      () =>
        new PluginLedgerConnectorCanton({
          instanceId: "canton-connector-test",
          ledgerClientUrl: url,
          allowInsecureLoopbackHttp: true,
          auth,
          pluginRegistry: {} as never,
          allowAllParties: true,
        }),
    ).toThrow(error);
  });

  test("does not echo URL credentials in the validation error", () => {
    let message = "";
    try {
      new PluginLedgerConnectorCanton({
        instanceId: "canton-connector-test",
        ledgerClientUrl: "https://user:must-not-leak@ledger.example.com",
        auth,
        pluginRegistry: {} as never,
        allowAllParties: true,
      });
    } catch (error: unknown) {
      message = String((error as Error).message);
    }

    expect(message).toMatch(/must not embed credentials/i);
    expect(message).not.toContain("must-not-leak");
  });

  describe("service URLs and credentials", () => {
    function createWithAuth(
      authConfig: unknown,
      create: jest.Mock = jest.fn(),
      allowInsecureLoopbackHttp = false,
    ) {
      return new PluginLedgerConnectorCanton({
        instanceId: "canton-connector-test",
        ledgerClientUrl: "https://ledger.example.com",
        auth: authConfig as never,
        pluginRegistry: {} as never,
        allowAllParties: true,
        allowInsecureLoopbackHttp,
        walletSdkFactory: { create },
      });
    }

    const clientCredentials = {
      clientId: "connector",
      clientSecret: "test-only-secret",
      scope: undefined,
      audience: undefined,
    };

    test("requires HTTPS for the OAuth configuration URL that receives the client secret", () => {
      expect(() =>
        createWithAuth({
          method: "client_credentials",
          configUrl: "http://idp.example.com/.well-known/openid-configuration",
          credentials: clientCredentials,
        }),
      ).toThrow(/options.auth.configUrl must use https:/);
      expect(() =>
        createWithAuth(
          {
            method: "client_credentials",
            configUrl: "http://127.0.0.1:8082/.well-known/openid-configuration",
            credentials: clientCredentials,
          },
          jest.fn(),
          true,
        ),
      ).not.toThrow();
      expect(() =>
        createWithAuth({
          method: "client_credentials",
          configUrl: "https://idp.example.com/.well-known/openid-configuration",
          credentials: clientCredentials,
        }),
      ).not.toThrow();
    });

    test("validates the discovered token endpoint before sending credentials", async () => {
      const { captured, factory } = createFactoryFixture();
      const fetchMock = jest.spyOn(globalThis, "fetch").mockResolvedValue(
        new Response(
          JSON.stringify({
            token_endpoint: "http://attacker.example/token",
          }),
        ),
      );
      try {
        await factory.create({
          auth: {
            method: "client_credentials",
            configUrl:
              "https://idp.example.com/.well-known/openid-configuration",
            credentials: clientCredentials,
          },
          ledgerClientUrl: "https://ledger.example.com",
        });

        await expect(
          captured.accessTokenProvider?.getAccessToken(),
        ).rejects.toThrow(/must use https/i);
        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(fetchMock.mock.calls[0][1]).toMatchObject({ redirect: "error" });
      } finally {
        fetchMock.mockRestore();
      }
    });

    test("does not send credentials to an untrusted HTTPS token origin", async () => {
      const { captured, factory } = createFactoryFixture();
      const fetchMock = jest.spyOn(globalThis, "fetch").mockResolvedValue(
        new Response(
          JSON.stringify({
            token_endpoint: "https://attacker.example/token",
          }),
        ),
      );
      try {
        await factory.create({
          auth: {
            method: "client_credentials",
            configUrl:
              "https://idp.example.com/.well-known/openid-configuration",
            credentials: clientCredentials,
          },
          ledgerClientUrl: "https://ledger.example.com",
        });

        await expect(
          captured.accessTokenProvider?.getAccessToken(),
        ).rejects.toThrow(/outside the configured trusted origins/i);
        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(fetchMock.mock.calls[0][1]).not.toHaveProperty(
          "headers.Authorization",
        );
        expect(JSON.stringify(fetchMock.mock.calls)).not.toContain(
          clientCredentials.clientSecret,
        );
      } finally {
        fetchMock.mockRestore();
      }
    });

    test("sends credentials only to a trusted discovered token origin", async () => {
      const { captured, factory } = createFactoryFixture();
      const credentialsWithReservedCharacters = {
        clientId: "client:id +ü",
        clientSecret: "secret:% +漢",
        scope: "",
        audience: "",
      };
      const fetchMock = jest
        .spyOn(globalThis, "fetch")
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({
              token_endpoint: "https://tokens.example.com/token",
            }),
          ),
        )
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ access_token: "token" })),
        );
      try {
        await factory.create({
          auth: {
            method: "client_credentials",
            configUrl:
              "https://idp.example.com/.well-known/openid-configuration",
            credentials: credentialsWithReservedCharacters,
            allowedTokenEndpointOrigins: ["https://tokens.example.com"],
          },
          ledgerClientUrl: "https://ledger.example.com",
        });

        await expect(
          captured.accessTokenProvider?.getAccessToken(),
        ).resolves.toBe("token");
        expect(fetchMock.mock.calls[1][1]).toMatchObject({
          method: "POST",
          redirect: "error",
          headers: expect.objectContaining({
            Authorization:
              "Basic Y2xpZW50JTNBaWQrJTJCJUMzJUJDOnNlY3JldCUzQSUyNSslMkIlRTYlQkMlQTI=",
          }),
          body: "grant_type=client_credentials",
        });
        expect(
          Buffer.from(
            String(
              (fetchMock.mock.calls[1][1]?.headers as Record<string, string>)
                .Authorization,
            ).slice("Basic ".length),
            "base64",
          ).toString("utf8"),
        ).toBe("client%3Aid+%2B%C3%BC:secret%3A%25+%2B%E6%BC%A2");
      } finally {
        fetchMock.mockRestore();
      }
    });

    test("aborts a stalled OAuth request at its configured deadline", async () => {
      jest.useFakeTimers();
      const { captured, factory } = createFactoryFixture();
      const fetchMock = jest
        .spyOn(globalThis, "fetch")
        .mockImplementation(
          (_url: Parameters<typeof fetch>[0], init?: RequestInit) => {
            return new Promise((_resolve, reject) => {
              init?.signal?.addEventListener("abort", () => {
                reject(new Error("aborted"));
              });
            });
          },
        );
      try {
        await factory.create({
          auth: {
            method: "client_credentials",
            configUrl:
              "https://idp.example.com/.well-known/openid-configuration",
            credentials: clientCredentials,
          },
          ledgerClientUrl: "https://ledger.example.com",
          oauthRequestTimeoutMs: 25,
        });

        const accessToken = captured.accessTokenProvider?.getAccessToken();
        const rejection = expect(accessToken).rejects.toThrow(
          /OAuth discovery request timed out/i,
        );
        await jest.advanceTimersByTimeAsync(25);
        await rejection;
        expect(fetchMock.mock.calls[0][1]?.signal).toMatchObject({
          aborted: true,
        });
        expect(jest.getTimerCount()).toBe(0);
      } finally {
        fetchMock.mockRestore();
        jest.useRealTimers();
      }
    });

    test("uses one deadline for discovery and a stalled token request", async () => {
      jest.useFakeTimers();
      const { captured, factory } = createFactoryFixture();
      const fetchMock = jest
        .spyOn(globalThis, "fetch")
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({
              token_endpoint: "https://idp.example.com/token",
            }),
          ),
        )
        .mockImplementationOnce(
          (_url: Parameters<typeof fetch>[0], init?: RequestInit) => {
            return new Promise((_resolve, reject) => {
              init?.signal?.addEventListener("abort", () => {
                reject(new Error("aborted"));
              });
            });
          },
        );
      try {
        await factory.create({
          auth: {
            method: "client_credentials",
            configUrl:
              "https://idp.example.com/.well-known/openid-configuration",
            credentials: clientCredentials,
          },
          ledgerClientUrl: "https://ledger.example.com",
          oauthRequestTimeoutMs: 25,
        });

        const accessToken = captured.accessTokenProvider?.getAccessToken();
        await jest.advanceTimersByTimeAsync(0);
        expect(fetchMock).toHaveBeenCalledTimes(2);
        expect(fetchMock.mock.calls[0][1]?.signal).toBe(
          fetchMock.mock.calls[1][1]?.signal,
        );
        const rejection = expect(accessToken).rejects.toThrow(
          /OAuth token request timed out/i,
        );
        await jest.advanceTimersByTimeAsync(25);
        await rejection;
        expect(jest.getTimerCount()).toBe(0);
      } finally {
        fetchMock.mockRestore();
        jest.useRealTimers();
      }
    });

    test("releases the connector operation slot after an OAuth timeout so initialization can retry", async () => {
      jest.useFakeTimers();
      const { captured, factory, sdk, sdkCreate } = createFactoryFixture();
      sdkCreate.mockImplementation(async () => {
        await captured.accessTokenProvider?.getAccessToken();
        return sdk;
      });
      const fetchMock = jest
        .spyOn(globalThis, "fetch")
        .mockImplementationOnce(
          (_url: Parameters<typeof fetch>[0], init?: RequestInit) => {
            return new Promise((_resolve, reject) => {
              init?.signal?.addEventListener("abort", () => {
                reject(new Error("aborted"));
              });
            });
          },
        )
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({
              token_endpoint: "https://idp.example.com/token",
            }),
          ),
        )
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ access_token: "token" })),
        );
      const connector = new PluginLedgerConnectorCanton({
        instanceId: "canton-connector-test",
        ledgerClientUrl: "https://ledger.example.com",
        auth: {
          method: "client_credentials",
          configUrl: "https://idp.example.com/.well-known/openid-configuration",
          credentials: clientCredentials,
        },
        pluginRegistry: {} as never,
        allowAllParties: true,
        operationTimeoutMs: 25,
        maxInFlightOperations: 1,
        walletSdkFactory: factory,
      });
      try {
        const firstAttempt = connector.listParties();
        const firstRejection = expect(firstAttempt).rejects.toMatchObject({
          statusCode: 504,
        });
        await jest.advanceTimersByTimeAsync(25);
        await firstRejection;
        await jest.advanceTimersByTimeAsync(0);

        await expect(connector.listParties()).resolves.toEqual({
          parties: ["Alice::1220"],
        });
        expect(fetchMock).toHaveBeenCalledTimes(3);
        expect(sdkCreate).toHaveBeenCalledTimes(2);
      } finally {
        fetchMock.mockRestore();
        jest.useRealTimers();
      }
    });

    test("rejects oversized OAuth responses without fetching a token", async () => {
      const { captured, factory } = createFactoryFixture();
      const fetchMock = jest.spyOn(globalThis, "fetch").mockResolvedValue(
        new Response(
          JSON.stringify({
            token_endpoint: "https://idp.example.com/token",
            padding: "x".repeat(MAX_OAUTH_RESPONSE_BYTES),
          }),
        ),
      );
      try {
        await factory.create({
          auth: {
            method: "client_credentials",
            configUrl:
              "https://idp.example.com/.well-known/openid-configuration",
            credentials: clientCredentials,
          },
          ledgerClientUrl: "https://ledger.example.com",
        });

        await expect(
          captured.accessTokenProvider?.getAccessToken(),
        ).rejects.toThrow(/response exceeded 65536 bytes/i);
        expect(fetchMock).toHaveBeenCalledTimes(1);
      } finally {
        fetchMock.mockRestore();
      }
    });

    test("shares one OAuth exchange between concurrent token requests", async () => {
      const { captured, factory } = createFactoryFixture();
      const fetchMock = jest
        .spyOn(globalThis, "fetch")
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({
              token_endpoint: "https://idp.example.com/token",
            }),
          ),
        )
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ access_token: "token" })),
        );
      try {
        await factory.create({
          auth: {
            method: "client_credentials",
            configUrl:
              "https://idp.example.com/.well-known/openid-configuration",
            credentials: clientCredentials,
          },
          ledgerClientUrl: "https://ledger.example.com",
        });

        await expect(
          Promise.all([
            captured.accessTokenProvider?.getAccessToken(),
            captured.accessTokenProvider?.getAccessToken(),
          ]),
        ).resolves.toEqual(["token", "token"]);
        expect(fetchMock).toHaveBeenCalledTimes(2);
      } finally {
        fetchMock.mockRestore();
      }
    });

    test.each([
      { name: "a missing method", config: { token: "t" } },
      {
        name: "a blank static token",
        config: { method: "static", token: " " },
      },
      {
        name: "self-signed credentials without a client ID",
        config: {
          method: "self_signed",
          issuer: "issuer",
          credentials: { clientSecret: "s" },
        },
      },
      {
        name: "a non-string OAuth scope",
        config: {
          method: "client_credentials",
          configUrl: "https://idp.example.com/.well-known/openid-configuration",
          credentials: { ...clientCredentials, scope: { invalid: true } },
        },
      },
      {
        name: "a non-string OAuth audience",
        config: {
          method: "client_credentials",
          configUrl: "https://idp.example.com/.well-known/openid-configuration",
          credentials: { ...clientCredentials, audience: 42 },
        },
      },
      {
        name: "a non-string self-signed key ID",
        config: {
          method: "self_signed",
          issuer: "issuer",
          credentials: clientCredentials,
          keyId: { invalid: true },
        },
      },
      {
        name: "a blank self-signed key ID",
        config: {
          method: "self_signed",
          issuer: "issuer",
          credentials: clientCredentials,
          keyId: " ",
        },
      },
      {
        name: "an empty client secret",
        config: {
          method: "client_credentials",
          configUrl: "https://idp.example.com/.well-known/openid-configuration",
          credentials: { ...clientCredentials, clientSecret: "" },
        },
      },
    ])("rejects authentication options with $name", ({ config }) => {
      expect(() => createWithAuth(config)).toThrow(/options.auth/);
    });

    test.each([
      { initial: false, mutated: true },
      { initial: true, mutated: false },
    ])(
      "uses the validated transport policy when allowInsecureLoopbackHttp changes from $initial to $mutated",
      async ({ initial, mutated }) => {
        const sdk = createSdkMock();
        const create = jest.fn().mockResolvedValue(sdk);
        const ledgerClientUrl = new URL(
          initial
            ? "http://127.0.0.1:7575/api/"
            : "https://ledger.example.com/api/",
        );
        const authConfig = {
          method: "static" as const,
          token: "original-token",
        };
        const options = {
          instanceId: "canton-connector-test",
          ledgerClientUrl,
          auth: authConfig,
          pluginRegistry: {} as never,
          allowAllParties: true,
          allowInsecureLoopbackHttp: initial,
          walletSdkFactory: { create },
        };
        const connector = new PluginLedgerConnectorCanton(options);

        ledgerClientUrl.protocol = "http:";
        ledgerClientUrl.hostname = "attacker.example";
        (authConfig as { token: string }).token = "replaced-token";
        options.allowInsecureLoopbackHttp = mutated;
        await connector.listParties();

        expect(create).toHaveBeenCalledWith(
          expect.objectContaining({
            ledgerClientUrl: initial
              ? "http://127.0.0.1:7575/api/"
              : "https://ledger.example.com/api/",
            auth: { method: "static", token: "original-token" },
            allowInsecureLoopbackHttp: initial,
            oauthRequestTimeoutMs: 60_000,
          }),
        );
      },
    );
  });
});
