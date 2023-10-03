import { BusinessLogicElectricityTrade } from "./BusinessLogicElectricityTrade";
import { startCactusSocketIOServer } from "@hyperledger/cactus-cmd-socketio-server";
import { initEthereumConnector } from "./ethereum-connector";

async function startBLP() {
  try {
    await initEthereumConnector();

    startCactusSocketIOServer({
      id: "h40Q9eMD",
      plugin: new BusinessLogicElectricityTrade("h40Q9eMD"),
    });
  } catch (error) {
    console.error("Could not start electricity-trade BLP:", error);
  }
}

startBLP();
