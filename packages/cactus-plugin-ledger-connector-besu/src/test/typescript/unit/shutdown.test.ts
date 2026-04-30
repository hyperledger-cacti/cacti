
import { PluginLedgerConnectorBesu } from "../../../main/typescript/public-api";
import { PluginRegistry } from "@hyperledger/cactus-core";
import { v4 as uuidv4 } from "uuid";
import Web3 from "web3";
import { ReplaySubject } from "rxjs";

jest.mock("web3");

describe("PluginLedgerConnectorBesu shutdown unit tests", () => {
  const rpcApiHttpHost = "http://127.0.0.1:8000";
  const rpcApiWsHost = "ws://127.0.0.1:9000";
  const instanceId = uuidv4();
  const pluginRegistry = new PluginRegistry({ plugins: [] });

  let connector: PluginLedgerConnectorBesu;
  let mockWebsocketProvider: any;

  beforeEach(() => {
    mockWebsocketProvider = {
      disconnect: jest.fn(),
    };

    (Web3.providers.WebsocketProvider as jest.Mock).mockReturnValue(mockWebsocketProvider);

    connector = new PluginLedgerConnectorBesu({
      rpcApiHttpHost,
      rpcApiWsHost,
      instanceId,
      pluginRegistry,
      logLevel: "INFO",
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test("shutdown() completes txSubject and disconnects web3Provider", async () => {
    const txSubjectObservable = connector.getTxSubjectObservable();
    const completeSpy = jest.fn();
    
    txSubjectObservable.subscribe({
      complete: completeSpy,
    });

    await connector.shutdown();

    expect(mockWebsocketProvider.disconnect).toHaveBeenCalledTimes(1);
    expect(completeSpy).toHaveBeenCalledTimes(1);
  });

  test("shutdown() is robust against disconnect failures", async () => {
    mockWebsocketProvider.disconnect.mockImplementation(() => {
      throw new Error("Disconnect failed");
    });

    const txSubjectObservable = connector.getTxSubjectObservable();
    const completeSpy = jest.fn();
    
    txSubjectObservable.subscribe({
      complete: completeSpy,
    });

    // Should not throw
    await expect(connector.shutdown()).resolves.not.toThrow();

    expect(mockWebsocketProvider.disconnect).toHaveBeenCalledTimes(1);
    expect(completeSpy).toHaveBeenCalledTimes(1);
  });
});
