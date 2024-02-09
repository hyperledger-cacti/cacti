import { BusinessLogicElectricityTrade } from "./BusinessLogicTcsElectricityTrade.js";
import { startCactusSocketIOServer } from "@hyperledger/cactus-cmd-socketio-server";

startCactusSocketIOServer({
  id: "h40Q9eMD",
  plugin: new BusinessLogicElectricityTrade("h40Q9eMD"),
});
