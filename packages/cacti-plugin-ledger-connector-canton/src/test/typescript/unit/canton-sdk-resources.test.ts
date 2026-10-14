import { auth, createFactoryFixture } from "../canton-test-utilities";
import type { ICantonWalletSdk } from "../../../main/typescript/canton-wallet-sdk";

describe("Canton factory SDK resource ownership", () => {
  const options = { auth, ledgerClientUrl: "http://127.0.0.1:7575" };

  test("disposal is idempotent and revokes retained provider credentials", async () => {
    const { factory, sdk, sdkCreate, captured } = createFactoryFixture();
    sdk.dispose = jest.fn().mockResolvedValue(undefined);
    const wrapper = await factory.create(options);
    const disposal = wrapper.dispose?.();
    expect(wrapper.dispose?.()).toBe(disposal);
    await disposal;
    expect(sdk.dispose).toHaveBeenCalledTimes(1);
    expect(() => wrapper.ledger).toThrow("disposed");
    await expect(
      captured.accessTokenProvider?.getAccessToken(),
    ).rejects.toThrow("disposed");
    const provider = sdkCreate.mock.calls[0][0].ledgerProvider;
    await expect(
      provider.request({
        method: "ledgerApi",
        params: {
          requestMethod: "get",
          resource: "/v2/parties",
        },
      }),
    ).rejects.toThrow("disposed");
  });

  test("failed SDK initialization also revokes its credential provider", async () => {
    const { factory, sdkCreate, captured } = createFactoryFixture();
    sdkCreate.mockRejectedValueOnce(new Error("initialization failed"));
    await expect(factory.create(options)).rejects.toThrow(
      "initialization failed",
    );
    await expect(
      captured.accessTokenProvider?.getAccessToken(),
    ).rejects.toThrow("disposed");
  });

  test("initialization cannot resurrect resources after abort", async () => {
    const { factory, sdk, sdkCreate, captured } = createFactoryFixture();
    const controller = new AbortController();
    let resolveSdk!: (sdk: ICantonWalletSdk) => void;
    const enteredSdk = new Promise<void>((resolve) => {
      sdkCreate.mockImplementationOnce(() => {
        resolve();
        return new Promise<ICantonWalletSdk>((sdkResolve) => {
          resolveSdk = sdkResolve;
        });
      });
    });
    sdk.dispose = jest.fn().mockResolvedValue(undefined);
    const initialization = factory.create({
      ...options,
      signal: controller.signal,
    });
    const rejection = expect(initialization).rejects.toThrow("cancelled");
    await enteredSdk;
    controller.abort();
    await expect(
      captured.accessTokenProvider?.getAccessToken(),
    ).rejects.toThrow("disposed");
    resolveSdk(sdk);
    await rejection;
    expect(sdk.dispose).toHaveBeenCalledTimes(1);
  });

  test("an already aborted initialization never creates SDK resources", async () => {
    const { factory, sdkCreate } = createFactoryFixture();
    const controller = new AbortController();
    controller.abort();
    await expect(
      factory.create({ ...options, signal: controller.signal }),
    ).rejects.toThrow("cancelled");
    expect(sdkCreate).not.toHaveBeenCalled();
  });

  test("aborting SDK initialization cancels its pending OAuth discovery", async () => {
    const { factory, sdk, sdkCreate, captured } = createFactoryFixture();
    const lifecycle = new AbortController();
    let requestSignal: AbortSignal | undefined;
    let began!: () => void;
    const started = new Promise<void>((resolve) => {
      began = resolve;
    });
    const fetch = jest
      .spyOn(globalThis, "fetch")
      .mockImplementation((_url: RequestInfo | URL, init?: RequestInit) => {
        requestSignal = init?.signal ?? undefined;
        began();
        return new Promise<Response>((_resolve, reject) => {
          requestSignal?.addEventListener(
            "abort",
            () => reject(new Error("cancelled")),
            { once: true },
          );
        });
      });
    sdkCreate.mockImplementationOnce(async () => {
      await captured.accessTokenProvider?.getAccessToken();
      return sdk;
    });
    try {
      const initialization = factory.create({
        auth: {
          method: "client_credentials",
          configUrl: "https://idp.example.com/.well-known/openid-configuration",
          credentials: {
            clientId: "test-client",
            clientSecret: "test-only-secret",
            audience: undefined,
            scope: undefined,
          },
        },
        ledgerClientUrl: "https://ledger.example.com",
        signal: lifecycle.signal,
      });
      const rejection = expect(initialization).rejects.toThrow();
      await started;
      lifecycle.abort();
      await rejection;
      expect(requestSignal?.aborted).toBe(true);
    } finally {
      fetch.mockRestore();
    }
  });
});
