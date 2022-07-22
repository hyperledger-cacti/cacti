import { BusinessLogicAssetTrade } from "./business-logic-asset-trade";
import { startCactusSocketIOServer } from "@hyperledger/cactus-cmd-socketio-server";

startCactusSocketIOServer({
  id: "guks32pf",
  plugin: new BusinessLogicAssetTrade(),
});
