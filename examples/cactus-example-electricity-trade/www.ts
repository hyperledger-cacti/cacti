import { BusinessLogicElectricityTrade } from "./BusinessLogicElectricityTrade";
import { startCactusSocketIOServer } from "@hyperledger/cactus-common-example-server";
import { initEthereumConnector } from "./ethereum-connector";
import { initSawtoothConnector } from "./sawtooth-connector";

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
