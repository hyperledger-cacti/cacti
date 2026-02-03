import { CDVC } from "check-dependency-version-consistency";
import esMain from "es-main";
import { exit } from "process";

const PACKAGES_TO_BE_IGNORED_FOR_DEP_CONSISTENCY_CHECK: string[] = [
  "@hyperledger-cacti/cacti-plugin-copm-fabric",
  "@hyperledger-cacti/cacti-plugin-ledger-connector-stellar",
  "@hyperledger-cacti/cactus-api-client",
  "@hyperledger-cacti/cactus-cmd-api-server",
  "@hyperledger-cacti/cactus-common",
  "@hyperledger-cacti/cactus-plugin-consortium-manual",
  "@hyperledger-cacti/cactus-plugin-htlc-eth-besu",
  "@hyperledger-cacti/cactus-plugin-htlc-eth-besu-erc20",
  "@hyperledger-cacti/cactus-plugin-keychain-aws-sm",
  "@hyperledger-cacti/cactus-plugin-keychain-azure-kv",
  "@hyperledger-cacti/cactus-plugin-keychain-google-sm",
  "@hyperledger-cacti/cactus-plugin-keychain-memory",
  "@hyperledger-cacti/cactus-plugin-keychain-memory-wasm",
  "@hyperledger-cacti/cactus-plugin-keychain-vault",
  "@hyperledger-cacti/cactus-plugin-ledger-connector-aries",
  "@hyperledger-cacti/cactus-plugin-ledger-connector-besu",
  "@hyperledger-cacti/cactus-plugin-ledger-connector-cdl",
  "@hyperledger-cacti/cactus-plugin-ledger-connector-corda",
  "@hyperledger-cacti/cactus-plugin-ledger-connector-ethereum",
  "@hyperledger-cacti/cactus-plugin-ledger-connector-fabric",
  "@hyperledger-cacti/cactus-plugin-ledger-connector-iroha2",
  "@hyperledger-cacti/cactus-plugin-ledger-connector-polkadot",
  "@hyperledger-cacti/cactus-plugin-ledger-connector-sawtooth",
  "@hyperledger-cacti/cactus-plugin-ledger-connector-xdai",
  "@hyperledger-cacti/cactus-plugin-persistence-ethereum",
  "@hyperledger-cacti/cactus-plugin-persistence-fabric",
  "@hyperledger-cacti/cactus-plugin-satp-hermes",
  "@hyperledger-cacti/cactus-test-api-client",
  "@hyperledger-cacti/cactus-test-geth-ledger",
  "@hyperledger-cacti/cactus-test-plugin-consortium-manual",
  "@hyperledger-cacti/cactus-test-plugin-htlc-eth-besu",
  "@hyperledger-cacti/cactus-test-plugin-htlc-eth-besu-erc20",
  "@hyperledger-cacti/cactus-test-plugin-ledger-connector-besu",
  "@hyperledger-cacti/cactus-test-plugin-ledger-connector-ethereum",
  "@hyperledger-cacti/cactus-test-tooling",
  "@hyperledger-cacti/cactus-test-verifier-client",
  "@hyperledger-cacti/cactus-plugin-htlc-coordinator-besu",
  "@hyperledger-cacti/cactus-plugin-object-store-ipfs",
  "@hyperledger-cacti/cactus-common-example-server",
  "@hyperledger-cacti/cactus-example-carbon-accounting-backend",
  "@hyperledger-cacti/cactus-example-carbon-accounting-business-logic-plugin",
  "@hyperledger-cacti/cactus-example-carbon-accounting-frontend",
  "@hyperledger-cacti/cactus-example-cbdc-bridging-backend",
  "@hyperledger-cacti/cacti-example-cbdc-bridging-frontend",
  "@hyperledger-cacti/cactus-example-discounted-asset-trade",
  "@hyperledger-cacti/cactus-example-discounted-asset-trade-client",
  "@hyperledger-cacti/cactus-example-electricity-trade",
  "@hyperledger-cacti/cactus-example-supply-chain-backend",
  "@hyperledger-cacti/cactus-example-supply-chain-business-logic-plugin",
  "@hyperledger-cacti/cacti-weaver-protos-js",
  "@hyperledger-cacti/cacti-weaver-besu-cli",
  "@hyperledger-cacti/cacti-weaver-driver-fabric",
  "@hyperledger-cacti/cacti-weaver-fabric-cli",
  "@hyperledger-cacti/cacti-weaver-iin-agent",
  "@hyperledger-cacti/cacti-weaver-besu-simpleasset",
  "@hyperledger-cacti/cacti-weaver-besu-simplestate",
  "@hyperledger-cacti/cacti-weaver-sdk-besu",
  "@hyperledger-cacti/cactus-test-plugin-keychain-memory",
  "@hyperledger-cacti/cactus",
];

export async function checkDependencyVersionConsistency(): Promise<
  [boolean, string[]]
> {
  const errors: string[] = [];
  const cdvc = new CDVC(process.cwd(), {
    ignorePackage: PACKAGES_TO_BE_IGNORED_FOR_DEP_CONSISTENCY_CHECK,
    ignoreDepPattern: ["web3"],
  });
  if (cdvc.hasMismatchingDependencies) {
    errors.push(cdvc.toMismatchSummary());
  }
  return [errors.length === 0, errors];
}

if (esMain(import.meta)) {
  const [success, dependencyMismatchSummary] =
    await checkDependencyVersionConsistency();
  if (!success) {
    console.log(`${dependencyMismatchSummary}`);
    exit(1);
  }
  exit(0);
}
