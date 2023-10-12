import { BusinessLogicAssetTrade } from "./business-logic-asset-trade";
import { startCactusSocketIOServer } from "@hyperledger/cactus-cmd-socketio-server";
import { initFabricConnector } from "./fabric-connector";

async function startBLP() {
  try {
    await initFabricConnector();

    startCactusSocketIOServer({
      id: "guks32pf",
      plugin: new BusinessLogicAssetTrade(),
    });
  } catch (error) {
    console.error("Could not start discounted-asset-trade BLP:", error);
  }
}

startBLP();
