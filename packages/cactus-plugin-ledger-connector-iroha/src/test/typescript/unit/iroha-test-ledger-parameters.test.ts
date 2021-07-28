import test, { Test } from "tape";
import { IrohaTestLedger } from "@hyperledger/cactus-test-tooling";

test("constructor does not throw with the default config", async (t: Test) => {
  t.plan(1);

  // No options
  const irohaTestLedger = new IrohaTestLedger();

  t.ok(irohaTestLedger);
  t.end();
});

test("Iroha environment variables passed correctly", async (t: Test) => {
  t.plan(2);
  const simpleEnvVars = [
    "IROHA_POSTGRES_HOST=postgres_1",
    "IROHA_POSTGRES_PORT=5432",
    "IROHA_POSTGRES_USER=postgres",
    "IROHA_POSTGRES_PASSWORD=mysecretpassword",
    "KEY=node0",
  ];

  const irohaOptions = {
    envVars: simpleEnvVars,
  };
  const irohaTestLedger = new IrohaTestLedger(irohaOptions);

  t.equal(irohaTestLedger.envVars, simpleEnvVars);
  t.ok(irohaTestLedger);
  t.end();
});
