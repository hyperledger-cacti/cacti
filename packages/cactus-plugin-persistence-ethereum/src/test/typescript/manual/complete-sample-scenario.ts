/**
 * Complete example of setting up and using the persistence plugin. This script will:
 *  - Start the test Ethereum ledger.
 *  - Deploy an ERC721 contract and mint some tokens.
 *  - Begin monitoring ledger changes. The persistence plugin will detect the ERC721 tokens,
 *    as well as all blocks and transactions on the ledger.
 *
 * Each step is commented in detail to serve as a tutorial.
 */

import {
  LoggerProvider,
  Logger,
  LogLevelDesc,
} from "@hyperledger/cactus-common";
import {
  GethTestLedger,
  WHALE_ACCOUNT_PRIVATE_KEY,
} from "@hyperledger/cactus-test-geth-ledger";
import Web3, { ContractAbi, TransactionReceipt } from "web3";
import { Web3Account } from "web3-eth-accounts";
import TestERC721ContractJson from "../../solidity/TestERC721.json";
import { cleanupApiServer, setupApiServer } from "./common-setup-methods";

//////////////////////////////////
// Constants
//////////////////////////////////

const testLogLevel: LogLevelDesc = "info";

// Logger setup
const log: Logger = LoggerProvider.getOrCreate({
  label: "complete-sample-scenario",
  level: testLogLevel,
});

let ledger: GethTestLedger;
let web3: Web3;
let constTestAcc: Web3Account;
let defaultAccountAddress: string;
const constTestAccBalance = 2 * 10e18;

// Geth environment
const containerImageName = "ghcr.io/hyperledger/cacti-geth-all-in-one";
const containerImageVersion = "2023-07-27-2a8c48ed6";

//////////////////////////////////
// Environment Setup
//////////////////////////////////

/**
 * Create and start the test ledger to be used by sample scenario.
 *
 * @returns `[rpcApiHttpHost, rpcApiWsHost]`
 */
async function setupTestLedger(): Promise<string> {
  log.info(`Start Ledger ${containerImageName}:${containerImageVersion}...`);
  ledger = new GethTestLedger({
    containerImageName,
    containerImageVersion,
  });
  await ledger.start();
  const rpcApiWsHost = await ledger.getRpcApiWebSocketHost();
  log.info(`Ledger started, WS RPC: ${rpcApiWsHost}`);
  return rpcApiWsHost;
}

/**
 * Stop the test ledger containers (if created).
 * Remember to run it before exiting!
 */
export async function cleanupTestLedger() {
  if (ledger) {
    log.info("Stop the ethereum ledger...");
    await ledger.stop();
    await ledger.destroy();
  }
}

/**
 * Called when exiting this script
 */
async function cleanupEnvironment() {
  await cleanupApiServer();
  await cleanupTestLedger();
}

//////////////////////////////////
// Helper Methods
//////////////////////////////////

/**
 * Deploy ERC721 contract to the test leger.
 */
async function deploySmartContract(
  abi: ContractAbi,
  bytecode: string,
  args?: unknown[],
): Promise<Required<TransactionReceipt>> {
  try {
    const txReceipt = await ledger.deployContract(abi, "0x" + bytecode, args);
    log.debug("deploySmartContract txReceipt:", txReceipt);
    log.debug(
      "Deployed test smart contract, TX on block number",
      txReceipt.blockNumber,
    );
    // Force response without optional fields
    return txReceipt as Required<TransactionReceipt>;
  } catch (error) {
    log.error("deploySmartContract ERROR", error);
    throw error;
  }
}

/**
 * Mint ERC721 token given account.
 *
 * @param contractAddress ERC721 contract address
 * @param targetAddress token recipient address
 * @param tokenId token ID to mint
 *
 * @returns Response from mint operation.
 */
async function mintErc721Token(
  contractAddress: string,
  targetAddress: string,
  tokenId: number,
): Promise<unknown> {
  try {
    log.info(
      `Mint ERC721 token ID ${tokenId} for address ${targetAddress} by ${defaultAccountAddress}`,
    );

    const tokenContract = new web3.eth.Contract(
      TestERC721ContractJson.abi,
      contractAddress,
    );

    const mintResponse = await (tokenContract.methods as any)
      .safeMint(targetAddress, tokenId)
      .send({
        from: defaultAccountAddress,
        gas: 8000000,
      });
    log.debug("mintErc721Token mintResponse:", mintResponse);

    return mintResponse;
  } catch (error) {
    log.error("mintErc721Token ERROR", error);
    throw error;
  }
}

/**
 * Deploy ERC721 contract and mint 3 tokens on it (all to constTestAcc)
 * @returns Contract deployment transaction receipt.
 */
async function deployAndMintTokens() {
  const erc721Bytecode = TestERC721ContractJson.data.bytecode.object;
  const erc721ContractCreationReceipt = await deploySmartContract(
    TestERC721ContractJson.abi,
    erc721Bytecode,
  );
  log.info(
    "ERC721 deployed contract address:",
    erc721ContractCreationReceipt.contractAddress,
  );

  await mintErc721Token(
    erc721ContractCreationReceipt.contractAddress,
    constTestAcc.address,
    1,
  );
  await mintErc721Token(
    erc721ContractCreationReceipt.contractAddress,
    constTestAcc.address,
    2,
  );
  await mintErc721Token(
    erc721ContractCreationReceipt.contractAddress,
    constTestAcc.address,
    3,
  );

  return erc721ContractCreationReceipt;
}

//////////////////////////////////
// Main Logic
//////////////////////////////////

async function main() {
  // Start the test ethereum ledger which we'll monitor and run some sample operations.
  const rpcApiWsHost = await setupTestLedger();

  // Create test account
  constTestAcc = await ledger.createEthTestAccount(constTestAccBalance);

  // Create Web3 provider that will be used by other methods.
  web3 = new Web3(rpcApiWsHost);
  const account = web3.eth.accounts.privateKeyToAccount(
    "0x" + WHALE_ACCOUNT_PRIVATE_KEY,
  );
  web3.eth.accounts.wallet.add(constTestAcc);
  web3.eth.accounts.wallet.add(account);
  defaultAccountAddress = account.address;

  // Set up the ApiServer with Ethereum Connector and Ethereum Persistence plugins.
  // It returns the persistence plugin, which we can use to run monitoring operations.
  const persistence = await setupApiServer(9530, rpcApiWsHost);
  console.log("Environment is running...");

  // Deploy an ERC721 contract to our test ledger and mint some tokens,
  // so they can be later scraped by our persistence plugin.
  const erc721ContractCreationReceipt = await deployAndMintTokens();

  // Inform our persistence plugin about the deployed contract.
  // From now on, the persistence plugin will monitor any token operations on this contract.
  await persistence.addTokenERC721(
    erc721ContractCreationReceipt.contractAddress,
  );

  // Start monitoring for ledger state changes.
  // Any updates will be pushed to the database, and all errors will be printed to the console.
  // Press Ctrl + C to stop.
  persistence.startMonitor((err) => {
    console.error("Persistence monitor error:", err);
  });
}

process.once("uncaughtException", async () => {
  await cleanupEnvironment();
  process.exit();
});

process.once("SIGINT", () => {
  console.log("SIGINT received...");
  throw new Error();
});

main();
