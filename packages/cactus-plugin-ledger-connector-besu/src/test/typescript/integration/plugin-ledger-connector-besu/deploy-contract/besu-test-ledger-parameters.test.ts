import { BesuTestLedger } from "@hyperledger/cactus-test-tooling";
import "jest-extended";

const testCase = "PluginLedgerConnectorBesu:deploy-contract";

describe(testCase, () => {
  test("constructor does not throw with the default config", async () => {
    // No options
    const besuTestLedger = new BesuTestLedger();

    expect(besuTestLedger).toBeTruthy();
  });

  test("Besu environment variables passed correctly", async () => {
    const simpleEnvVars = [
      "BESU_MINER_ENABLED",
      "BESU_NETWORK=dev",
      "BESU_MIN_GAS_PRICE=0",
    ];

    const besuOptions = {
      envVars: simpleEnvVars,
    };
    const besuTestLedger = new BesuTestLedger(besuOptions);

    expect(besuTestLedger.envVars).toEqual(simpleEnvVars);
    expect(besuTestLedger).toBeTruthy();
  });

  test("deploys a Besu Node on the Rinkeby network", async () => {
    const rinkebyNetworkEnvVars = [
      "BESU_MOUNT_TYPE=bind",
      "BESU_MINER_ENABLED",
      "BESU_MINER_COINBASE=fe3b557e8fb62b89f4916b721be55ceb828dbd73",
      "BESU_SOURCE=/<myvolume/besu/testnode>",
      "BESU_NETWORK=rinkeby",
      "BESU_MIN_GAS_PRICE=0",
      "BESU_TARGET=/var/lib/besu hyperledger/besu:latest",
    ];
    const besuOptions = {
      envVars: rinkebyNetworkEnvVars,
    };

    const besuTestLedger = new BesuTestLedger(besuOptions);

    expect(besuTestLedger.envVars).toEqual(rinkebyNetworkEnvVars);
    expect(besuTestLedger).toBeTruthy();
  });

  test("deploys a Besu Node on the Ropsten network", async () => {
    // const rinkebyNetworkParameters = "--mount type=bind,source=/<myvolume/besu/testnode>,target=/var/lib/besu hyperledger/besu:latest --miner-enabled --miner-coinbase fe3b557e8fb62b89f4916b721be55ceb828dbd73--network=dev --min-gas-price=0";
    const rinkebyNetworkEnvVars = [
      "BESU_MOUNT_TYPE=bind",
      "BESU_MINER_ENABLED",
      "BESU_MINER_COINBASE=fe3b557e8fb62b89f4916b721be55ceb828dbd73",
      "BESU_SOURCE=/<myvolume/besu/testnode>",
      "BESU_NETWORK=ropsten",
      "BESU_MIN_GAS_PRICE=0",
      "BESU_TARGET=/var/lib/besu hyperledger/besu:latest",
    ];
    const besuOptions = {
      envVars: rinkebyNetworkEnvVars,
    };

    const besuTestLedger = new BesuTestLedger(besuOptions);

    expect(besuTestLedger.envVars).toEqual(rinkebyNetworkEnvVars);
    expect(besuTestLedger).toBeTruthy();
  });

  test("deploys a Besu Node on the Goerli network", async () => {
    // const rinkebyNetworkParameters = "--mount type=bind,source=/<myvolume/besu/testnode>,target=/var/lib/besu hyperledger/besu:latest --miner-enabled --miner-coinbase fe3b557e8fb62b89f4916b721be55ceb828dbd73--network=dev --min-gas-price=0";
    const rinkebyNetworkEnvVars = [
      "BESU_MOUNT_TYPE=bind",
      "BESU_MINER_ENABLED",
      "BESU_MINER_COINBASE=fe3b557e8fb62b89f4916b721be55ceb828dbd73",
      "BESU_SOURCE=/<myvolume/besu/testnode>",
      "BESU_NETWORK=goerli",
      "BESU_MIN_GAS_PRICE=0",
      "BESU_TARGET=/var/lib/besu hyperledger/besu:latest",
    ];
    const besuOptions = {
      envVars: rinkebyNetworkEnvVars,
    };

    const besuTestLedger = new BesuTestLedger(besuOptions);

    expect(besuTestLedger.envVars).toEqual(rinkebyNetworkEnvVars);
    expect(besuTestLedger).toBeTruthy();
  });

  test("deploys a Besu Node on the Ethereum main network", async () => {
    const ethereumEnvVars = [
      "BESU_TARGET=/var/lib/besu",
      "BESU_PORT=30303:30303",
      "BESU_RCP_HTTP_ENABLED",
    ];
    const besuOptions = {
      envVars: ethereumEnvVars,
    };
    const besuTestLedger = new BesuTestLedger(besuOptions);

    expect(besuTestLedger.envVars).toEqual(ethereumEnvVars);
    expect(besuTestLedger).toBeTruthy();
  });
});
