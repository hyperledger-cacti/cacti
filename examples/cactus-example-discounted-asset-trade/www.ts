import { BusinessLogicAssetTrade } from "./business-logic-asset-trade.js";
import { startCactusSocketIOServer } from "@hyperledger/cactus-cmd-socketio-server";
import { initFabricConnector } from "./fabric-connector.js";
import { initEthereumConnector } from "./ethereum-connector.js";
import { initAriesConnector } from "./aries-connector.js";

async function startBLP() {
  try {
    await initFabricConnector();
    await initEthereumConnector();
    await initAriesConnector();

    startCactusSocketIOServer({
      id: "guks32pf",
      plugin: new BusinessLogicAssetTrade(),
    });
  } catch (error) {
    console.error("Could not start discounted-asset-trade BLP:", error);
  }
}

startBLP();
