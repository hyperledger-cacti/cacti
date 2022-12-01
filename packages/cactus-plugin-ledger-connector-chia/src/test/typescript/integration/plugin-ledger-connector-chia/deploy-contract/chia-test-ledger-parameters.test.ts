import { ChiaTestLedger } from "@hyperledger/cactus-test-tooling";
import "jest-extended";

const testCase = "PluginLedgerConnectorChia:deploy-contract";

describe(testCase, () => {
  test("constructor does not throw with the default config", async () => {
    // No options
    const chiaTestLedger = new ChiaTestLedger();

    expect(chiaTestLedger).toBeTruthy();
  });

  test("Chia environment variables passed correctly", async () => {
    const simpleEnvVars = [
      "CHIA_MINER_ENABLED",
      "CHIA_NETWORK=dev",
      "CHIA_MIN_GAS_PRICE=0",
    ];

    const chiaOptions = {
      envVars: simpleEnvVars,
    };
    const chiaTestLedger = new ChiaTestLedger(chiaOptions);

    expect(chiaTestLedger.envVars).toEqual(simpleEnvVars);
    expect(chiaTestLedger).toBeTruthy();
  });

  test("deploys a Chia Node on the Rinkeby network", async () => {
    const rinkebyNetworkEnvVars = [
      "CHIA_MOUNT_TYPE=bind",
      "CHIA_MINER_ENABLED",
      "CHIA_MINER_COINBASE=fe3b557e8fb62b89f4916b721be55ceb828dbd73",
      "CHIA_SOURCE=/<myvolume/Chia/testnode>",
      "CHIA_NETWORK=rinkeby",
      "CHIA_MIN_GAS_PRICE=0",
      "CHIA_TARGET=/var/lib/Chia hyperledger/Chia:latest",
    ];
    const chiaOptions = {
      envVars: rinkebyNetworkEnvVars,
    };

    const chiaTestLedger = new ChiaTestLedger(chiaOptions);

    expect(chiaTestLedger.envVars).toEqual(rinkebyNetworkEnvVars);
    expect(chiaTestLedger).toBeTruthy();
  });

  test("deploys a Chia Node on the Ropsten network", async () => {
    // const rinkebyNetworkParameters = "--mount type=bind,source=/<myvolume/Chia/testnode>,target=/var/lib/Chia hyperledger/Chia:latest --miner-enabled --miner-coinbase fe3b557e8fb62b89f4916b721be55ceb828dbd73--network=dev --min-gas-price=0";
    const rinkebyNetworkEnvVars = [
      "CHIA_MOUNT_TYPE=bind",
      "CHIA_MINER_ENABLED",
      "CHIA_MINER_COINBASE=fe3b557e8fb62b89f4916b721be55ceb828dbd73",
      "CHIA_SOURCE=/<myvolume/Chia/testnode>",
      "CHIA_NETWORK=ropsten",
      "CHIA_MIN_GAS_PRICE=0",
      "CHIA_TARGET=/var/lib/Chia hyperledger/Chia:latest",
    ];
    const chiaOptions = {
      envVars: rinkebyNetworkEnvVars,
    };

    const chiaTestLedger = new ChiaTestLedger(chiaOptions);

    expect(chiaTestLedger.envVars).toEqual(rinkebyNetworkEnvVars);
    expect(chiaTestLedger).toBeTruthy();
  });

  test("deploys a Chia Node on the Goerli network", async () => {
    // const rinkebyNetworkParameters = "--mount type=bind,source=/<myvolume/Chia/testnode>,target=/var/lib/Chia hyperledger/Chia:latest --miner-enabled --miner-coinbase fe3b557e8fb62b89f4916b721be55ceb828dbd73--network=dev --min-gas-price=0";
    const rinkebyNetworkEnvVars = [
      "CHIA_MOUNT_TYPE=bind",
      "CHIA_MINER_ENABLED",
      "CHIA_MINER_COINBASE=fe3b557e8fb62b89f4916b721be55ceb828dbd73",
      "CHIA_SOURCE=/<myvolume/Chia/testnode>",
      "CHIA_NETWORK=goerli",
      "CHIA_MIN_GAS_PRICE=0",
      "CHIA_TARGET=/var/lib/Chia hyperledger/Chia:latest",
    ];
    const chiaOptions = {
      envVars: rinkebyNetworkEnvVars,
    };

    const chiaTestLedger = new ChiaTestLedger(chiaOptions);

    expect(chiaTestLedger.envVars).toEqual(rinkebyNetworkEnvVars);
    expect(chiaTestLedger).toBeTruthy();
  });

  test("deploys a Chia Node on the Ethereum main network", async () => {
    const ethereumEnvVars = [
      "CHIA_TARGET=/var/lib/Chia",
      "CHIA_PORT=30303:30303",
      "CHIA_RCP_HTTP_ENABLED",
    ];
    const chiaOptions = {
      envVars: ethereumEnvVars,
    };
    const chiaTestLedger = new ChiaTestLedger(chiaOptions);

    expect(chiaTestLedger.envVars).toEqual(ethereumEnvVars);
    expect(chiaTestLedger).toBeTruthy();
  });
});
