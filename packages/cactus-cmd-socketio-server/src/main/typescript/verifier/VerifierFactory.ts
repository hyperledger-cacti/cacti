/*
 * Copyright 2021 Hyperledger Cactus Contributors
 * SPDX-License-Identifier: Apache-2.0
 *
 * VerifierFactory.ts
 */

import { Verifier } from "./Verifier";
import { LPInfoHolder } from "../routing-interface/util/LPInfoHolder";
import { ConfigUtil } from "../routing-interface/util/ConfigUtil";

const config: any = ConfigUtil.getConfig();
import { getLogger } from "log4js";
import { VerifierEventListener } from "./LedgerPlugin";
const moduleName = "VerifierFactory";
const logger = getLogger(`${moduleName}`);
logger.level = config.logLevel;

export class VerifierFactory {
  static verifierHash: { [key: string]: Verifier } = {}; // Verifier

  constructor(
    private eventListener: VerifierEventListener,
    private connectInfo = new LPInfoHolder(),
  ) {}

  // Get Verifier
  getVerifier(
    validatorId: string,
    appId = "",
    monitorOptions: {} = {},
    monitorMode = true,
  ): Verifier {
    // Return Verifier
    // If you have already made it, please reply. If you haven't made it yet, make it and reply.
    if (VerifierFactory.verifierHash[validatorId]) {
      return VerifierFactory.verifierHash[validatorId];
    } else {
      const ledgerPluginInfo: string =
        this.connectInfo.getLegerPluginInfo(validatorId);
      // TODO: I want to manage an instance using the validatorId as a key instead of a dedicated member variable
      VerifierFactory.verifierHash[validatorId] = new Verifier(
        ledgerPluginInfo,
      );
      logger.debug("##startMonitor");
      logger.debug(`##getVerifier validatorId :${validatorId}`);
      logger.debug(`##getVerifier appId :${appId}`);
      logger.debug(`##getVerifier monitorOptions :${monitorOptions}`);
      logger.debug(`##getVerifier monitorMode :${monitorMode}`);

      if (monitorMode && appId) {
        VerifierFactory.verifierHash[validatorId].startMonitor(
          appId,
          monitorOptions,
          this.eventListener,
        );
      }
      return VerifierFactory.verifierHash[validatorId];
    }
  }
}
