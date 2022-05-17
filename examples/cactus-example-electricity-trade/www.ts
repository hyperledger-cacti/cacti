import { BusinessLogicElectricityTrade } from "./BusinessLogicElectricityTrade";
import { startCactusSocketIOServer } from "@hyperledger/cactus-cmd-socket-server";

startCactusSocketIOServer({
  id: "h40Q9eMD",
  plugin: new BusinessLogicElectricityTrade("h40Q9eMD"),
});
