import { cleanupApiServer, setupApiServer } from "./common-setup-methods";

const ETHEREUM_RPC_WS_HOST =
  process.env.ETHEREUM_RPC_WS_HOST ?? "ws://127.0.0.1:8546";

async function main() {
  // Set up the ApiServer with Ethereum Connector and Ethereum Persistence plugins.
  // It returns the persistence plugin, which we can use to run monitoring operations.
  const persistence = await setupApiServer(9781, ETHEREUM_RPC_WS_HOST);
  console.log("Environment is running...");

  // CUSTOM CODE GOES HERE !!!!
  // Inform our persistence plugin about the deployed contract.
  // From now on, the persistence plugin will monitor any token operations on this contract.
  // await persistence.addTokenERC721("0x123");

  // Start monitoring for ledger state changes.
  // Any updates will be pushed to the database, and all errors will be printed to the console.
  // Press Ctrl + C to stop.
  persistence.startMonitor((err) => {
    console.error("Persistence monitor error:", err);
  });
}

process.once("uncaughtException", async () => {
  await cleanupApiServer();
  process.exit();
});

process.once("SIGINT", () => {
  console.log("SIGINT received...");
  throw new Error();
});

main();
