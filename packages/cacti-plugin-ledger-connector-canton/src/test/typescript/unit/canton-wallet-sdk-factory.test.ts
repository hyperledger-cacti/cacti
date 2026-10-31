import { auth, createFactoryFixture } from "../canton-test-utilities";

jest.setTimeout(30_000);

describe("Canton connector: wallet-sdk-factory", () => {
  test("does not forward Wallet SDK context or messages to Cacti logs", async () => {
    const { cactiLog, captured, factory } = createFactoryFixture();

    await factory.create({
      auth,
      ledgerClientUrl: "http://127.0.0.1:7575",
    });
    expect(captured.sdkLog).toBeDefined();
    captured.sdkLog?.(
      "info",
      { clientSecret: "must-not-be-logged", response: { token: "secret" } },
      "Bearer another-secret",
    );

    expect(cactiLog.info).toHaveBeenCalledWith(
      "Canton Wallet SDK emitted a log entry.",
    );
    expect(JSON.stringify(cactiLog.info.mock.calls)).not.toContain("secret");
  });

  test("gives the ledger client and token provider a severity-only logger", async () => {
    const { cactiLog, captured, factory, sdkCreate } = createFactoryFixture();

    await factory.create({
      auth,
      ledgerClientUrl: "http://127.0.0.1:7575",
    });

    expect(captured.clientOptions?.baseUrl.href).toBe("http://127.0.0.1:7575/");
    expect(sdkCreate).toHaveBeenCalledWith(
      expect.objectContaining({ ledgerProvider: expect.anything() }),
    );
    expect(sdkCreate.mock.calls[0][0]).not.toHaveProperty("auth");
    const clientLogger = captured.clientOptions?.logger.child({
      component: "LedgerClient",
    }) as Record<string, (...args: unknown[]) => unknown>;
    clientLogger.warn("Error in postWithRetry for path /v2/commands");
    clientLogger.debug(JSON.stringify({ token: "must-not-leak" }));
    captured.authLogger?.error({ clientSecret: "must-not-leak" });

    expect(cactiLog.warn).toHaveBeenCalledWith(
      "Canton Wallet SDK emitted a log entry.",
    );
    expect(cactiLog.debug).toHaveBeenCalledWith(
      "Canton Wallet SDK emitted a log entry.",
    );
    expect(cactiLog.error).toHaveBeenCalledWith(
      "Canton Wallet SDK emitted a log entry.",
    );
    const allCalls = JSON.stringify(
      Object.values(cactiLog).map((fn) => fn.mock.calls),
    );
    expect(allCalls).not.toContain("must-not-leak");
    expect(allCalls).not.toContain("/v2/commands");
  });

  test("routes ledger API requests through the injected ledger client", async () => {
    const { captured, factory, sdkCreate } = createFactoryFixture();
    await factory.create({ auth, ledgerClientUrl: "http://127.0.0.1:7575" });
    const provider = sdkCreate.mock.calls[0][0].ledgerProvider as {
      request(args: unknown): Promise<unknown>;
    };
    const client = captured.ledgerClient as Record<string, jest.Mock>;
    client.getWithRetry.mockResolvedValue({ offset: 1 });
    client.postWithRetry.mockResolvedValue({ updateId: "u" });

    await expect(
      provider.request({
        method: "ledgerApi",
        params: {
          requestMethod: "get",
          resource: "/v2/state/ledger-end",
          query: {},
        },
      }),
    ).resolves.toEqual({ offset: 1 });
    await provider.request({
      method: "ledgerApi",
      params: {
        requestMethod: "post",
        resource: "/v2/commands/submit-and-wait",
        body: { commandId: "c" },
      },
    });

    expect(client.getWithRetry).toHaveBeenCalledWith(
      "/v2/state/ledger-end",
      undefined,
      { query: {} },
    );
    expect(client.postWithRetry).toHaveBeenCalledWith(
      "/v2/commands/submit-and-wait",
      { commandId: "c" },
      undefined,
      {},
      { headers: { "Content-Type": "application/json" } },
    );
    client.patchWithRetry.mockResolvedValue({ ok: true });
    await provider.request({
      method: "ledgerApi",
      params: {
        requestMethod: "patch",
        resource: "/v2/users/u",
        path: { "user-id": "u" },
      },
    });
    expect(client.patchWithRetry).toHaveBeenCalledWith(
      "/v2/users/u",
      {},
      undefined,
      { path: { "user-id": "u" } },
    );

    const dar = Buffer.from([1, 2, 3]);
    await provider.request({
      method: "ledgerApi",
      params: {
        requestMethod: "post",
        resource: "/v2/packages",
        body: dar,
        headers: { "Content-Type": "application/octet-stream" },
      },
    });
    const [, body, , , additionalOptions] =
      client.postWithRetry.mock.calls[
        client.postWithRetry.mock.calls.length - 1
      ];
    expect(body).toBe(dar);
    expect(additionalOptions.headers).toEqual({
      "Content-Type": "application/octet-stream",
    });
    expect(additionalOptions.bodySerializer(dar)).toBe(dar);

    await expect(
      provider.request({
        method: "ledgerApi",
        params: { requestMethod: "delete", resource: "/v2/users/u" },
      }),
    ).rejects.toThrow(/Unsupported request method: delete/);
    await expect(provider.request({ method: "unknown" })).rejects.toThrow(
      /Unsupported method/,
    );
  });

  const authenticatedUserRequest = {
    method: "ledgerApi",
    params: {
      requestMethod: "get",
      resource: "/v2/authenticated-user",
      query: {},
    },
  };

  test("revalidates the token's user ID on the ledger for INVALID_TOKEN", async () => {
    const { captured, factory, sdkCreate } = createFactoryFixture();
    await factory.create({ auth, ledgerClientUrl: "http://127.0.0.1:7575" });
    const provider = sdkCreate.mock.calls[0][0].ledgerProvider as {
      request(args: unknown): Promise<unknown>;
    };
    const client = captured.ledgerClient as Record<string, jest.Mock>;
    client.getWithRetry
      .mockRejectedValueOnce({ code: "INVALID_TOKEN", message: "Changed text" })
      .mockResolvedValueOnce({
        user: { id: "ledger-api-user", isDeactivated: false },
      });
    captured.tokenProvider?.getAuthContext.mockResolvedValue({
      userId: "ledger-api-user",
    });
    await expect(provider.request(authenticatedUserRequest)).resolves.toEqual({
      user: { id: "ledger-api-user", isDeactivated: false },
    });
    expect(client.getWithRetry).toHaveBeenNthCalledWith(
      2,
      "/v2/users/{user-id}",
      undefined,
      { path: { "user-id": "ledger-api-user" } },
    );
  });

  test("does not turn an invalid token into a successful authenticated response", async () => {
    const { captured, factory, sdkCreate } = createFactoryFixture();
    await factory.create({ auth, ledgerClientUrl: "http://127.0.0.1:7575" });
    const provider = sdkCreate.mock.calls[0][0].ledgerProvider;
    const invalidToken = { code: "INVALID_TOKEN" };
    captured.ledgerClient?.getWithRetry.mockRejectedValue(invalidToken);

    await expect(provider.request(authenticatedUserRequest)).rejects.toBe(
      invalidToken,
    );
    expect(captured.ledgerClient?.getWithRetry).toHaveBeenCalledTimes(2);
  });

  test.each([undefined, ""])(
    "rejects a missing token user ID (%p)",
    async (userId) => {
      const { captured, factory, sdkCreate } = createFactoryFixture();
      await factory.create({ auth, ledgerClientUrl: "http://127.0.0.1:7575" });
      const provider = sdkCreate.mock.calls[0][0].ledgerProvider;
      const invalidToken = { code: "INVALID_TOKEN" };
      captured.ledgerClient?.getWithRetry.mockRejectedValue(invalidToken);
      captured.tokenProvider?.getAuthContext.mockResolvedValue({ userId });

      await expect(provider.request(authenticatedUserRequest)).rejects.toBe(
        invalidToken,
      );
      expect(captured.ledgerClient?.getWithRetry).toHaveBeenCalledTimes(1);
    },
  );

  test.each([
    { resource: "/v2/parties", error: { code: "INVALID_TOKEN" } },
    {
      resource: "/v2/authenticated-user",
      error: { code: "PERMISSION_DENIED" },
    },
    {
      resource: "/v2/authenticated-user",
      error: new Error("The submitted request is missing a user-id"),
    },
  ])(
    "does not use the fallback for $resource and unrelated errors",
    async ({ resource, error }) => {
      const { captured, factory, sdkCreate } = createFactoryFixture();
      await factory.create({ auth, ledgerClientUrl: "http://127.0.0.1:7575" });
      const provider = sdkCreate.mock.calls[0][0].ledgerProvider;
      captured.ledgerClient?.getWithRetry.mockRejectedValue(error);

      await expect(
        provider.request({
          ...authenticatedUserRequest,
          params: { ...authenticatedUserRequest.params, resource },
        }),
      ).rejects.toBe(error);
      expect(captured.tokenProvider?.getAuthContext).not.toHaveBeenCalled();
      expect(captured.ledgerClient?.getWithRetry).toHaveBeenCalledTimes(1);
    },
  );
});
