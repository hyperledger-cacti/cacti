/*
 * Copyright 2021 Hyperledger Cactus Contributors
 * SPDX-License-Identifier: Apache-2.0
 *
 * copyBLPConfig.ts
 */

import * as shell from "shelljs";

// NOTE: Copy the static assets to the dist folder.
//      Example:
//        shell.cp('-R', 'src/routing-interface/views', 'dist/routing-interface/views/');
shell.cp(
  "../../dist/examples/test-run-transaction/config/BLP_config.js",
  "../../dist/packages/cactus-cmd-socketio-server/src/main/typescript/business-logic-plugin/"
);
