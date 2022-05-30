import { BusinessLogicCartrade } from "./BusinessLogicCartrade";
import { startCactusSocketIOServer } from "@hyperledger/cactus-cmd-socket-server";

startCactusSocketIOServer({
  id: "guks32pf",
  plugin: new BusinessLogicCartrade(),
});
