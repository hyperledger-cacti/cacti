import { CDVC } from "check-dependency-version-consistency";
import esMain from "es-main";
import { exit } from "process";

const PACKAGES_TO_BE_IGNORED_FOR_DEP_CONSISTENCY_CHECK: string[] = [
  "@hyperledger-cacti/cacti-plugin-copm-fabric",
  "@hyperledger/cacti-plugin-ledger-connector-stellar",
  "@hyperledger/cactus-api-client",
  "@hyperledger/cactus-cmd-api-server",
  "@hyperledger/cactus-common",
  "@hyperledger/cactus-plugin-consortium-manual",
  "@hyperledger/cactus-plugin-htlc-eth-besu",
  "@hyperledger/cactus-plugin-htlc-eth-besu-erc20",
  "@hyperledger/cactus-plugin-keychain-aws-sm",
  "@hyperledger/cactus-plugin-keychain-azure-kv",
  "@hyperledger/cactus-plugin-keychain-google-sm",
  "@hyperledger/cactus-plugin-keychain-memory",
  "@hyperledger/cactus-plugin-keychain-memory-wasm",
  "@hyperledger/cactus-plugin-keychain-vault",
  "@hyperledger/cactus-plugin-ledger-connector-aries",
  "@hyperledger/cactus-plugin-ledger-connector-besu",
  "@hyperledger/cactus-plugin-ledger-connector-cdl",
  "@hyperledger/cactus-plugin-ledger-connector-corda",
  "@hyperledger/cactus-plugin-ledger-connector-ethereum",
  "@hyperledger/cactus-plugin-ledger-connector-fabric",
  "@hyperledger/cactus-plugin-ledger-connector-iroha2",
  "@hyperledger/cactus-plugin-ledger-connector-polkadot",
  "@hyperledger/cactus-plugin-ledger-connector-sawtooth",
  "@hyperledger/cactus-plugin-ledger-connector-xdai",
  "@hyperledger/cactus-plugin-persistence-ethereum",
  "@hyperledger/cactus-plugin-persistence-fabric",
  "@hyperledger/cactus-plugin-satp-hermes",
  "@hyperledger/cactus-test-api-client",
  "@hyperledger/cactus-test-geth-ledger",
  "@hyperledger/cactus-test-plugin-consortium-manual",
  "@hyperledger/cactus-test-plugin-htlc-eth-besu",
  "@hyperledger/cactus-test-plugin-htlc-eth-besu-erc20",
  "@hyperledger/cactus-test-plugin-ledger-connector-besu",
  "@hyperledger/cactus-test-plugin-ledger-connector-ethereum",
  "@hyperledger/cactus-test-tooling",
  "@hyperledger/cactus-test-verifier-client",
  "@hyperledger/cactus-plugin-htlc-coordinator-besu",
  "@hyperledger/cactus-plugin-object-store-ipfs",
  "@hyperledger/cactus-common-example-server",
  "@hyperledger/cactus-example-carbon-accounting-backend",
  "@hyperledger/cactus-example-carbon-accounting-business-logic-plugin",
  "@hyperledger/cactus-example-carbon-accounting-frontend",
  "@hyperledger/cactus-example-cbdc-bridging-backend",
  "@hyperledger/cacti-example-cbdc-bridging-frontend",
  "@hyperledger/cactus-example-discounted-asset-trade",
  "@hyperledger/cactus-example-discounted-asset-trade-client",
  "@hyperledger/cactus-example-electricity-trade",
  "@hyperledger/cactus-example-supply-chain-backend",
  "@hyperledger/cactus-example-supply-chain-business-logic-plugin",
  "@hyperledger/cacti-weaver-protos-js",
  "@hyperledger/cacti-weaver-besu-cli",
  "@hyperledger/cacti-weaver-driver-fabric",
  "@hyperledger/cacti-weaver-fabric-cli",
  "@hyperledger/cacti-weaver-iin-agent",
  "@hyperledger/cacti-weaver-besu-simpleasset",
  "@hyperledger/cacti-weaver-besu-simplestate",
  "@hyperledger/cacti-weaver-sdk-besu",
  "@hyperledger/cactus-test-plugin-keychain-memory",
  "@hyperledger/cactus",
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
