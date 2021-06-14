"use strict";
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, "__esModule", { value: true });
const tape_1 = __importDefault(require("tape"));
/*haha*/
/*import {

} from "../../../../main/typescript/public-api";*/
const odap_gateway_1 = require("../../../../main/typescript/gateway/odap-gateway");
tape_1.default("dummy test for transfer initiation flow", async (t) => {
  /*
    run a gateway(now only call function)
    send initiation flow
    recv initiation ack
    */
  const odapGateWay = new odap_gateway_1.OdapGateway();
  const initializationRequestMessage = {};
  const ackMessage = odapGateWay.InitiateTransfer(initializationRequestMessage);
  t.equals(
    (await ackMessage).SessionID,
    "would filled out this later",
    "sessionID equals",
  );
});
