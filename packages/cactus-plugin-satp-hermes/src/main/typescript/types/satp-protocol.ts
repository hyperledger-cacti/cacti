import { JsObjectSigner } from "@hyperledger/cactus-common";
import { SupportedGatewayImplementations } from "../core/types";
import { SessionData } from "../generated/proto/cacti/satp/v02/common/session_pb";
import { v4 as uuidV4 } from "uuid";

export type SATPService = {

}

export type ISATPServerServiceOptions = {
  signer: JsObjectSigner;
}

export type ISATPClientServiceOptions = {
  signer: JsObjectSigner;
}