import { BusinessLogicElectricityTrade } from "./BusinessLogicElectricityTrade.js";
import { startCactusSocketIOServer } from "@hyperledger/cactus-cmd-socketio-server";
import { initEthereumConnector } from "./ethereum-connector.js";
import { initSawtoothConnector } from "./sawtooth-connector.js";

async function startBLP() {
  try {
    await initEthereumConnector();
    await initSawtoothConnector();

    startCactusSocketIOServer({
      id: "h40Q9eMD",
      plugin: new BusinessLogicElectricityTrade("h40Q9eMD"),
    });
  } catch (error) {
    console.error("Could not start electricity-trade BLP:", error);
  }
}

startBLP();
