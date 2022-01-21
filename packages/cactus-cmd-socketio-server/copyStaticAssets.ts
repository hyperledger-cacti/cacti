/*
 * Copyright 2020-2021 Hyperledger Cactus Contributors
 * SPDX-License-Identifier: Apache-2.0
 *
 * copyStaticAssets.ts
 */

import * as shell from "shelljs";

// NOTE: Copy the static assets to the dist folder.
//      Example:
//        shell.cp('-R', 'src/routing-interface/views', 'dist/routing-interface/views/');
shell.cp(
  "-R",
  "./src/main/typescript/verifier/validatorKey/",
  "./dist/src/main/typescript/verifier/",
);

shell.cp("-R", "../../etc/cactus/*.yaml", "/etc/cactus/");

shell.cp("../../yarn.lock", "./dist");
