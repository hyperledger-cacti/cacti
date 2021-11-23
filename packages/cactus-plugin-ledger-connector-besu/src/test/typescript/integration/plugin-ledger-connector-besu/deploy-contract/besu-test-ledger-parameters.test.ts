import test, { Test } from "tape";
import { BesuTestLedger } from "@hyperledger/cactus-test-tooling";

test("constructor does not throw with the default config", async (t: Test) => {
  t.plan(1);

  // No options
  const besuTestLedger = new BesuTestLedger();

  t.ok(besuTestLedger);
  t.end();
});

test("Besu environment variables passed correctly", async (t: Test) => {
  t.plan(2);
  const simpleEnvVars = [
    "BESU_MINER_ENABLED",
    "BESU_NETWORK=dev",
    "BESU_MIN_GAS_PRICE=0",
  ];

  const besuOptions = {
    envVars: simpleEnvVars,
  };
  const besuTestLedger = new BesuTestLedger(besuOptions);

  t.equal(besuTestLedger.envVars, simpleEnvVars);
  t.ok(besuTestLedger);
  t.end();
});

test("deploys a Besu Node on the Rinkeby network", async (t: Test) => {
  t.plan(2);
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

  t.equal(besuTestLedger.envVars, rinkebyNetworkEnvVars);
  t.ok(besuTestLedger);
  t.end();
});

test("deploys a Besu Node on the Ropsten network", async (t: Test) => {
  t.plan(2);
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

  t.equal(besuTestLedger.envVars, rinkebyNetworkEnvVars);
  t.ok(besuTestLedger);
  t.end();
});

test("deploys a Besu Node on the Goerli network", async (t: Test) => {
  t.plan(2);
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

  t.equal(besuTestLedger.envVars, rinkebyNetworkEnvVars);
  t.ok(besuTestLedger);
  t.end();
});

test("deploys a Besu Node on the Ethereum main network", async (t: Test) => {
  t.plan(2);
  const ethereumEnvVars = [
    "BESU_TARGET=/var/lib/besu",
    "BESU_PORT=30303:30303",
    "BESU_RCP_HTTP_ENABLED",
  ];
  const besuOptions = {
    envVars: ethereumEnvVars,
  };
  const besuTestLedger = new BesuTestLedger(besuOptions);

  t.equal(besuTestLedger.envVars, ethereumEnvVars);
  t.ok(besuTestLedger);
  t.end();
});
