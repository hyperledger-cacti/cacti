import test, { Test } from "tape";
import { PostgresTestContainer } from "@hyperledger/cactus-test-tooling";

test("constructor does not throw with the default config", async (t: Test) => {
  t.plan(1);

  // No options
  const postgresTestContainer = new PostgresTestContainer();

  t.ok(postgresTestContainer);
  t.end();
});

test("Postgres environment variables passed correctly", async (t: Test) => {
  t.plan(2);
  const simpleEnvVars = [
    "POSTGRES_USER=postgres",
    "POSTGRES_PASSWORD=mysecretpassword",
  ];

  const postgresOptions = {
    envVars: simpleEnvVars,
  };
  const postgresTestLedger = new PostgresTestContainer(postgresOptions);

  t.equal(postgresTestLedger.envVars, simpleEnvVars);
  t.ok(postgresTestLedger);
  t.end();
});
