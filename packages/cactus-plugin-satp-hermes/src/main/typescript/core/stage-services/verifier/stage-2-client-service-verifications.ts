/**
 * @fileoverview
 * Stage 2 client-side verification helpers for the SATP protocol.
 *
 * @description
 * These functions layer the Stage 2 client-specific validation on top of the
 * stage-agnostic {@link verifyMessage} entry point. The Stage 1
 * `TransferCommenceResponse` is validated here because it is consumed at the
 * start of the Stage 2 client workflow; keeping the check here keeps the Stage
 * 2 client service step implementation thin.
 *
 * @since 3.1.0
 * @see {@link https://www.ietf.org/archive/id/draft-ietf-satp-core-13.txt} SATP Core Specification
 */

import type { JsObjectSigner } from "@hyperledger-cacti/cactus-common";
import { MessageType } from "../../../generated/proto/cacti/satp/v13/common/message_pb";
import type { TransferCommenceResponse } from "../../../generated/proto/cacti/satp/v13/service/stage_1_pb";
import type { SATPSession } from "../../satp-session";
import { SessionType } from "../../session-utils";
import { verifyMessage } from "./data-verifier";

/**
 * Full Stage 2 client verification of an incoming `TransferCommenceResponse`.
 *
 * Although this is a Stage 1 message, it is consumed at the start of the Stage
 * 2 client workflow. Delegates the common checks (session state, common body,
 * signature) to {@link verifyMessage}.
 *
 * @throws {SessionError} When the session is undefined
 */
export function verifyTransferCommenceResponseMessage(
  tag: string,
  signer: JsObjectSigner,
  response: TransferCommenceResponse,
  session: SATPSession | undefined,
): void {
  verifyMessage(
    tag,
    signer,
    response,
    session,
    SessionType.CLIENT,
    MessageType.TRANSFER_COMMENCE_RESPONSE,
    { checkHashPrevMessage: false },
  );
}
